const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform, canPerformResourceAction } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const Issue = require("../models/issue");
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
  canPerformResourceAction("ISSUE", "REVIEW", async (req) => Issue.findById(req.params.issueId)),
  reviewIssue
);

router.patch(
  "/issues/:issueId/status",
  canPerformResourceAction("ISSUE", "UPDATE_STATUS", async (req) => Issue.findById(req.params.issueId)),
  updateOfficerStatus
);

// ✅ Officer Worker Management
router.get("/workers", canPerform(PERMISSIONS.OFFICER_ASSIGN_WORKER), getDepartmentWorkers);

router.patch(
  "/issues/:issueId/assign-worker",
  canPerformResourceAction("ISSUE", "ASSIGN_WORKER", async (req) => Issue.findById(req.params.issueId)),
  assignWorker
);

module.exports = router;
