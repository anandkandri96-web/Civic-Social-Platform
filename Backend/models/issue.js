// backend/models/Issue.js

const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120, // ✅ safe UI + DB limit
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["ROADS", "ELECTRICITY", "GARBAGE", "DRAINAGE", "OTHER"],
      required: true,
      index: true,
    },

    severity: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
      index: true,
    },

    /**
     * Images
     * - Base64 strings OR URLs (future Cloudinary)
     */
    images: {
      type: [String],
      default: [], // ✅ prevents undefined issues
    },

    /**
     * GeoJSON Location (REQUIRED for $near)
     */
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
        required: true, // ✅ IMPORTANT for geo queries
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        validate: {
          validator: function (val) {
            return Array.isArray(val) && val.length === 2;
          },
          message: "Location coordinates must be [lng, lat]",
        },
      },
    },
    /**
     * Human-readable location text (optional)
     */
    locationText: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    /**
     * Status (used by updateStatus controller)
     */
    status: {
      type: String,
      enum: ["pending", "assigned", "resolved"],
      default: "pending",
      index: true,
    },

    // priorityScore: { ❌ not used yet
    //   type: Number,
    //   default: 0,
    //   index: true,
    // },

    voteCount: {
      type: Number,
      default: 0,
      index: true,
    },

    // assignedDepartment: { ❌ department logic not implemented
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Department",
    //   index: true,
    // },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    // escalation: { ❌ escalation logic not implemented
    //   isEscalated: {
    //     type: Boolean,
    //     default: false,
    //   },
    //   escalatedAt: {
    //     type: Date,
    //   },
    //   level: {
    //     type: Number,
    //     default: 0,
    //   },
    // },
  },
  { timestamps: true }
);

/**
 * INDEXES (CRITICAL — DO NOT REMOVE)
 */

// ✅ REQUIRED for $near / geo search
issueSchema.index({ location: "2dsphere" });

// ✅ Common filters
issueSchema.index({ category: 1, status: 1 });

// ✅ Search support
issueSchema.index({ title: "text", description: "text" });

module.exports = mongoose.model("Issue", issueSchema);
