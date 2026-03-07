const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      required: true,
      index: true,
    },

    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["assigned", "accepted", "in_progress", "completed", "complication_reported"],
      default: "assigned",
      index: true,
    },

    progressImages: {
      type: [String],
      default: [],
    },

    completionReport: {
      type: String,
      default: "",
      trim: true,
    },

    complicationReport: {
      type: String,
      default: "",
      trim: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

taskSchema.index({ issue: 1, worker: 1 }, { unique: true });

module.exports = mongoose.model("Task", taskSchema);