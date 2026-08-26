const mongoose = require("mongoose");
const Task = require("../models/task");
const Issue = require("../models/issue");
const User = require("../models/user");
const Resolution = require("../models/resolution");
const { RESOLUTION_TYPES } = require("../models/resolution");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_STATUS, ROLES } = require("../utils/constants");
const { assertIssueStatusChange, HANDLING_MODE } = require("../config/issueStatusMachine");
const { createNotification, notifyWorkerAssigned, notifyCitizenVerificationRequest, notifyOfficerTaskCompleted } = require("../services/notification.service");
const { normalizeMulterFiles, persistUploadedFiles } = require("../services/imageAsset.service");
const { normalizeImageArray } = require("../utils/imageNormalize");
const appConfig = require("../config/appConfig");
const { recomputeIssuePriority } = require("../services/priority.service");
const { logAudit } = require("../services/audit.service");

function auditCtx(req) {
  return {
    ip: req.ip || req.headers["x-forwarded-for"] || "",
    userAgent: String(req.headers["user-agent"] || "").slice(0, 512),
    requestPath: req.originalUrl || "",
    requestMethod: req.method || "",
  };
}

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
    if (![ROLES.OFFICER, ROLES.ADMIN].includes(req.user?.role)) {
      return apiResponse(res, 403, "Only officers or admins can assign tasks");
    }

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

    if (String(issue.reportedBy) === String(worker._id)) {
      return apiResponse(res, 400, "A worker cannot be assigned to an issue they reported.");
    }

    if (issue.handlingMode === HANDLING_MODE.VOLUNTEER) {
      return apiResponse(
        res,
        409,
        "This issue is locked to the volunteer workflow. Release the volunteer claim before assigning a worker."
      );
    }

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

    const ac = assertIssueStatusChange({
      issue,
      nextStatus: ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
      user: req.user,
      context: {},
    });
    if (!ac.ok) {
      return apiResponse(res, ac.statusCode, ac.message);
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
    issue.handlingMode = HANDLING_MODE.OFFICER_WORKER;
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
    const logger = require("../utils/logger");
    logger.error("Create task error:", error);
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
    const logger = require("../utils/logger");
    logger.error("Get my tasks error:", error);
    return apiResponse(res, 500, "Failed to fetch tasks");
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const nextStatus = String(req.body?.status || "").trim();
    const { completionReport, complicationReport, progressImages } = req.body || {};

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

    if (typeof completionReport === "string") {
      task.completionReport = completionReport.trim();
    }
    if (typeof complicationReport === "string") {
      task.complicationReport = complicationReport.trim();
    }
    if (Array.isArray(progressImages) && progressImages.length) {
      task.progressImages = normalizeImageArray([...(task.progressImages || []), ...progressImages]);
    }

    task.status = nextStatus;

    if (nextStatus === TASK_STATUS.ACCEPTED) {
      const iss = await Issue.findById(task.issue._id);
      const chk = assertIssueStatusChange({
        issue: iss,
        nextStatus: ISSUE_STATUS.WORK_IN_PROGRESS,
        user: req.user,
        context: {},
      });
      if (!chk.ok) {
        return apiResponse(res, chk.statusCode, chk.message);
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
      const iss = await Issue.findById(task.issue._id);
      const chk = assertIssueStatusChange({
        issue: iss,
        nextStatus: ISSUE_STATUS.WORK_IN_PROGRESS,
        user: req.user,
        context: {},
      });
      if (!chk.ok) {
        return apiResponse(res, chk.statusCode, chk.message);
      }
      await Issue.findByIdAndUpdate(task.issue._id, { status: ISSUE_STATUS.WORK_IN_PROGRESS });
    }

    if (nextStatus === TASK_STATUS.COMPLETED) {
      const imgs = normalizeImageArray(task.progressImages || []);
      if (!imgs.length) {
        return apiResponse(res, 400, "Upload at least one progress image before completing the task");
      }
      const iss = await Issue.findById(task.issue._id);
      const resolution = await Resolution.create({
        issue: iss._id,
        task: task._id,
        type: RESOLUTION_TYPES.WORKER,
        resolvedBy: req.user._id,
        report: String(task.completionReport || "").trim(),
        proofImages: imgs,
      });

      // Issue moves to AWAITING_OFFICER_VERIFICATION until the officer verifies the resolution
      await Issue.findByIdAndUpdate(task.issue._id, {
        acceptedResolution: resolution._id,
        status: ISSUE_STATUS.AWAITING_OFFICER_VERIFICATION,
      });
      await notifyOfficerTaskCompleted(task.issue, req.user);

      logAudit({
        issue: task.issue._id,
        user: req.user._id,
        action: "task.complete",
        resourceType: "resolution",
        resourceId: resolution._id,
        detail: "Worker completed task, awaiting officer verification",
        ...auditCtx(req),
      });
    }

    if (nextStatus === TASK_STATUS.COMPLICATION_REPORTED) {
      const iss = await Issue.findById(task.issue._id);
      const chk = assertIssueStatusChange({
        issue: iss,
        nextStatus: ISSUE_STATUS.UNDER_REVIEW,
        user: req.user,
        context: {},
      });
      if (!chk.ok) {
        return apiResponse(res, chk.statusCode, chk.message);
      }
      await Issue.findByIdAndUpdate(task.issue._id, { status: ISSUE_STATUS.UNDER_REVIEW });
    }

    await task.save();
    const populated = await Task.findById(task._id).populate("issue", ISSUE_TASK_FIELDS);
    return apiResponse(res, 200, "Task status updated", populated);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Update task status error:", error);
    return apiResponse(res, 500, "Failed to update task status");
  }
};

exports.addTaskProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, completionReport, complicationReport, progressImages } = req.body || {};

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
      const items = await persistUploadedFiles(req, uploadedFiles, req.user._id);
      task.progressImages = normalizeImageArray([...(task.progressImages || []), ...items]);
    }

    if (Array.isArray(progressImages) && progressImages.length) {
      task.progressImages = normalizeImageArray([...(task.progressImages || []), ...progressImages]);
    }

    if (typeof notes === "string" && notes.trim().length >= 5) {
      task.completionReport = notes.trim();
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
    const logger = require("../utils/logger");
    logger.error("Add task progress error:", error);
    return apiResponse(res, 500, "Failed to update task progress");
  }
};
