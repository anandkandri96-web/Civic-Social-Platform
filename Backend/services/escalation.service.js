const Issue = require("../models/issue");
const User = require("../models/user");
const { ISSUE_STATUS, ROLES } = require("../utils/constants");
const { createNotificationsBulk, notifyIssueEscalated } = require("./notification.service");

const ESCALATION_THRESHOLDS = [
  { hours: 24, level: 1, notifyRoles: [ROLES.OFFICER], priorityBoost: 5 },
  { hours: 72, level: 2, notifyRoles: [ROLES.ADMIN], priorityBoost: 10 },
  { hours: 168, level: 3, notifyRoles: [ROLES.ADMIN], priorityBoost: 15 }, // 7 days
];

async function runEscalationSweep() {
  const now = new Date();
  let totalEscalated = 0;

  for (const threshold of ESCALATION_THRESHOLDS) {
    const thresholdDate = new Date(now.getTime() - threshold.hours * 60 * 60 * 1000);

    const candidates = await Issue.find({
      createdAt: { $lte: thresholdDate },
      status: {
        $in: [
          ISSUE_STATUS.REPORTED,
          ISSUE_STATUS.UNDER_REVIEW,
          ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
          ISSUE_STATUS.WORK_IN_PROGRESS,
          ISSUE_STATUS.VOLUNTEER_CLAIMED,
          ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS,
        ],
      },
      $or: [
        { escalationLevel: { $lt: threshold.level } },
        { escalated: { $ne: true } }
      ],
    }).select("_id title escalationLevel priorityScore");

    if (!candidates.length) continue;

    for (const issue of candidates) {
      const currentLevel = issue.escalationLevel || 0;
      if (currentLevel >= threshold.level) continue;

      issue.escalated = true;
      issue.escalationLevel = threshold.level;
      issue.priorityScore = (issue.priorityScore || 0) + threshold.priorityBoost;
      issue.escalatedAt = now;
      issue.escalationHistory.push({
        level: threshold.level,
        at: now,
        note: `Auto escalation after ${threshold.hours}h`,
      });

      await issue.save();
      totalEscalated += 1;
    }

    // Notify relevant roles
    if (candidates.length > 0) {
      for (const issue of candidates) {
        await notifyIssueEscalated(issue, threshold.level);
      }
    }
  }

  return totalEscalated;
}

module.exports = { runEscalationSweep };
