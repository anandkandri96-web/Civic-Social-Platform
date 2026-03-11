const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_STATUS } = require("../utils/constants");
const { canTransition } = require("../utils/statusFlow");
const { createNotification, notifyVolunteerClaimed, notifyIssueResolved, notifyCitizenVerificationRequest } = require("../services/notification.service");
const { normalizeMulterFiles, persistUploadedFiles } = require("../services/imageAsset.service");

function normalizeProofInput(rawProof) {
  if (Array.isArray(rawProof)) return rawProof.filter(Boolean).map((p) => String(p).trim()).filter(Boolean);
  if (typeof rawProof !== "string") return [];

  const trimmed = rawProof.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean).map((p) => String(p).trim()).filter(Boolean);
      }
    } catch (_) {}
  }

  return trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

exports.getAvailableIssues = async (_req, res) => {
  try {
    const issues = await Issue.find({
      status: { $in: [ISSUE_STATUS.REPORTED, ISSUE_STATUS.UNDER_REVIEW] },
      volunteer: { $exists: false },
    })
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(100)
      .populate("reportedBy", "name");

    return apiResponse(res, 200, "Available issues fetched", issues);
  } catch (error) {
    console.error("Volunteer available issues error:", error);
    return apiResponse(res, 500, "Failed to fetch available issues");
  }
};

exports.claimIssue = async (req, res) => {
  try {
    const { issueId } = req.params;
    const issue = await Issue.findById(issueId);

    if (!issue) return apiResponse(res, 404, "Issue not found");
    if (issue.volunteer && String(issue.volunteer) !== String(req.user._id)) {
      return apiResponse(res, 400, "Issue already claimed by another volunteer");
    }

    if (![ISSUE_STATUS.REPORTED, ISSUE_STATUS.UNDER_REVIEW].includes(issue.status)) {
      return apiResponse(res, 400, "Issue is not available for volunteer claim");
    }

    if (!canTransition(issue.status, ISSUE_STATUS.VOLUNTEER_CLAIMED)) {
      return apiResponse(res, 400, `Invalid transition from ${issue.status}`);
    }

    issue.volunteer = req.user._id;
    issue.status = ISSUE_STATUS.VOLUNTEER_CLAIMED;
    await issue.save();

    await notifyVolunteerClaimed(issue, req.user);

    return apiResponse(res, 200, "Issue claimed successfully", issue);
  } catch (error) {
    console.error("Volunteer claim error:", error);
    return apiResponse(res, 500, "Failed to claim issue");
  }
};

exports.updateCommunityProgress = async (req, res) => {
  try {
    const { issueId } = req.params;
    const issue = await Issue.findById(issueId);

    if (!issue) return apiResponse(res, 404, "Issue not found");
    if (String(issue.volunteer) !== String(req.user._id)) {
      return apiResponse(res, 403, "Only claiming volunteer can update this issue");
    }

    if (issue.status === ISSUE_STATUS.VOLUNTEER_CLAIMED) {
      issue.status = ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS;
      await issue.save();
    } else if (issue.status !== ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS) {
      return apiResponse(res, 400, "Issue is not in volunteer progress flow");
    }

    return apiResponse(res, 200, "Community progress updated", issue);
  } catch (error) {
    console.error("Volunteer progress error:", error);
    return apiResponse(res, 500, "Failed to update progress");
  }
};

exports.submitCommunityResolution = async (req, res) => {
  try {
    const { issueId } = req.params;
    const reportText = String(req.body?.reportText || "").trim();
    const proofFromBody = normalizeProofInput(req.body?.proof);
    const uploadedFiles = normalizeMulterFiles(req, ["proofImages"]);
    const proofFromFiles = uploadedFiles.length
      ? await persistUploadedFiles(req, uploadedFiles, req.user?._id || null)
      : [];
    const issue = await Issue.findById(issueId);

    if (!issue) return apiResponse(res, 404, "Issue not found");
    if (String(issue.volunteer) !== String(req.user._id)) {
      return apiResponse(res, 403, "Only claiming volunteer can resolve this issue");
    }

    if (!canTransition(issue.status, ISSUE_STATUS.RESOLVED_BY_COMMUNITY)) {
      return apiResponse(res, 400, `Invalid transition from ${issue.status}`);
    }

    if (!reportText) {
      return apiResponse(res, 400, "Community resolution report is required");
    }
    if (reportText.length < 10) {
      return apiResponse(res, 400, "Community resolution report must be at least 10 characters");
    }

    const safeProof = [...new Set([...proofFromFiles, ...proofFromBody])];
    if (!safeProof.length) {
      return apiResponse(res, 400, "At least one proof item is required");
    }
    issue.communityProof = safeProof;
    issue.communityResolutionReport = {
      text: reportText,
      submittedBy: req.user._id,
      submittedAt: new Date(),
    };
    issue.status = ISSUE_STATUS.RESOLVED_BY_COMMUNITY;
    issue.resolvedAt = new Date();
    await issue.save();

    await notifyIssueResolved(issue, "volunteer");
    await notifyCitizenVerificationRequest(issue);

    return apiResponse(res, 200, "Issue marked resolved by community", issue);
  } catch (error) {
    console.error("Volunteer resolution error:", error);
    return apiResponse(res, 500, "Failed to resolve issue");
  }
};
