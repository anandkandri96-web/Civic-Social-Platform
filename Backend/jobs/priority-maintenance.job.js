const cron = require("node-cron");
const Issue = require("../models/issue");
const { calculatePriorityScore } = require("../utils/priorityCalculator");
const logger = require("../utils/logger");
const appConfig = require("../config/appConfig");
const ISSUE_STATUS = require("../constants/issueStatus");

/**
 * Cron job to recalculate priority scores for all active issues
 * Runs every 6 hours by default
 */
async function recalculateAllPriorities() {
  try {
    const activeStatuses = [
      ISSUE_STATUS.REPORTED,
      ISSUE_STATUS.UNDER_REVIEW,
      ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
      ISSUE_STATUS.WORK_IN_PROGRESS,
      ISSUE_STATUS.VOLUNTEER_CLAIMED,
      ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS,
    ];

    const issues = await Issue.find({
      status: { $in: activeStatuses },
    }).select("severity voteCount createdAt escalated priorityScore");

    let updated = 0;
    for (const issue of issues) {
      const newScore = calculatePriorityScore({
        severity: issue.severity,
        voteCount: issue.voteCount,
        createdAt: issue.createdAt,
        escalated: issue.escalated,
      });

      if (newScore !== issue.priorityScore) {
        await Issue.findByIdAndUpdate(issue._id, { priorityScore: newScore });
        updated++;
      }
    }

    if (updated > 0) {
      logger.info("[priority-job] recalculated priorities", { updated, total: issues.length });
    }

    return { updated, total: issues.length };
  } catch (error) {
    logger.error("[priority-job] failed", { message: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Auto-close resolved issues that haven't been verified within the deadline
 */
async function autoCloseUnverifiedResolutions() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (appConfig.verificationDeadlineDays || 14));

    const result = await Issue.updateMany(
      {
        status: { $in: [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY] },
        verificationDeadline: { $lte: cutoffDate },
        verifiedByCitizen: false,
      },
      {
        status: ISSUE_STATUS.CLOSED,
        closedAt: new Date(),
        $push: {
          statusHistory: {
            from: "$status",
            to: ISSUE_STATUS.CLOSED,
            changedBy: null, // system
            changedAt: new Date(),
            note: "Auto-closed due to verification timeout",
          },
        },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info("[verification-timeout-job] auto-closed issues", { count: result.modifiedCount });
    }

    return { autoClosed: result.modifiedCount };
  } catch (error) {
    logger.error("[verification-timeout-job] failed", { message: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * Release volunteer claims that have been inactive for too long
 */
async function releaseInactiveVolunteerClaims() {
  try {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - (appConfig.volunteerInactivityHours || 72));

    const result = await Issue.updateMany(
      {
        status: ISSUE_STATUS.VOLUNTEER_CLAIMED,
        volunteerClaimedAt: { $lte: cutoffDate },
      },
      {
        status: ISSUE_STATUS.REPORTED,
        volunteer: null,
        volunteerClaimedAt: null,
        handlingMode: "unassigned",
        $push: {
          statusHistory: {
            from: ISSUE_STATUS.VOLUNTEER_CLAIMED,
            to: ISSUE_STATUS.REPORTED,
            changedBy: null, // system
            changedAt: new Date(),
            note: "Volunteer claim released due to inactivity",
          },
        },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info("[volunteer-inactivity-job] released claims", { count: result.modifiedCount });
    }

    return { released: result.modifiedCount };
  } catch (error) {
    logger.error("[volunteer-inactivity-job] failed", { message: error.message, stack: error.stack });
    throw error;
  }
}

function startPriorityAndMaintenanceJobs() {
  // Recalculate priorities every 6 hours
  const prioritySchedule = appConfig.priorityRecalculationCron || "0 */6 * * *";
  cron.schedule(prioritySchedule, async () => {
    try {
      await recalculateAllPriorities();
    } catch (error) {
      // Error already logged
    }
  });

  // Auto-close unverified resolutions daily at 2 AM
  const verificationSchedule = appConfig.verificationTimeoutCron || "0 2 * * *";
  cron.schedule(verificationSchedule, async () => {
    try {
      await autoCloseUnverifiedResolutions();
    } catch (error) {
      // Error already logged
    }
  });

  // Release inactive volunteer claims every 12 hours
  const volunteerSchedule = appConfig.volunteerInactivityCron || "0 */12 * * *";
  cron.schedule(volunteerSchedule, async () => {
    try {
      await releaseInactiveVolunteerClaims();
    } catch (error) {
      // Error already logged
    }
  });

  logger.info("[priority-maintenance-jobs] started", {
    prioritySchedule,
    verificationSchedule,
    volunteerSchedule,
  });
}

module.exports = {
  startPriorityAndMaintenanceJobs,
  recalculateAllPriorities,
  autoCloseUnverifiedResolutions,
  releaseInactiveVolunteerClaims,
};
