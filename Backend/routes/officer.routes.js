const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../utils/constants");
const {
  getDepartmentIssues,
  reviewIssue,
  assignWorker,
  updateOfficerStatus,
} = require("../controllers/officer.controller");

router.use(protect, checkRole([ROLES.OFFICER, ROLES.ADMIN]));

router.get("/issues", getDepartmentIssues);
router.patch("/issues/:issueId/review", reviewIssue);
router.patch("/issues/:issueId/assign-worker", assignWorker);
router.patch("/issues/:issueId/status", updateOfficerStatus);

module.exports = router;