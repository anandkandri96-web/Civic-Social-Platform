const { ROLES } = require("../config/roles");

/** Roles a user may request via self-service (worker is admin-created only). */
const REQUESTABLE_UPGRADE_ROLES = Object.freeze([ROLES.VOLUNTEER, ROLES.OFFICER]);

module.exports = { REQUESTABLE_UPGRADE_ROLES };
