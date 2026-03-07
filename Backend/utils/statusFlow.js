const { STATUS_TRANSITIONS } = require("./constants");

function canTransition(fromStatus, toStatus) {
  const allowed = STATUS_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

module.exports = { canTransition };