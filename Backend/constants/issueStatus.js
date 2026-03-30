
const ISSUE_STATUS = Object.freeze({
  REPORTED: "reported",
  UNDER_REVIEW: "under_review",
  ASSIGNED_TO_DEPARTMENT: "assigned_to_department",
  WORK_IN_PROGRESS: "work_in_progress",
  AWAITING_OFFICER_VERIFICATION: "awaiting_officer_verification",
  RESOLVED: "resolved",
  CITIZEN_VERIFIED: "citizen_verified",
  CLOSED: "closed",
  VOLUNTEER_CLAIMED: "volunteer_claimed",
  COMMUNITY_FIX_IN_PROGRESS: "community_fix_in_progress",
  RESOLVED_BY_COMMUNITY: "resolved_by_community",
  REJECTED: "rejected",
});

module.exports = ISSUE_STATUS;

