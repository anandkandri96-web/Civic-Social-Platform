const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform } = require("../middlewares/permission.middleware");
const { uploadImages } = require("../middlewares/upload.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const {
  getAvailableIssues,
  claimIssue,
  updateCommunityProgress,
  submitCommunityResolution,
} = require("../controllers/volunteer.controller");

// ✅ All volunteer routes require authentication + VOLUNTEER_ACCESS permission
router.use(protect, canPerform(PERMISSIONS.VOLUNTEER_ACCESS));

// ✅ View available issues (volunteers can browse unclaimed issues)
router.get("/issues/available", getAvailableIssues);

// ✅ Claim an issue (must have VOLUNTEER_CLAIM_ISSUE permission)
router.post(
  "/issues/:issueId/claim",
  canPerform(PERMISSIONS.VOLUNTEER_CLAIM_ISSUE),
  claimIssue
);

// ✅ Update progress on claimed issue
router.patch(
  "/issues/:issueId/progress",
  canPerform(PERMISSIONS.VOLUNTEER_UPDATE_PROGRESS),
  updateCommunityProgress
);

// ✅ Submit resolution (with proof images)
router.patch(
  "/issues/:issueId/resolve",
  canPerform(PERMISSIONS.VOLUNTEER_SUBMIT_RESOLUTION),
  uploadImages("proofImages", 5),
  submitCommunityResolution
);

module.exports = router;
