const ImageAsset = require("../models/imageAsset");

exports.getImageAsset = async (req, res) => {
  try {
    const asset = await ImageAsset.findById(req.params.id).lean();
    if (!asset || !asset.data) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.setHeader("Content-Type", asset.contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).send(asset.data);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load image" });
  }
};