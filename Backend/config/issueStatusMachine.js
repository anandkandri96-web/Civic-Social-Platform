/**
 * Single source of truth: issue lifecycle statuses, valid transitions, and
 * which roles may trigger each transition (admin may do any transition that is structurally valid).
 */
const ISSUE_STATUS = require("../constants/issueStatus");
const { ROLES } = require("./roles");

const ALL_STATUSES = Object.freeze(Object.values(ISSUE_STATUS));

const STATUS_TRANSITIONS = Object.freeze({
  [ISSUE_STATUS.REPORTED]: [
    ISSUE_STATUS.UNDER_REVIEW,
    ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
    ISSUE_STATUS.VOLUNTEER_CLAIMED,
    ISSUE_STATUS.REJECTED,
  ],
  [ISSUE_STATUS.UNDER_REVIEW]: [
    ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT,
    ISSUE_STATUS.VOLUNTEER_CLAIMED,
    ISSUE_STATUS.REJECTED,
  ],
  [ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT]: [ISSUE_STATUS.WORK_IN_PROGRESS],
  [ISSUE_STATUS.WORK_IN_PROGRESS]: [ISSUE_STATUS.AWAITING_OFFICER_VERIFICATION, ISSUE_STATUS.UNDER_REVIEW],
  [ISSUE_STATUS.AWAITING_OFFICER_VERIFICATION]: [ISSUE_STATUS.RESOLVED],
  [ISSUE_STATUS.VOLUNTEER_CLAIMED]: [ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS, ISSUE_STATUS.REPORTED],
  [ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS]: [ISSUE_STATUS.RESOLVED_BY_COMMUNITY],
  [ISSUE_STATUS.RESOLVED]: [ISSUE_STATUS.CITIZEN_VERIFIED, ISSUE_STATUS.CLOSED, ISSUE_STATUS.UNDER_REVIEW, ISSUE_STATUS.REPORTED],
  [ISSUE_STATUS.RESOLVED_BY_COMMUNITY]: [ISSUE_STATUS.CITIZEN_VERIFIED, ISSUE_STATUS.CLOSED, ISSUE_STATUS.REPORTED],
  [ISSUE_STATUS.CITIZEN_VERIFIED]: [ISSUE_STATUS.CLOSED],
  [ISSUE_STATUS.REJECTED]: [],
  [ISSUE_STATUS.CLOSED]: [ISSUE_STATUS.REPORTED],
});

const HANDLING_MODE = Object.freeze({
  UNASSIGNED: "unassigned",
  VOLUNTEER: "volunteer",
  OFFICER_WORKER: "officer_worker",
});

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase();
  if (v === "assigned") return ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT;
  return v;
}

function canTransition(fromStatus, toStatus) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);
  const allowed = STATUS_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

function normalizeRole(role) {
  return String(role || "").toLowerCase();
}

/**
 * Returns whether a non-admin user may perform from -> to.
 * context: { isReporter, isVolunteerAssignee, officerSameDepartment, isSystemJob }
 */
function roleMayTransition(fromStatus, toStatus, userRole, context = {}) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);
  const role = normalizeRole(userRole);

  if (context.isSystemJob) {
    if (
      (from === ISSUE_STATUS.RESOLVED || from === ISSUE_STATUS.RESOLVED_BY_COMMUNITY) &&
      to === ISSUE_STATUS.CLOSED
    ) {
      return true;
    }
    return false;
  }

  const key = `${from}=>${to}`;

  const officerOk = context.officerSameDepartment !== false;

  switch (key) {
    case `${ISSUE_STATUS.REPORTED}=>${ISSUE_STATUS.UNDER_REVIEW}`:
      return role === ROLES.OFFICER && officerOk;
    case `${ISSUE_STATUS.UNDER_REVIEW}=>${ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT}`:
      return role === ROLES.OFFICER && officerOk;
    case `${ISSUE_STATUS.REPORTED}=>${ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT}`:
      return role === ROLES.OFFICER && officerOk;
    case `${ISSUE_STATUS.ASSIGNED_TO_DEPARTMENT}=>${ISSUE_STATUS.WORK_IN_PROGRESS}`:
      return [ROLES.OFFICER, ROLES.WORKER].includes(role) && (role === ROLES.WORKER || officerOk);
    case `${ISSUE_STATUS.WORK_IN_PROGRESS}=>${ISSUE_STATUS.RESOLVED}`:
      return [ROLES.WORKER, ROLES.OFFICER].includes(role) && (role !== ROLES.OFFICER || officerOk);
    case `${ISSUE_STATUS.WORK_IN_PROGRESS}=>${ISSUE_STATUS.UNDER_REVIEW}`:
      return [ROLES.WORKER, ROLES.OFFICER].includes(role) && (role !== ROLES.OFFICER || officerOk);

    case `${ISSUE_STATUS.REPORTED}=>${ISSUE_STATUS.VOLUNTEER_CLAIMED}`:
    case `${ISSUE_STATUS.UNDER_REVIEW}=>${ISSUE_STATUS.VOLUNTEER_CLAIMED}`:
      return role === ROLES.VOLUNTEER;

    case `${ISSUE_STATUS.VOLUNTEER_CLAIMED}=>${ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS}`:
    case `${ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS}=>${ISSUE_STATUS.RESOLVED_BY_COMMUNITY}`:
      return role === ROLES.VOLUNTEER && context.isVolunteerAssignee;

    case `${ISSUE_STATUS.RESOLVED}=>${ISSUE_STATUS.CITIZEN_VERIFIED}`:
    case `${ISSUE_STATUS.RESOLVED_BY_COMMUNITY}=>${ISSUE_STATUS.CITIZEN_VERIFIED}`:
      return role === ROLES.CITIZEN && context.isReporter;

    case `${ISSUE_STATUS.CITIZEN_VERIFIED}=>${ISSUE_STATUS.CLOSED}`:
      return role === ROLES.OFFICER && officerOk;

    case `${ISSUE_STATUS.RESOLVED}=>${ISSUE_STATUS.REPORTED}`:
    case `${ISSUE_STATUS.RESOLVED_BY_COMMUNITY}=>${ISSUE_STATUS.REPORTED}`:
    case `${ISSUE_STATUS.CLOSED}=>${ISSUE_STATUS.REPORTED}`:
      return role === ROLES.CITIZEN && context.isReporter;

    case `${ISSUE_STATUS.REPORTED}=>${ISSUE_STATUS.REJECTED}`:
    case `${ISSUE_STATUS.UNDER_REVIEW}=>${ISSUE_STATUS.REJECTED}`:
      return role === ROLES.OFFICER && officerOk;

    case `${ISSUE_STATUS.RESOLVED}=>${ISSUE_STATUS.UNDER_REVIEW}`:
      return role === ROLES.OFFICER && officerOk;

    case `${ISSUE_STATUS.VOLUNTEER_CLAIMED}=>${ISSUE_STATUS.REPORTED}`:
      return (
        (role === ROLES.VOLUNTEER && context.isVolunteerAssignee) ||
        (role === ROLES.OFFICER && officerOk)
      );

    default:
      return false;
  }
}

function assertIssueStatusChange({ issue, nextStatus, user, context = {} }) {
  const from = normalizeStatus(issue?.status);
  const to = normalizeStatus(nextStatus);

  if (!ALL_STATUSES.includes(to)) {
    return { ok: false, statusCode: 400, message: "Invalid status value." };
  }

  if (!canTransition(from, to)) {
    const allowed = STATUS_TRANSITIONS[from] || [];
    return {
      ok: false,
      statusCode: 400,
      message: `This status change is not allowed. Valid next statuses from "${from}": ${allowed.join(", ") || "none"}.`,
    };
  }

  const role = normalizeRole(user?.role);
  if (role === ROLES.ADMIN) {
    return { ok: true };
  }

  const isReporter = user && issue && String(issue.reportedBy) === String(user._id);
  const isVolunteerAssignee = user && issue && String(issue.volunteer) === String(user._id);
  const userDeptId = String(user?.department?._id || user?.department || '');
  const issueDeptId = String(issue?.assignedDepartment?._id || issue?.assignedDepartment || '');
  // If issue has no department yet, officer is allowed (they're assigning it)
  const officerSameDepartment = !issueDeptId || issueDeptId === 'null'
    ? true
    : userDeptId === issueDeptId;

  const merged = {
    isReporter,
    isVolunteerAssignee,
    officerSameDepartment,
    isSystemJob: !!context.isSystemJob,
    ...context,
  };

  if (merged.isSystemJob && canTransition(from, to)) {
    const sysOk =
      (from === ISSUE_STATUS.RESOLVED || from === ISSUE_STATUS.RESOLVED_BY_COMMUNITY) && to === ISSUE_STATUS.CLOSED;
    if (sysOk) return { ok: true };
  }

  if (!user) {
    return { ok: false, statusCode: 401, message: "Authentication required." };
  }

  if (!roleMayTransition(from, to, user.role, merged)) {
    return {
      ok: false,
      statusCode: 403,
      message:
        "You do not have permission to change the issue to this status. If you need to update the team, contact support or use comments on the issue.",
    };
  }

  return { ok: true };
}

module.exports = {
  ISSUE_STATUS,
  ALL_STATUSES,
  STATUS_TRANSITIONS,
  HANDLING_MODE,
  canTransition,
  roleMayTransition,
  assertIssueStatusChange,
  normalizeStatus,
};
