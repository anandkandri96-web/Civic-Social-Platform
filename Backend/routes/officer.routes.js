const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform, canPerformResourceAction } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const {
  getDepartmentIssues,
  getDepartmentWorkers,
  reviewIssue,
  assignWorker,
  updateOfficerStatus,
} = require("../controllers/officer.controller");

// ✅ All officer routes require authentication + OFFICER_ACCESS permission
router.use(protect, canPerform(PERMISSIONS.OFFICER_ACCESS));

// ✅ Officer Issue Management
router.get("/issues", canPerform(PERMISSIONS.OFFICER_REVIEW_ISSUES), getDepartmentIssues);

router.patch(
  "/issues/:issueId/review",
  canPerformResourceAction("ISSUE", "REVIEW"),
  reviewIssue
);

router.patch(
  "/issues/:issueId/status",
  canPerformResourceAction("ISSUE", "UPDATE_STATUS"),
  updateOfficerStatus
);

// ✅ Officer Worker Management
router.get("/workers", canPerform(PERMISSIONS.OFFICER_MANAGE_VOLUNTEERS), getDepartmentWorkers);

router.patch(
  "/issues/:issueId/assign-worker",
  canPerformResourceAction("ISSUE", "ASSIGN_WORKER"),
  assignWorker
);

module.exports = router;
