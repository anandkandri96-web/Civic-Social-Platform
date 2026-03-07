const ROLES = Object.freeze({
  CITIZEN: "citizen",
  VOLUNTEER: "volunteer",
  OFFICER: "officer",
  WORKER: "worker",
  ADMIN: "admin",
});

// Legacy role aliases supported by old clients/data
const ROLE_ALIASES = Object.freeze({
  user: ROLES.CITIZEN,
});

module.exports = { ROLES, ROLE_ALIASES };
