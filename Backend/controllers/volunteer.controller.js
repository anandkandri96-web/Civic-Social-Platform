const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_STATUS } = require("../utils/constants");
const { canTransition } = require("../utils/statusFlow");

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
    const { proof = [] } = req.body;
    const issue = await Issue.findById(issueId);

    if (!issue) return apiResponse(res, 404, "Issue not found");
    if (String(issue.volunteer) !== String(req.user._id)) {
      return apiResponse(res, 403, "Only claiming volunteer can resolve this issue");
    }

    if (!canTransition(issue.status, ISSUE_STATUS.RESOLVED_BY_COMMUNITY)) {
      return apiResponse(res, 400, `Invalid transition from ${issue.status}`);
    }

    const safeProof = Array.isArray(proof) ? proof.filter(Boolean) : [];
    issue.communityProof = safeProof;
    issue.status = ISSUE_STATUS.RESOLVED_BY_COMMUNITY;
    issue.resolvedAt = new Date();
    await issue.save();

    return apiResponse(res, 200, "Issue marked resolved by community", issue);
  } catch (error) {
    console.error("Volunteer resolution error:", error);
    return apiResponse(res, 500, "Failed to resolve issue");
  }
};