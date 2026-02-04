const express = require("express");
const { upvoteIssue, removeVote, getVoteStatus } = require("../controllers/vote.controller");
const { protect } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/:issueId", protect, getVoteStatus);
router.post("/:issueId", protect, upvoteIssue);
router.delete("/:issueId", protect, removeVote);

module.exports = router;
