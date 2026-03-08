const Task = require("../models/task");
const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_STATUS, ROLES } = require("../utils/constants");
const { createNotification, notifyWorkerAssigned, notifyIssueResolved, notifyCitizenVerificationRequest } = require("../services/notification.service");
const { normalizeMulterFiles, persistUploadedFiles } = require("../services/imageAsset.service");

const TASK_STATUS = {
  ASSIGNED: "assigned",
  ACCEPTED: "accepted",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
};

exports.assignTask = async (req, res) => {
  try {
    const { issueId, workerId } = req.body;

    if (!issueId || !workerId) {
      return apiResponse(res, 400, "Issue ID and Worker ID are required");
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return apiResponse(res, 404, "Issue not found");
    }

    if (issue.status !== ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT) {
      return apiResponse(res, 400, "Issue must be assigned to department before task assignment");
    }

    const worker = await require("../models/user").findById(workerId);
    if (!worker || worker.role !== ROLES.WORKER) {
      return apiResponse(res, 400, "Invalid worker");
    }

    // Check if task already exists
    const existingTask = await Task.findOne({ issue: issueId });
    if (existingTask) {
      return apiResponse(res, 400, "Task already exists for this issue");
    }

    const task = await Task.create({
      issue: issueId,
      worker: workerId,
      assignedBy: req.user._id,
      status: TASK_STATUS.ASSIGNED,
    });

    issue.assignedWorker = workerId;
    issue.status = ISSUE_STATUS.WORK_IN_PROGRESS;
    await issue.save();

    await notifyWorkerAssigned(issue, worker);

    return apiResponse(res, 201, "Task assigned successfully", task);
  } catch (error) {
    console.error("Assign task error:", error);
    return apiResponse(res, 500, "Failed to assign task");
  }
};

exports.getWorkerTasks = async (req, res) => {
  try {
    const { workerId } = req.params;

    if (req.user.role !== ROLES.ADMIN && req.user.role !== ROLES.OFFICER && String(req.user._id) !== workerId) {
      return apiResponse(res, 403, "Access denied");
    }

    const tasks = await Task.find({ worker: workerId })
      .populate("issue", "title description category location status")
      .sort({ createdAt: -1 });

    return apiResponse(res, 200, "Worker tasks retrieved", tasks);
  } catch (error) {
    console.error("Get worker tasks error:", error);
    return apiResponse(res, 500, "Failed to fetch tasks");
  }
};

exports.updateTaskProgress = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const task = await Task.findById(taskId).populate("issue");
    if (!task) {
      return apiResponse(res, 404, "Task not found");
    }

    if (String(task.worker) !== String(req.user._id)) {
      return apiResponse(res, 403, "Only assigned worker can update this task");
    }

    const validStatuses = [TASK_STATUS.ACCEPTED, TASK_STATUS.IN_PROGRESS];
    if (status && !validStatuses.includes(status)) {
      return apiResponse(res, 400, "Invalid status for progress update");
    }

    if (status) {
      task.status = status;
    }

    const uploadedFiles = normalizeMulterFiles(req, ["progressImages"]);
    if (uploadedFiles.length > 0) {
      const uploadedUrls = await persistUploadedFiles(req, uploadedFiles, req.user._id);
      task.progressImages = [...(task.progressImages || []), ...uploadedUrls];
    }

    await task.save();

    return apiResponse(res, 200, "Task progress updated", task);
  } catch (error) {
    console.error("Update task progress error:", error);
    return apiResponse(res, 500, "Failed to update task progress");
  }
};

exports.completeTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { completionReport } = req.body;

    const task = await Task.findById(taskId).populate("issue");
    if (!task) {
      return apiResponse(res, 404, "Task not found");
    }

    if (String(task.worker) !== String(req.user._id)) {
      return apiResponse(res, 403, "Only assigned worker can complete this task");
    }

    task.status = TASK_STATUS.COMPLETED;
    task.completedAt = new Date();
    if (completionReport) {
      task.completionReport = completionReport;
    }

    const uploadedFiles = normalizeMulterFiles(req, ["completionImages"]);
    if (uploadedFiles.length > 0) {
      const uploadedUrls = await persistUploadedFiles(req, uploadedFiles, req.user._id);
      task.progressImages = [...(task.progressImages || []), ...uploadedUrls];
    }

    await task.save();

    // Update issue status
    const issue = task.issue;
    issue.status = ISSUE_STATUS.RESOLVED;
    issue.resolvedAt = new Date();
    await issue.save();

    await notifyIssueResolved(issue, "worker");
    await notifyCitizenVerificationRequest(issue);

    return apiResponse(res, 200, "Task completed successfully", task);
  } catch (error) {
    console.error("Complete task error:", error);
    return apiResponse(res, 500, "Failed to complete task");
  }
};