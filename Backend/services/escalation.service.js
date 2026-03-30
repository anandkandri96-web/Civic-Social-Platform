const Issue = require("../models/issue");
const User = require("../models/user");
const { ISSUE_STATUS, ROLES } = require("../utils/constants");
const { HANDLING_MODE } = require("../config/issueStatusMachine");
const { createNotificationsBulk, notifyIssueEscalated } = require("./notification.service");
const { recomputeIssuePriority } = require("./priority.service");
const appConfig = require("../config/appConfig");
const logger = require("../utils/logger");

const ESCALATION_THRESHOLDS = [
  { hours: 24, level: 1, notifyRoles: [ROLES.OFFICER], priorityBoost: 5 },
  { hours: 72, level: 2, notifyRoles: [ROLES.ADMIN], priorityBoost: 10 },
  { hours: 168, level: 3, notifyRoles: [ROLES.ADMIN], priorityBoost: 15 },
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
      $or: [{ escalationLevel: { $lt: threshold.level } }, { escalated: { $ne: true } }],
    }).select("_id title escalationLevel priorityScore");

    if (!candidates.length) continue;

    for (const issue of candidates) {
      const currentLevel = issue.escalationLevel || 0;
      if (currentLevel >= threshold.level) continue;

      issue.escalated = true;
      issue.escalationLevel = threshold.level;
      issue.priorityScore = (issue.priorityScore || 0) + threshold.priorityBoost;
      issue.escalatedAt = now;
      issue.escalationHistory = Array.isArray(issue.escalationHistory) ? issue.escalationHistory : [];
      issue.escalationHistory.push({
        level: threshold.level,
        at: now,
        note: `Auto escalation after ${threshold.hours}h`,
      });

      await recomputeIssuePriority(issue);
      await issue.save();
      totalEscalated += 1;
    }

    if (candidates.length > 0) {
      for (const issue of candidates) {
        await notifyIssueEscalated(issue, threshold.level);
      }
    }
  }

  return totalEscalated;
}

/** Release stale volunteer claims and notify reporter + volunteer */
async function runVolunteerClaimExpiry() {
  const hours = appConfig.volunteerClaimTtlHours;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const issues = await Issue.find({
    status: ISSUE_STATUS.VOLUNTEER_CLAIMED,
    handlingMode: HANDLING_MODE.VOLUNTEER,
    volunteerClaimedAt: { $lte: cutoff },
  })
    .select("_id title volunteer reportedBy volunteerClaimedAt")
    .limit(200);

  let n = 0;
  for (const issue of issues) {
    const volunteerId = issue.volunteer;
    const reporterId = issue.reportedBy;

    issue.volunteer = null;
    issue.handlingMode = HANDLING_MODE.UNASSIGNED;
    issue.volunteerClaimedAt = null;
    issue.status = ISSUE_STATUS.REPORTED;
    await issue.save();
    n += 1;

    const notifications = [];
    if (volunteerId) {
      notifications.push({
        userId: volunteerId,
        title: "Volunteer claim released",
        message: `Your claim on "${issue.title}" expired after ${hours} hours and the issue is open again.`,
        issueId: issue._id,
      });
    }
    if (reporterId) {
      notifications.push({
        userId: reporterId,
        title: "Issue available again",
        message: `A volunteer claim on your report "${issue.title}" expired; the issue is back in the queue.`,
        issueId: issue._id,
      });
    }
    if (notifications.length) {
      await createNotificationsBulk(notifications);
    }
  }

  return n;
}

/** Auto-close resolved issues past verification deadline */
async function runVerificationTimeoutSweep() {
  const now = new Date();
  const issues = await Issue.find({
    status: { $in: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY] },
    verifiedByCitizen: false,
    verificationDeadline: { $lte: now },
  })
    .select("_id title reportedBy verificationDeadline")
    .limit(200);

  let n = 0;
  for (const issue of issues) {
    issue.status = ISSUE_STATUS.CLOSED;
    issue.closedAt = now;
    await issue.save();
    n += 1;

    if (issue.reportedBy) {
      await createNotificationsBulk([
        {
          userId: issue.reportedBy,
          title: "Issue closed automatically",
          message:
            "The verification window ended without confirmation, so this issue was closed. Contact support if you still need help.",
          issueId: issue._id,
        },
      ]);
    }
  }

  return n;
}

async function recomputeOpenIssuePriorities() {
  const openStatuses = [
    ISSUE_STATUS.REPORTED,
    ISSUE_STATUS.UNDER_REVIEW,
    ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
    ISSUE_STATUS.WORK_IN_PROGRESS,
    ISSUE_STATUS.VOLUNTEER_CLAIMED,
    ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS,
    ISSUE_STATUS.RESOLVED,
    ISSUE_STATUS.RESOLVED_BY_COMMUNITY,
  ];

  const cursor = Issue.find({ status: { $in: openStatuses } }).cursor();
  let count = 0;
  for await (const issue of cursor) {
    try {
      await recomputeIssuePriority(issue);
      await issue.save();
      count += 1;
    } catch (e) {
      logger.warn("Priority recompute failed", { id: issue._id, message: e.message });
    }
  }
  return count;
}

async function runAllEscalationTasks() {
  const [escalated, released, autoClosed, prioCount] = await Promise.all([
    runEscalationSweep(),
    runVolunteerClaimExpiry(),
    runVerificationTimeoutSweep(),
    recomputeOpenIssuePriorities(),
  ]);
  return { escalated, released, autoClosed, priorityRecalculated: prioCount };
}

module.exports = {
  runEscalationSweep,
  runVolunteerClaimExpiry,
  runVerificationTimeoutSweep,
  recomputeOpenIssuePriorities,
  runAllEscalationTasks,
};
