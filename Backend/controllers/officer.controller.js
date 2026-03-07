const Issue = require("../models/issue");
const Task = require("../models/task");
const User = require("../models/user");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_STATUS, ROLES } = require("../utils/constants");
const { canTransition } = require("../utils/statusFlow");

exports.getDepartmentIssues = async (_req, res) => {
  try {
    const issues = await Issue.find({
      status: {
        $in: [
          ISSUE_STATUS.REPORTED,
          ISSUE_STATUS.UNDER_REVIEW,
          ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
          ISSUE_STATUS.WORK_IN_PROGRESS,
          ISSUE_STATUS.RESOLVED,
        ],
      },
    })
      .sort({ priorityScore: -1, createdAt: -1 })
      .populate("assignedDepartment", "name")
      .populate("reportedBy", "name email");

    return apiResponse(res, 200, "Department issues fetched", issues);
  } catch (error) {
    console.error("Get department issues error:", error);
    return apiResponse(res, 500, "Failed to fetch issues");
  }
};

exports.reviewIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.issueId);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    if (!canTransition(issue.status, ISSUE_STATUS.UNDER_REVIEW)) {
      return apiResponse(res, 400, `Cannot move issue from ${issue.status} to under_review`);
    }

    issue.status = ISSUE_STATUS.UNDER_REVIEW;
    await issue.save();

    return apiResponse(res, 200, "Issue moved to under review", issue);
  } catch (error) {
    console.error("Review issue error:", error);
    return apiResponse(res, 500, "Failed to review issue");
  }
};

exports.assignWorker = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { workerId } = req.body;

    const issue = await Issue.findById(issueId);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    const worker = await User.findOne({ _id: workerId, role: ROLES.WORKER, isActive: true });
    if (!worker) return apiResponse(res, 404, "Worker not found");

    if (!canTransition(issue.status, ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT) && issue.status !== ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT) {
      return apiResponse(res, 400, `Cannot assign worker in current status: ${issue.status}`);
    }

    issue.assignedWorker = worker._id;
    issue.status = ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT;
    await issue.save();

    await Task.findOneAndUpdate(
      { issue: issue._id, worker: worker._id },
      {
        $setOnInsert: {
          assignedBy: req.user._id,
        },
      },
      { upsert: true, new: true }
    );

    return apiResponse(res, 200, "Worker assigned", issue);
  } catch (error) {
    console.error("Assign worker error:", error);
    return apiResponse(res, 500, "Failed to assign worker");
  }
};

exports.updateOfficerStatus = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { status } = req.body;
    const next = String(status || "").toLowerCase();

    const issue = await Issue.findById(issueId);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    if (!canTransition(issue.status, next)) {
      return apiResponse(res, 400, `Invalid transition ${issue.status} -> ${next}`);
    }

    issue.status = next;
    if (next === ISSUE_STATUS.RESOLVED) {
      issue.resolvedAt = new Date();
    }
    await issue.save();

    return apiResponse(res, 200, "Issue status updated", issue);
  } catch (error) {
    console.error("Officer status update error:", error);
    return apiResponse(res, 500, "Failed to update status");
  }
};