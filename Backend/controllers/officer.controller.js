const Issue = require("../models/issue");
const Task = require("../models/task");
const User = require("../models/user");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_STATUS, ROLES } = require("../utils/constants");
const { canTransition } = require("../utils/statusFlow");
const { createNotification } = require("../services/notification.service");

const hasOfficerScope = (user) => user.role === ROLES.OFFICER && user.department;

exports.getDepartmentIssues = async (req, res) => {
  try {
    const filter = {
      status: {
        $in: [
          ISSUE_STATUS.REPORTED,
          ISSUE_STATUS.UNDER_REVIEW,
          ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
          ISSUE_STATUS.WORK_IN_PROGRESS,
          ISSUE_STATUS.RESOLVED,
        ],
      },
    };
    if (req.user.role === ROLES.OFFICER) {
      if (!hasOfficerScope(req.user)) {
        return apiResponse(res, 400, "Officer must be assigned to a department");
      }
      filter.assignedDepartment = req.user.department;
    } else if (req.query.departmentId) {
      filter.assignedDepartment = req.query.departmentId;
    }

    const issues = await Issue.find(filter)
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
    if (req.user.role === ROLES.OFFICER && !hasOfficerScope(req.user)) {
      return apiResponse(res, 400, "Officer must be assigned to a department");
    }
    if (req.user.role === ROLES.OFFICER && String(issue.assignedDepartment) !== String(req.user.department)) {
      return apiResponse(res, 403, "Officer can review only own department issues");
    }

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
    if (!workerId) return apiResponse(res, 400, "workerId is required");
    if (req.user.role === ROLES.OFFICER) {
      if (!hasOfficerScope(req.user)) return apiResponse(res, 400, "Officer must be assigned to a department");
      if (String(issue.assignedDepartment) !== String(req.user.department)) {
        return apiResponse(res, 403, "Officer can assign only own department issues");
      }
    }

    const worker = await User.findOne({ _id: workerId, role: ROLES.WORKER, isActive: true });
    if (!worker) return apiResponse(res, 404, "Worker not found");
    if (req.user.role === ROLES.OFFICER && worker.department && String(worker.department) !== String(req.user.department)) {
      return apiResponse(res, 400, "Worker belongs to a different department");
    }

    if (!canTransition(issue.status, ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT) && issue.status !== ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT) {
      return apiResponse(res, 400, `Cannot assign worker in current status: ${issue.status}`);
    }

    if (issue.assignedWorker && String(issue.assignedWorker) !== String(worker._id)) {
      return apiResponse(res, 400, "Issue already assigned to another worker");
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
        $set: {
          status: "assigned",
        },
      },
      { upsert: true, new: true }
    );

    await createNotification({
      userId: worker._id,
      title: "New task assigned",
      message: `You have been assigned to issue: ${issue.title}`,
      issueId: issue._id,
    });

    await createNotification({
      userId: issue.reportedBy,
      title: "Issue assigned for government action",
      message: "Your issue has been assigned to a field worker.",
      issueId: issue._id,
    });

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
    if (req.user.role === ROLES.OFFICER && !hasOfficerScope(req.user)) {
      return apiResponse(res, 400, "Officer must be assigned to a department");
    }
    if (req.user.role === ROLES.OFFICER && String(issue.assignedDepartment) !== String(req.user.department)) {
      return apiResponse(res, 403, "Officer can update only own department issues");
    }

    if (!canTransition(issue.status, next)) {
      return apiResponse(res, 400, `Invalid transition ${issue.status} -> ${next}`);
    }

    issue.status = next;
    if (next === ISSUE_STATUS.RESOLVED) {
      issue.resolvedAt = new Date();
      await createNotification({
        userId: issue.reportedBy,
        title: "Issue marked resolved",
        message: "A department officer marked your issue as resolved. Please verify.",
        issueId: issue._id,
      });
    }
    await issue.save();

    return apiResponse(res, 200, "Issue status updated", issue);
  } catch (error) {
    console.error("Officer status update error:", error);
    return apiResponse(res, 500, "Failed to update status");
  }
};
