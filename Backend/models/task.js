const mongoose = require("mongoose");
const { TASK_STATUSES } = require("../constants/taskStatus");

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
      enum: [...TASK_STATUSES],
      default: "assigned",
      index: true,
    },

    progressImages: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    completionReport: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    complicationReport: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
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