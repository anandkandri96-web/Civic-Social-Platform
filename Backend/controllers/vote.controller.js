const Vote = require("../models/vote");
const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");
const { ROLES } = require("../utils/constants");
const { recomputeIssuePriority } = require("../services/priority.service");

exports.upvoteIssue = async (req, res) => {
  const { issueId } = req.params;
  try {
    if ([ROLES.ADMIN, ROLES.OFFICER].includes(req.user.role)) {
      return apiResponse(res, 403, "Admins and officers cannot vote on issues");
    }
    if ([ROLES.ADMIN, ROLES.OFFICER].includes(req.user.role)) {
      return apiResponse(res, 403, "Admins and officers cannot vote on issues");
    }

    const issue = await Issue.findById(issueId);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    try {
      await Vote.create({ user: req.user._id, issue: issueId });
    } catch (err) {
      if (err.code === 11000) {
        return apiResponse(res, 400, "You have already voted on this issue");
      }
      throw err;
    }

    await recomputeIssuePriority(issue);
    await issue.save();

    return apiResponse(res, 200, "Vote recorded", {
      issueId: issue._id,
      voteCount: issue.voteCount,
      priorityScore: issue.priorityScore,
      voted: true,
    });
  } catch (error) {
    console.error("Upvote Error:", error);
    return apiResponse(res, 500, "Failed to upvote");
  }
};

exports.removeVote = async (req, res) => {
  const { issueId } = req.params;
  try {
    const issue = await Issue.findById(issueId);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    const deleted = await Vote.findOneAndDelete({ user: req.user._id, issue: issueId });
    if (!deleted) {
      return apiResponse(res, 400, "You have not voted on this issue");
    }

    await recomputeIssuePriority(issue);
    await issue.save();

    return apiResponse(res, 200, "Vote removed", {
      issueId: issue._id,
      voteCount: issue.voteCount,
      priorityScore: issue.priorityScore,
      voted: false,
    });
  } catch (error) {
    console.error("Remove vote Error:", error);
    return apiResponse(res, 500, "Failed to remove vote");
  }
};

exports.getVoteStatus = async (req, res) => {
  const { issueId } = req.params;
  try {
    const vote = await Vote.findOne({ user: req.user._id, issue: issueId });
    return apiResponse(res, 200, "Vote status", { voted: !!vote });
  } catch (error) {
    console.error("Vote status Error:", error);
    return apiResponse(res, 500, "Failed to get vote status");
  }
};
