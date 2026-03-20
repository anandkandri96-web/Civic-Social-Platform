const router = require("express").Router();
const Issue = require("../models/issue");
const { protect, optionalAuth } = require("../middlewares/auth.middleware");
const { canPerform, canPerformResourceAction, canPerformAny } = require("../middlewares/permission.middleware");
const { validatePagination, validateSort } = require("../middlewares/validation.middleware");
const { uploadIssueImage } = require("../middlewares/upload.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const {
  createIssue,
  updateIssue,
  getIssues,
  getNearbyIssues,
  getIssue,
  updateStatus,
  verifyIssueResolution,
  rejectIssue,
  closeIssue,
  reopenIssue,
  deleteIssue,
} = require("../controllers/issue.controller");

// ✅ Public endpoints (optional auth for personalization)
router.get("/", optionalAuth, validatePagination(), validateSort(["priority", "-priority", "newest", "-newest", "voteCount", "-voteCount"]), getIssues);
router.get("/nearby", optionalAuth, validateLatitudeLongitude, getNearbyIssues);
router.get("/:id", optionalAuth, getIssue);

// ✅ Issue creation (Citizens can create, Volunteers can claim)
router.post(
  "/",
  protect,
  canPerform(PERMISSIONS.ISSUE_CREATE),
  uploadIssueImage,
  createIssue
);

// ✅ Update own issue (with resource-level check: only creator/assigned worker)
router.patch(
  "/:id",
  protect,
  canPerformResourceAction("ISSUE", "UPDATE", async (req) => Issue.findById(req.params.id)),
  uploadIssueImage,
  updateIssue
);

// ✅ Status updates (Admin or Officer with department check)
router.patch(
  "/:id/status",
  protect,
  canPerformAny([PERMISSIONS.ADMIN_UPDATE_ISSUE_STATUS, PERMISSIONS.OFFICER_UPDATE_ISSUE_STATUS]),
  canPerformResourceAction("ISSUE", "UPDATE_STATUS", async (req) => Issue.findById(req.params.id)),
  updateStatus
);

// ✅ Verify resolution (assigned volunteer/worker only)
router.patch(
  "/:id/verify",
  protect,
  canPerformResourceAction("ISSUE", "VERIFY_RESOLUTION", async (req) => Issue.findById(req.params.id)),
  verifyIssueResolution
);

// ✅ Reject issue (Officer/Admin)
router.patch(
  "/:id/reject",
  protect,
  canPerformResourceAction("ISSUE", "REVIEW", async (req) => Issue.findById(req.params.id)),
  rejectIssue
);

// ✅ Close issue (Admin or Officer with department check)
router.patch(
  "/:id/close",
  protect,
  canPerformAny([PERMISSIONS.ADMIN_CLOSE_ISSUE, PERMISSIONS.OFFICER_CLOSE_ISSUE]),
  canPerformResourceAction("ISSUE", "CLOSE", async (req) => Issue.findById(req.params.id)),
  closeIssue
);

// ✅ Reopen issue (creator or Admin only)
router.patch(
  "/:id/reopen",
  protect,
  canPerformResourceAction("ISSUE", "REOPEN", async (req) => Issue.findById(req.params.id)),
  reopenIssue
);

// ✅ Delete issue (creator, Admin, or Officer with resource check)
router.delete(
  "/:id",
  protect,
  canPerformResourceAction("ISSUE", "DELETE", async (req) => Issue.findById(req.params.id)),
  deleteIssue
);

module.exports = router;
