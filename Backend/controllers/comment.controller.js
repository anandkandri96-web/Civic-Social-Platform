const Comment = require("../models/comment");
const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");

exports.createComment = async (req, res) => {
  try {
    const { issueId } = req.params;
    const { message, images = [] } = req.body;

    const issue = await Issue.findById(issueId);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    const safeMessage = String(message || "").trim();
    if (!safeMessage) return apiResponse(res, 400, "Message is required");

    const comment = await Comment.create({
      issue: issueId,
      user: req.user._id,
      message: safeMessage,
      images: Array.isArray(images) ? images.filter(Boolean) : [],
    });

    const data = await comment.populate("user", "name role");
    return apiResponse(res, 201, "Comment created", data);
  } catch (error) {
    console.error("Create comment error:", error);
    return apiResponse(res, 500, "Failed to create comment");
  }
};

exports.getIssueComments = async (req, res) => {
  try {
    const { issueId } = req.params;
    const comments = await Comment.find({ issue: issueId })
      .populate("user", "name role")
      .sort({ createdAt: -1 });

    return apiResponse(res, 200, "Comments retrieved", comments);
  } catch (error) {
    console.error("Get comments error:", error);
    return apiResponse(res, 500, "Failed to fetch comments");
  }
};

exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) return apiResponse(res, 404, "Comment not found");

    if (String(comment.user) !== String(req.user._id)) {
      return apiResponse(res, 403, "You can only edit your own comment");
    }

    const safeMessage = String(message || "").trim();
    if (!safeMessage) return apiResponse(res, 400, "Message is required");

    comment.message = safeMessage;
    await comment.save();

    return apiResponse(res, 200, "Comment updated", comment);
  } catch (error) {
    console.error("Update comment error:", error);
    return apiResponse(res, 500, "Failed to update comment");
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id);
    if (!comment) return apiResponse(res, 404, "Comment not found");

    const isOwner = String(comment.user) === String(req.user._id);
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return apiResponse(res, 403, "You can only delete your own comment");
    }

    await Comment.findByIdAndDelete(id);
    return apiResponse(res, 200, "Comment deleted");
  } catch (error) {
    console.error("Delete comment error:", error);
    return apiResponse(res, 500, "Failed to delete comment");
  }
};