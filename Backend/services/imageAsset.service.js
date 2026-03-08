const ImageAsset = require("../models/imageAsset");

function buildPublicImageUrl(req, imageId) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.get("host")}/api/images/${imageId}`;
}

function normalizeMulterFiles(req, fieldNames = ["image", "images"]) {
  if (!req) return [];

  if (Array.isArray(req.files)) {
    return req.files.filter((f) => f && f.buffer && f.mimetype);
  }

  const list = [];
  if (req.file && req.file.buffer && req.file.mimetype) {
    list.push(req.file);
  }

  if (req.files && typeof req.files === "object") {
    fieldNames.forEach((field) => {
      const entries = req.files[field];
      if (Array.isArray(entries)) {
        entries.forEach((f) => {
          if (f && f.buffer && f.mimetype) list.push(f);
        });
      }
    });
  }

  return list;
}

async function persistUploadedFiles(req, files, uploadedBy = null) {
  const urls = [];
  for (const file of files) {
    const asset = await ImageAsset.create({
      contentType: file.mimetype,
      originalName: String(file.originalname || "").slice(0, 255),
      size: Number(file.size || file.buffer?.length || 0),
      data: file.buffer,
      uploadedBy,
    });
    urls.push(buildPublicImageUrl(req, asset._id));
  }
  return urls;
}

module.exports = {
  buildPublicImageUrl,
  normalizeMulterFiles,
  persistUploadedFiles,
};