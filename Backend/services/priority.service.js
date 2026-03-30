const Vote = require("../models/vote");
const { calculatePriorityScore } = require("../utils/priorityCalculator");

async function recomputeIssuePriority(issue) {
  const liveVotes = await Vote.countDocuments({ issue: issue._id });
  issue.voteCount = liveVotes;
  if (Number.isFinite(issue.severity)) {
    issue.severity = Math.min(4, Math.max(1, Number(issue.severity)));
  } else {
    issue.severity = 1;
  }
  issue.priorityScore = calculatePriorityScore({
    severity: issue.severity,
    voteCount: liveVotes,
    createdAt: issue.createdAt,
    escalated: issue.escalated,
  });
  return issue;
}

module.exports = { calculatePriorityScore, recomputeIssuePriority };
