const Comment = require("../models/comment");
const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");
const { normalizeImageArray } = require("../utils/imageNormalize");

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
      images: normalizeImageArray(Array.isArray(images) ? images : []),
    });

    const data = await comment.populate("user", "name role");
    return apiResponse(res, 201, "Comment created", data);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Create comment error:", error);
    return apiResponse(res, 500, "Failed to create comment");
  }
};

exports.getIssueComments = async (req, res) => {
  try {
    const { issueId } = req.params;
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (pageNum - 1) * limitNum;

    const filter = { issue: issueId };
    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate("user", "name role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Comment.countDocuments(filter),
    ]);

    return apiResponse(res, 200, "Comments retrieved", comments, {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Get comments error:", error);
    return apiResponse(res, 500, "Failed to fetch comments");
  }
};

exports.updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, images } = req.body;

    const comment = await Comment.findById(id);
    if (!comment) return apiResponse(res, 404, "Comment not found");

    if (String(comment.user) !== String(req.user._id)) {
      return apiResponse(res, 403, "You can only edit your own comment");
    }

    if (message !== undefined) {
      const safeMessage = String(message || "").trim();
      if (!safeMessage) return apiResponse(res, 400, "Message cannot be empty");
      comment.message = safeMessage;
    }

    if (images !== undefined) {
      comment.images = normalizeImageArray(Array.isArray(images) ? images : []);
    }

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