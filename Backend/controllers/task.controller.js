const mongoose = require("mongoose");
const Task = require("../models/task");
const Issue = require("../models/issue");
const User = require("../models/user");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_STATUS, ROLES } = require("../utils/constants");
const { canTransition } = require("../utils/statusFlow");
const { createNotification, notifyWorkerAssigned, notifyCitizenVerificationRequest } = require("../services/notification.service");
const { normalizeMulterFiles, persistUploadedFiles } = require("../services/imageAsset.service");

const TASK_STATUS = Object.freeze({
  ASSIGNED: "assigned",
  ACCEPTED: "accepted",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  COMPLICATION_REPORTED: "complication_reported",
});

const ISSUE_TASK_FIELDS = "title category status locationText description severity images location assignedDepartment";

const PROGRESSABLE_STATUSES = new Set([
  TASK_STATUS.ASSIGNED,
  TASK_STATUS.ACCEPTED,
  TASK_STATUS.IN_PROGRESS,
  TASK_STATUS.COMPLICATION_REPORTED,
]);

const isAllowedTaskTransition = (from, to) => {
  if (from === to) return true;
  switch (from) {
    case TASK_STATUS.ASSIGNED:
      return [TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLICATION_REPORTED].includes(to);
    case TASK_STATUS.ACCEPTED:
      return [TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED, TASK_STATUS.COMPLICATION_REPORTED].includes(to);
    case TASK_STATUS.IN_PROGRESS:
      return [TASK_STATUS.COMPLETED, TASK_STATUS.COMPLICATION_REPORTED].includes(to);
    case TASK_STATUS.COMPLICATION_REPORTED:
      return [TASK_STATUS.IN_PROGRESS].includes(to);
    case TASK_STATUS.COMPLETED:
      return false;
    default:
      return false;
  }
};

exports.createTask = async (req, res) => {
  try {
    const { issueId, workerId } = req.body || {};

    if (!issueId || !workerId) {
      return apiResponse(res, 400, "issueId and workerId are required");
    }
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return apiResponse(res, 400, "issueId must be a valid id");
    }
    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return apiResponse(res, 400, "workerId must be a valid id");
    }

    const issue = await Issue.findById(issueId);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    const worker = await User.findOne({ _id: workerId, role: ROLES.WORKER, isActive: true });
    if (!worker) return apiResponse(res, 404, "Worker not found");

    // Officers can only assign within their own department.
    if (req.user.role === ROLES.OFFICER) {
      if (!req.user.department) return apiResponse(res, 400, "Officer must be assigned to a department");
      if (String(issue.assignedDepartment) !== String(req.user.department)) {
        return apiResponse(res, 403, "Officer can assign only own department issues");
      }
      if (worker.department && String(worker.department) !== String(req.user.department)) {
        return apiResponse(res, 400, "Worker belongs to a different department");
      }
    }

    // Ensure issue is in a valid state for assignment.
    if (
      issue.status !== ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT &&
      !canTransition(issue.status, ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT)
    ) {
      return apiResponse(res, 400, `Cannot assign worker in current status: ${issue.status}`);
    }

    const existingForIssue = await Task.findOne({ issue: issue._id }).select("_id worker status");
    if (existingForIssue && String(existingForIssue.worker) !== String(worker._id)) {
      return apiResponse(res, 400, "Task already exists for this issue");
    }

    const task = await Task.findOneAndUpdate(
      { issue: issue._id, worker: worker._id },
      {
        $setOnInsert: { assignedBy: req.user._id },
        $set: { status: TASK_STATUS.ASSIGNED },
      },
      { upsert: true, new: true }
    ).populate("issue", ISSUE_TASK_FIELDS);

    issue.assignedWorker = worker._id;
    issue.status = ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT;
    await issue.save();

    await notifyWorkerAssigned(issue, worker);
    await createNotification({
      userId: issue.reportedBy,
      title: "Issue assigned for government action",
      message: "Your issue has been assigned to a field worker.",
      issueId: issue._id,
    });

    return apiResponse(res, 201, "Task created", task);
  } catch (error) {
    console.error("Create task error:", error);
    return apiResponse(res, 500, "Failed to create task");
  }
};

exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ worker: req.user._id })
      .populate("issue", ISSUE_TASK_FIELDS)
      .sort({ createdAt: -1 });
    return apiResponse(res, 200, "Tasks fetched", tasks);
  } catch (error) {
    console.error("Get my tasks error:", error);
    return apiResponse(res, 500, "Failed to fetch tasks");
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const nextStatus = String(req.body?.status || "").trim();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse(res, 400, "Invalid task id");
    }
    if (!nextStatus) return apiResponse(res, 400, "status is required");
    if (!Object.values(TASK_STATUS).includes(nextStatus)) {
      return apiResponse(res, 400, "Invalid task status");
    }

    const task = await Task.findOne({ _id: id, worker: req.user._id }).populate("issue");
    if (!task) return apiResponse(res, 404, "Task not found");

    if (!isAllowedTaskTransition(String(task.status || ""), nextStatus)) {
      return apiResponse(res, 400, `Invalid task transition ${task.status} -> ${nextStatus}`);
    }

    task.status = nextStatus;

    if (nextStatus === TASK_STATUS.ACCEPTED) {
      if (!canTransition(task.issue.status, ISSUE_STATUS.WORK_IN_PROGRESS)) {
        return apiResponse(res, 400, `Cannot move issue from ${task.issue.status} to ${ISSUE_STATUS.WORK_IN_PROGRESS}`);
      }
      await Issue.findByIdAndUpdate(task.issue._id, { status: ISSUE_STATUS.WORK_IN_PROGRESS });
      await createNotification({
        userId: task.issue.reportedBy,
        title: "Work started on your issue",
        message: `A field worker accepted and started work on: ${task.issue.title}`,
        issueId: task.issue._id,
      });
    }

    if (nextStatus === TASK_STATUS.IN_PROGRESS) {
      if (!canTransition(task.issue.status, ISSUE_STATUS.WORK_IN_PROGRESS)) {
        return apiResponse(res, 400, `Cannot move issue from ${task.issue.status} to ${ISSUE_STATUS.WORK_IN_PROGRESS}`);
      }
      await Issue.findByIdAndUpdate(task.issue._id, { status: ISSUE_STATUS.WORK_IN_PROGRESS });
    }

    if (nextStatus === TASK_STATUS.COMPLETED) {
      if (!Array.isArray(task.progressImages) || task.progressImages.length === 0) {
        return apiResponse(res, 400, "Upload at least one progress image before completing the task");
      }
      if (!canTransition(task.issue.status, ISSUE_STATUS.RESOLVED)) {
        return apiResponse(res, 400, `Cannot move issue from ${task.issue.status} to ${ISSUE_STATUS.RESOLVED}`);
      }
      task.completedAt = new Date();
      await Issue.findByIdAndUpdate(task.issue._id, {
        status: ISSUE_STATUS.RESOLVED,
        resolvedAt: new Date(),
      });
      await notifyCitizenVerificationRequest({ _id: task.issue._id, reportedBy: task.issue.reportedBy });
    }

    if (nextStatus === TASK_STATUS.COMPLICATION_REPORTED) {
      if (!canTransition(task.issue.status, ISSUE_STATUS.UNDER_REVIEW)) {
        return apiResponse(res, 400, `Cannot move issue from ${task.issue.status} to ${ISSUE_STATUS.UNDER_REVIEW}`);
      }
      await Issue.findByIdAndUpdate(task.issue._id, { status: ISSUE_STATUS.UNDER_REVIEW });
    }

    await task.save();
    const populated = await Task.findById(task._id).populate("issue", ISSUE_TASK_FIELDS);
    return apiResponse(res, 200, "Task status updated", populated);
  } catch (error) {
    console.error("Update task status error:", error);
    return apiResponse(res, 500, "Failed to update task status");
  }
};

exports.addTaskProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { completionReport, complicationReport } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiResponse(res, 400, "Invalid task id");
    }
    const task = await Task.findOne({ _id: id, worker: req.user._id }).populate(
      "issue",
      `${ISSUE_TASK_FIELDS} reportedBy`
    );
    if (!task) return apiResponse(res, 404, "Task not found");
    if (!PROGRESSABLE_STATUSES.has(task.status)) {
      return apiResponse(res, 400, "Task is not in a progressable state");
    }

    const uploadedFiles = normalizeMulterFiles(req, ["progressImages"]);
    if (uploadedFiles.length > 0) {
      const urls = await persistUploadedFiles(req, uploadedFiles, req.user._id);
      task.progressImages = [...(task.progressImages || []), ...urls];
    }

    if (typeof completionReport === "string") {
      task.completionReport = completionReport.trim();
    }

    if (typeof complicationReport === "string") {
      task.complicationReport = complicationReport.trim();
    }

    // If worker uploads progress, treat as in-progress unless already completed.
    if (task.status === TASK_STATUS.ACCEPTED || task.status === TASK_STATUS.ASSIGNED) {
      task.status = TASK_STATUS.IN_PROGRESS;
      await Issue.findByIdAndUpdate(task.issue._id, { status: ISSUE_STATUS.WORK_IN_PROGRESS });
    }

    await task.save();
    return apiResponse(res, 200, "Task progress updated", task);
  } catch (error) {
    console.error("Add task progress error:", error);
    return apiResponse(res, 500, "Failed to update task progress");
  }
};
