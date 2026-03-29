const mongoose = require("mongoose");
const { ROLES } = require("../config/roles");

const ROLE_UPGRADE_STATUSES = Object.freeze(["pending", "approved", "rejected", "cancelled"]);

const roleUpgradeRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    currentRole: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      lowercase: true,
      trim: true,
    },
    requestedRole: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
      lowercase: true,
      trim: true,
    },
    preferredDepartment: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    motivation: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 1200,
    },
    experience: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    availability: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    skills: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    supportingLinks: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ROLE_UPGRADE_STATUSES,
      default: "pending",
      index: true,
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RoleUpgradeRequest", roleUpgradeRequestSchema);
module.exports.ROLE_UPGRADE_STATUSES = ROLE_UPGRADE_STATUSES;
