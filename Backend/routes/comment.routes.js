const router = require("express").Router();
const Comment = require("../models/comment");
const { protect } = require("../middlewares/auth.middleware");
const { canPerform, canPerformResourceAction } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const schemas = require("../validators/joi.schemas");
const {
  createComment,
  getIssueComments,
  updateComment,
  deleteComment,
} = require("../controllers/comment.controller");

// ✅ Get comments (public)
router.get("/:issueId", getIssueComments);

// ✅ Create comment (authenticated users with COMMENT_CREATE permission)
router.post(
  "/:issueId",
  protect,
  canPerform(PERMISSIONS.COMMENT_CREATE),
  validateRequest(schemas.commentCreate),
  createComment
);

// ✅ Update own comment (resource-level check: only author)
router.patch(
  "/single/:id",
  protect,
  canPerformResourceAction("COMMENT", "EDIT", async (req) => Comment.findById(req.params.id)),
  validateRequest(schemas.commentUpdate),
  updateComment
);

// ✅ Delete own comment (resource-level check: only author or admin)
router.delete(
  "/single/:id",
  protect,
  canPerformResourceAction("COMMENT", "DELETE", async (req) => Comment.findById(req.params.id)),
  deleteComment
);

module.exports = router;