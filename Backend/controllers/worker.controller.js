const Task = require("../models/task");
const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_STATUS } = require("../utils/constants");

exports.getMyTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ worker: req.user._id })
      .populate("issue", "title category status locationText")
      .sort({ createdAt: -1 });

    return apiResponse(res, 200, "Tasks fetched", tasks);
  } catch (error) {
    console.error("Get tasks error:", error);
    return apiResponse(res, 500, "Failed to fetch tasks");
  }
};

exports.acceptTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, worker: req.user._id });
    if (!task) return apiResponse(res, 404, "Task not found");

    task.status = "accepted";
    await task.save();

    await Issue.findByIdAndUpdate(task.issue, { status: ISSUE_STATUS.WORK_IN_PROGRESS });

    return apiResponse(res, 200, "Task accepted", task);
  } catch (error) {
    console.error("Accept task error:", error);
    return apiResponse(res, 500, "Failed to accept task");
  }
};

exports.updateTaskProgress = async (req, res) => {
  try {
    const { progressImages = [], completionReport, complicationReport, status } = req.body;

    const task = await Task.findOne({ _id: req.params.taskId, worker: req.user._id });
    if (!task) return apiResponse(res, 404, "Task not found");

    if (Array.isArray(progressImages)) {
      task.progressImages = progressImages.filter(Boolean);
    }

    if (typeof completionReport === "string") {
      task.completionReport = completionReport.trim();
    }

    if (typeof complicationReport === "string") {
      task.complicationReport = complicationReport.trim();
    }

    if (["in_progress", "completed", "complication_reported"].includes(String(status))) {
      task.status = String(status);
    }

    if (task.status === "in_progress") {
      await Issue.findByIdAndUpdate(task.issue, { status: ISSUE_STATUS.WORK_IN_PROGRESS });
    }

    if (task.status === "completed") {
      task.completedAt = new Date();
      await Issue.findByIdAndUpdate(task.issue, { status: ISSUE_STATUS.RESOLVED, resolvedAt: new Date() });
    }

    await task.save();

    return apiResponse(res, 200, "Task updated", task);
  } catch (error) {
    console.error("Update task error:", error);
    return apiResponse(res, 500, "Failed to update task");
  }
};