const router = require("express").Router();
const { protect, checkRole, optionalAuth } = require("../middlewares/auth.middleware");
const { uploadIssueImage } = require("../middlewares/upload.middleware");
const {
  createIssue,
  getIssues,
  getNearbyIssues,
  getIssue,
  updateStatus,
  verifyIssueResolution,
  closeIssue,
  reopenIssue,
  deleteIssue,
} = require("../controllers/issue.controller");

router.get("/", optionalAuth, getIssues);
router.get("/nearby", optionalAuth, getNearbyIssues);
router.get("/:id", optionalAuth, getIssue);

router.post("/", protect, uploadIssueImage, createIssue);
router.patch("/:id/status", protect, checkRole(["admin"]), updateStatus);
router.patch("/:id/verify", protect, verifyIssueResolution);
router.patch("/:id/close", protect, checkRole(["admin", "officer"]), closeIssue);
router.patch("/:id/reopen", protect, reopenIssue);
router.delete("/:id", protect, deleteIssue);

module.exports = router;