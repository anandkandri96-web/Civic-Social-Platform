const Issue = require("../models/issue");
const { ISSUE_STATUS } = require("../utils/constants");

const ESCALATION_HOURS = Number(process.env.ESCALATION_HOURS || 72);
const ESCALATION_MIN_PRIORITY = Number(process.env.ESCALATION_MIN_PRIORITY || 30);

async function runEscalationSweep() {
  const thresholdDate = new Date(Date.now() - ESCALATION_HOURS * 60 * 60 * 1000);

  const result = await Issue.updateMany(
    {
      escalated: false,
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
    },
    {
      $set: {
        escalated: true,
        escalatedAt: new Date(),
      },
    }
  );

  return result.modifiedCount || 0;
}

module.exports = { runEscalationSweep };