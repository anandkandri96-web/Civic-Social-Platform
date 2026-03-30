const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      index: true,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      maxlength: 128,
      index: true,
    },
    resourceType: {
      type: String,
      trim: true,
      maxlength: 64,
      default: "issue",
      index: true,
    },
    resourceId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      index: true,
    },
    detail: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2048,
    },
    targetStatus: {
      type: String,
      trim: true,
    },
    fromStatus: {
      type: String,
      trim: true,
    },
    ip: {
      type: String,
      trim: true,
      maxlength: 64,
      default: "",
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 512,
      default: "",
    },
    requestPath: {
      type: String,
      trim: true,
      maxlength: 512,
      default: "",
    },
    requestMethod: {
      type: String,
      trim: true,
      maxlength: 16,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
