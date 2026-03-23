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
  ngo: ROLES.VOLUNTEER,
  department_officer: ROLES.OFFICER,
  "department officer": ROLES.OFFICER,
  field_worker: ROLES.WORKER,
  "field worker": ROLES.WORKER,
  system_admin: ROLES.ADMIN,
  "system administrator": ROLES.ADMIN,
});

module.exports = { ROLES, ROLE_ALIASES };
