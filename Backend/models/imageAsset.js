const mongoose = require("mongoose");

const imageAssetSchema = new mongoose.Schema(
  {
    contentType: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 255,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    /** Legacy stored binary — new uploads should not rely on this for serving */
    data: {
      type: Buffer,
      default: undefined,
    },
    /** Public URL (CDN or local static) — audit / bookkeeping */
    url: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2048,
    },
    cloudinaryPublicId: {
      type: String,
      trim: true,
      default: "",
      maxlength: 512,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ImageAsset", imageAssetSchema);
