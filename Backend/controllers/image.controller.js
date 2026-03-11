const ImageAsset = require("../models/imageAsset");

const stripDataUrlPrefix = (value) => {
  const s = String(value || "").trim();
  const idx = s.indexOf("base64,");
  if (s.startsWith("data:") && idx >= 0) return s.slice(idx + "base64,".length).trim();
  return s;
};

const looksLikeBase64 = (s) => {
  if (!s) return false;
  const v = s.trim();
  // Allow common data-url or JSON-stringified content.
  const cleaned = stripDataUrlPrefix(v).replace(/^\"|\"$/g, "").trim();
  if (cleaned.length < 24) return false;
  if (cleaned.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/=\r\n]+$/.test(cleaned);
};

const isKnownImageMagic = (buf) => {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // WEBP: "RIFF....WEBP"
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true;
  return false;
};

const coerceImageBuffer = (data) => {
  if (!data) return null;
  if (Buffer.isBuffer(data)) {
    // Some legacy records stored base64 text inside a Buffer.
    const asText = data.toString("utf8").trim();
    if (looksLikeBase64(asText)) {
      const cleaned = stripDataUrlPrefix(asText).replace(/^\"|\"$/g, "").trim();
      try {
        const decoded = Buffer.from(cleaned, "base64");
        if (isKnownImageMagic(decoded)) return decoded;
      } catch (_) {}
    }
    return data;
  }

  const asText = String(data).trim();
  if (looksLikeBase64(asText)) {
    const cleaned = stripDataUrlPrefix(asText).replace(/^\"|\"$/g, "").trim();
    try {
      const decoded = Buffer.from(cleaned, "base64");
      if (isKnownImageMagic(decoded)) return decoded;
    } catch (_) {}
  }

  return null;
};

exports.getImageAsset = async (req, res) => {
  try {
    // Do not use `.lean()` here. We want Mongoose to cast `data` into a real Buffer.
    const asset = await ImageAsset.findById(req.params.id).select("contentType data").exec();
    if (!asset || !asset.data) {
      return res.status(404).json({ message: "Image not found" });
    }

    const buf = coerceImageBuffer(asset.data);
    if (!buf) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Express may append charset for string bodies; we always send a Buffer here.
    res.setHeader("Content-Type", asset.contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(buf);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load image" });
  }
};
