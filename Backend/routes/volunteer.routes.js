const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../utils/constants");
const {
  getAvailableIssues,
  claimIssue,
  updateCommunityProgress,
  submitCommunityResolution,
} = require("../controllers/volunteer.controller");

router.use(protect, checkRole([ROLES.VOLUNTEER]));

router.get("/issues/available", getAvailableIssues);
router.post("/issues/:issueId/claim", claimIssue);
router.patch("/issues/:issueId/progress", updateCommunityProgress);
router.patch("/issues/:issueId/resolve", submitCommunityResolution);

module.exports = router;