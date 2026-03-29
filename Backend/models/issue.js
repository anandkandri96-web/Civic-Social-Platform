const mongoose = require("mongoose");
const { ISSUE_CATEGORIES, ISSUE_STATUS } = require("../utils/constants");

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    category: {
      type: String,
      enum: ISSUE_CATEGORIES,
      required: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    severity: {
      type: Number,
      min: 1,
      max: 4,
      required: true,
      index: true,
    },

    images: {
      type: [String],
      default: [],
    },

    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: {
          validator: function (val) {
            return Array.isArray(val) && val.length === 2;
          },
          message: "Location coordinates must be [lng, lat]",
        },
      },
    },

    locationText: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    status: {
      type: String,
      enum: [
        ISSUE_STATUS.REPORTED,
        ISSUE_STATUS.UNDER_REVIEW,
        ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
        ISSUE_STATUS.WORK_IN_PROGRESS,
        ISSUE_STATUS.RESOLVED,
        ISSUE_STATUS.CITIZEN_VERIFIED,
        ISSUE_STATUS.CLOSED,
        ISSUE_STATUS.VOLUNTEER_CLAIMED,
        ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS,
        ISSUE_STATUS.RESOLVED_BY_COMMUNITY,
        ISSUE_STATUS.REJECTED,
        "assigned", // legacy
      ],
      default: ISSUE_STATUS.REPORTED,
      index: true,
    },

    priorityScore: {
      type: Number,
      default: 0,
      index: true,
    },

    voteCount: {
      type: Number,
      default: 0,
      index: true,
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },

    assignedWorker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    volunteer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    communityProof: {
      type: [String],
      default: [],
    },

    communityResolutionReport: {
      text: {
        type: String,
        default: "",
        trim: true,
        maxlength: 2000,
      },
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      submittedAt: {
        type: Date,
        default: null,
      },
    },

    verifiedByCitizen: {
      type: Boolean,
      default: false,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    closedAt: {
      type: Date,
      default: null,
    },

    escalated: {
      type: Boolean,
      default: false,
      index: true,
    },
    escalationLevel: {
      type: Number,
      default: 0,
      index: true,
    },

    escalatedAt: {
      type: Date,
      default: null,
    },
    escalationHistory: {
      type: [
        {
          level: { type: Number, required: true },
          at: { type: Date, required: true },
          note: { type: String, default: "" },
        },
      ],
      default: [],
    },

    statusHistory: {
      type: [
        {
          from: { type: String, trim: true, required: true },
          to: { type: String, trim: true, required: true },
          changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
          changedAt: { type: Date, required: true, default: Date.now },
          note: { type: String, default: "" },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

issueSchema.index({ location: "2dsphere" });
issueSchema.index({ category: 1, status: 1 });
issueSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Issue", issueSchema);
