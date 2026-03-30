const mongoose = require("mongoose");

/** Standard image reference: CDN URL + optional Cloudinary public_id */
const imageItemSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true, maxlength: 2048 },
    cloudinaryId: { type: String, default: "", trim: true, maxlength: 512 },
  },
  { _id: false }
);

module.exports = { imageItemSchema };
