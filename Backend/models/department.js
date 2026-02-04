// // backend/models/Department.js

// const mongoose = require("mongoose");

// const departmentSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: true,
//       unique: true,
//       trim: true,
//     },

//     contact: {
//       email: {
//         type: String,
//         lowercase: true,
//         trim: true,
//       },
//       phone: {
//         type: String,
//         trim: true,
//       },
//     },

//     /**
//      * Categories handled by this department
//      * Must match Issue.category exactly
//      */
//     categories: [
//       {
//         type: String,
//         enum: ["ROADS", "ELECTRICITY", "GARBAGE", "DRAINAGE", "OTHER"],
//         required: true,
//         index: true,
//       },
//     ],

//     /**
//      * Geo coverage area for routing
//      */
//     coverageArea: {
//       type: {
//         type: String,
//         enum: ["Polygon"],
//         required: true,
//       },
//       coordinates: {
//         type: [[[Number]]], // GeoJSON Polygon
//         required: true,
//       },
//     },

//     /**
//      * SLA in hours
//      */
//     slaHours: {
//       type: Number,
//       default: 72,
//     },

//     isActive: {
//       type: Boolean,
//       default: true,
//       index: true,
//     },
//   },
//   { timestamps: true }
// );

// /**
//  * Indexes
//  */
// departmentSchema.index({ coverageArea: "2dsphere" });

// module.exports = mongoose.model("Department", departmentSchema);
