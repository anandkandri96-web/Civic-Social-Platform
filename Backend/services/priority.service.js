const Vote = require("../models/vote");

function calculatePriorityScore({ severity, voteCount, createdAt, escalated }) {
  const severityWeight = Number(severity || 1) * 10;
  const supportWeight = Number(voteCount || 0) * 2;

  const ageHours = Math.max(0, (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  const ageWeight = Math.min(ageHours, 168) / 12; // up to +14
  const escalationBonus = escalated ? 15 : 0;

  return Math.round(severityWeight + supportWeight + ageWeight + escalationBonus);
}

async function recomputeIssuePriority(issue) {
  const liveVotes = await Vote.countDocuments({ issue: issue._id });
  issue.voteCount = liveVotes;
  issue.priorityScore = calculatePriorityScore({
    severity: issue.severity,
    voteCount: liveVotes,
    createdAt: issue.createdAt,
    escalated: issue.escalated,
  });
  return issue;
}

module.exports = { calculatePriorityScore, recomputeIssuePriority };