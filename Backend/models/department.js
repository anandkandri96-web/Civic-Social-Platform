const mongoose = require("mongoose");

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
    },
    categories: {
      type: [String],
      default: [],
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
