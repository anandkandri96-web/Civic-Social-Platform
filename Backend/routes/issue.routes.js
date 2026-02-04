// const express = require("express");

// const {
//   getIssues,
//   createIssue,
//   getIssue,
//   updateStatus,
//   deleteIssue,
// } = require("../controllers/issue.controller");

// const { protect, checkRole } = require("../middlewares/auth.middleware");
// // const rateLimit = require("../middlewares/rateLimit.middleware"); // ❌ not implemented

// const router = express.Router();

// /**
//  * Public routes
//  * Anyone can view issues
//  */
// router.get("/", getIssues);
// router.get("/:id", getIssue);

// /**
//  * Protected routes (Citizen)
//  * Logged-in users can create issues
//  */
// router.post("/", protect, createIssue);

// /**
//  * Admin routes
//  * Update issue status
//  */
// router.patch(
//   "/:id/status",
//   protect,
//   checkRole(["admin"]), // ✅ matches User.role enum
//   updateStatus
// );

// /**
//  * Admin only
//  * Delete an issue
//  */
// router.delete(
//   "/:id",
//   protect,
//   checkRole(["admin"]),
//   deleteIssue
// );

// module.exports = router;

const router = require("express").Router();
const { protect, checkRole, optionalAuth } = require("../middlewares/auth.middleware");
const { uploadIssueImage } = require("../middlewares/upload.middleware");
const {
  createIssue,
  getIssues,
  getIssue,
  updateStatus,
  deleteIssue,
} = require("../controllers/issue.controller");

router.get("/", optionalAuth, getIssues);
router.get("/:id", optionalAuth, getIssue);
router.post("/", protect, uploadIssueImage, createIssue);
router.patch("/:id/status", protect, checkRole(["admin"]), updateStatus);
router.delete("/:id", protect, deleteIssue);

module.exports = router;
