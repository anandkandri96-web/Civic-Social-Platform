const mongoose = require("mongoose");
const { ROLES } = require("../config/roles");
const { REQUESTABLE_UPGRADE_ROLES } = require("../constants/roleUpgrade");

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
      enum: [...REQUESTABLE_UPGRADE_ROLES, ROLES.WORKER],
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
      maxlength: 1000,
    },
    experience: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
      validate: {
        validator(v) {
          if (!v || String(v).trim() === "") return true;
          const t = String(v).trim();
          return t.length >= 10 && t.length <= 500;
        },
        message: "experience must be 10–500 characters when provided",
      },
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
      validate: {
        validator(arr) {
          return !Array.isArray(arr) || arr.length <= 3;
        },
        message: "At most 3 supporting links allowed",
      },
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
      maxlength: 500,
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
