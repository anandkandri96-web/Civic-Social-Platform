const Issue = require("../models/issue");
const User = require("../models/user");
const { ISSUE_STATUS, ROLES } = require("../utils/constants");
const { createNotificationsBulk } = require("./notification.service");

const ESCALATION_HOURS = Number(process.env.ESCALATION_HOURS || 72);
const ESCALATION_MIN_PRIORITY = Number(process.env.ESCALATION_MIN_PRIORITY || 30);

async function runEscalationSweep() {
  const thresholdDate = new Date(Date.now() - ESCALATION_HOURS * 60 * 60 * 1000);
  const candidates = await Issue.find({
    priorityScore: { $gte: ESCALATION_MIN_PRIORITY },
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
  }).select("_id title escalationLevel escalated");

  if (!candidates.length) return 0;

  const now = new Date();
  let escalatedCount = 0;
  for (const issue of candidates) {
    issue.escalated = true;
    issue.escalatedAt = now;
    issue.escalationLevel = Number(issue.escalationLevel || 0) + 1;
    issue.escalationHistory.push({
      level: issue.escalationLevel,
      at: now,
      note: `Auto escalation after ${ESCALATION_HOURS}h`,
    });
    await issue.save();
    escalatedCount += 1;
  }

  const escalationUsers = await User.find({
    isActive: true,
    isApproved: true,
    role: { $in: [ROLES.ADMIN, ROLES.OFFICER] },
  })
    .select("_id")
    .lean();

  if (escalationUsers.length) {
    const payloads = [];
    for (const issue of candidates) {
      for (const u of escalationUsers) {
        payloads.push({
          userId: u._id,
          title: "Issue escalated",
          message: `${issue.title} escalated to level ${Number(issue.escalationLevel || 0) + 1}`,
          issueId: issue._id,
        });
      }
    }
    await createNotificationsBulk(payloads);
  }

  return escalatedCount;
}

module.exports = { runEscalationSweep };
