const mongoose = require("mongoose");
const { imageItemSchema } = require("./schemas/imageItem.schema");

const RESOLUTION_TYPES = Object.freeze({
  VOLUNTEER: "volunteer",
  WORKER: "worker",
});

const resolutionSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(RESOLUTION_TYPES),
      required: true,
      index: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    report: {
      type: String,
      trim: true,
      default: "",
      maxlength: 4000,
    },
    proofImages: {
      type: [imageItemSchema],
      default: [],
    },
  },
  { timestamps: true }
);

resolutionSchema.index({ issue: 1, type: 1 });

module.exports = mongoose.model("Resolution", resolutionSchema);
module.exports.RESOLUTION_TYPES = RESOLUTION_TYPES;
