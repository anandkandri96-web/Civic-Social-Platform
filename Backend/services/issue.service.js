// // backend/services/priority.service.js

// const Issue = require("../models/Issue");
// const { calculatePriority } = require("../utils/priorityCalculator");

// /**
//  * Recalculate and update priority for a single issue
//  */
// exports.updatePriority = async (issueId) => {
//   try {
//     const issue = await Issue.findById(issueId);
//     if (!issue) return null;

//     issue.priority = calculatePriority(
//       issue.severity,
//       issue.votes,
//       issue.createdAt,
//       issue.escalated
//     );

//     await issue.save();
//     return issue;
//   } catch (error) {
//     console.error("Priority Update Error:", error);
//     return null;
//   }
// };

// /**
//  * Recalculate priorities for all unresolved issues
//  * (Used by cron jobs or analytics refresh)
//  */
// exports.recalculateAllPriorities = async () => {
//   try {
//     const issues = await Issue.find({
//       status: { $ne: "resolved" },
//     });

//     for (const issue of issues) {
//       issue.priority = calculatePriority(
//         issue.severity,
//         issue.votes,
//         issue.createdAt,
//         issue.escalated
//       );
//       await issue.save();
//     }

//     return true;
//   } catch (error) {
//     console.error("Bulk Priority Recalculation Error:", error);
//     return false;
//   }
// };
