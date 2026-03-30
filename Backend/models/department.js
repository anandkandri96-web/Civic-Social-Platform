const mongoose = require("mongoose");
const { ISSUE_CATEGORIES } = require("../utils/constants");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    categories: {
      type: [String],
      default: [],
      validate: {
        validator(arr) {
          if (!Array.isArray(arr) || !arr.length) return true;
          return arr.every((c) => ISSUE_CATEGORIES.includes(String(c).toLowerCase()));
        },
        message: "Each category must be a valid issue category",
      },
    },
    officers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    serviceArea: {
      type: String,
      trim: true,
      default: "",
    },
    coverageArea: {
      type: {
        type: String,
        enum: ["Polygon"],
      },
      coordinates: {
        type: [[[Number]]],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

departmentSchema.index({ name: 1 }, { unique: true });
departmentSchema.index({ coverageArea: "2dsphere" });

module.exports = mongoose.model("Department", departmentSchema);
