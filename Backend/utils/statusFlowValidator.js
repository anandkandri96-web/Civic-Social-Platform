const { STATUS_TRANSITIONS, ISSUE_STATUS } = require("./constants");

function canTransition(fromStatus, toStatus) {
  const allowed = STATUS_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

function validateStatusTransition(fromStatus, toStatus) {
  if (!canTransition(fromStatus, toStatus)) {
    const allowedTransitions = STATUS_TRANSITIONS[fromStatus] || [];
    return {
      valid: false,
      error: `Invalid transition from ${fromStatus} to ${toStatus}. Allowed transitions: ${allowedTransitions.join(", ")}`,
    };
  }

  return { valid: true };
}

function getAllowedTransitions(fromStatus) {
  return STATUS_TRANSITIONS[fromStatus] || [];
}

function isFinalStatus(status) {
  return [ISSUE_STATUS.CLOSED, ISSUE_STATUS.REJECTED].includes(status);
}

function requiresVerification(status) {
  return [ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY].includes(status);
}

module.exports = {
  canTransition,
  validateStatusTransition,
  getAllowedTransitions,
  isFinalStatus,
  requiresVerification,
};