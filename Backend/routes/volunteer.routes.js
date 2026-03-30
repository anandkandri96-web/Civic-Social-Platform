const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform } = require("../middlewares/permission.middleware");
const { uploadImages } = require("../middlewares/upload.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const { ROLES } = require("../utils/constants");
const { apiResponse } = require("../utils/apiResponse");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const schemas = require("../validators/joi.schemas");
const { requireVolunteerResolutionProof } = require("../middlewares/bodyOrUploadGuards.middleware");
const {
  getAvailableIssues,
  claimIssue,
  unclaimIssue,
  updateCommunityProgress,
  submitCommunityResolution,
} = require("../controllers/volunteer.controller");

const ensureVolunteer = (req, res, next) => {
  if (req.user?.role !== ROLES.VOLUNTEER) {
    return apiResponse(res, 403, "Only volunteers can access volunteer actions");
  }
  return next();
};

// ✅ All volunteer routes require authentication + VOLUNTEER_ACCESS permission
router.use(protect, ensureVolunteer, canPerform(PERMISSIONS.VOLUNTEER_ACCESS));

// ✅ View available issues (volunteers can browse unclaimed issues)
router.get("/issues/available", getAvailableIssues);

// ✅ Claim an issue (must have VOLUNTEER_CLAIM_ISSUE permission)
router.post(
  "/issues/:issueId/claim",
  canPerform(PERMISSIONS.VOLUNTEER_CLAIM_ISSUE),
  claimIssue
);

router.post(
  "/issues/:issueId/unclaim",
  canPerform(PERMISSIONS.VOLUNTEER_CLAIM_ISSUE),
  unclaimIssue
);

// ✅ Update progress on claimed issue
router.patch(
  "/issues/:issueId/progress",
  canPerform(PERMISSIONS.VOLUNTEER_UPDATE_PROGRESS),
  validateRequest(schemas.volunteerUpdateProgress),
  updateCommunityProgress
);

// ✅ Submit resolution (with proof images)
router.patch(
  "/issues/:issueId/resolve",
  canPerform(PERMISSIONS.VOLUNTEER_SUBMIT_RESOLUTION),
  uploadImages("proofImages", 5),
  validateRequest(schemas.volunteerSubmitResolution),
  requireVolunteerResolutionProof,
  submitCommunityResolution
);

module.exports = router;
