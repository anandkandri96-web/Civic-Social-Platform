const User = require("../models/user");
const { ROLES } = require("../config/roles");

const SYSTEM_EMAIL = "system-deleted-user@local.invalid";

/**
 * Permanent placeholder account for deleted reporters / anonymized references.
 */
async function getOrCreateDeletedUserPlaceholder() {
  let u = await User.findOne({ email: SYSTEM_EMAIL });
  if (u) return u;

  u = await User.create({
    name: "Deleted user",
    email: SYSTEM_EMAIL,
    password: require("crypto").randomBytes(32).toString("hex"),
    role: ROLES.CITIZEN,
    isActive: false,
    isApproved: false,
  });
  return u;
}

module.exports = { getOrCreateDeletedUserPlaceholder, SYSTEM_EMAIL };
