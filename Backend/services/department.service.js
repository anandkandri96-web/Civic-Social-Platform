// // backend/services/department.service.js

// const Department = require("../models/Department");

// /**
//  * Assign department based on category and location
//  * (Location reserved for future zoning logic)
//  */
// exports.assignDepartment = async (category, location = null) => {
//   try {
//     // Primary match: category
//     let department = await Department.findOne({
//       categories: category,
//     });

//     // Fallback to "other" category department
//     if (!department) {
//       department = await Department.findOne({
//         categories: "other",
//       });
//     }

//     return department || null;
//   } catch (error) {
//     console.error("Department Assignment Error:", error);
//     return null;
//   }
// };
