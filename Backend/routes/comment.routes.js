const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const {
  createComment,
  getIssueComments,
  updateComment,
  deleteComment,
} = require("../controllers/comment.controller");

router.get("/:issueId", getIssueComments);
router.post("/:issueId", protect, createComment);
router.patch("/single/:id", protect, updateComment);
router.delete("/single/:id", protect, deleteComment);

module.exports = router;