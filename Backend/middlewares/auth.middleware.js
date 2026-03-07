const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { apiResponse } = require("../utils/apiResponse");
const { ROLE_ALIASES } = require("../config/roles");
const APPROVAL_ROLES = new Set(["volunteer", "officer", "worker"]);

const normalizeRole = (role) => {
  const raw = String(role || "").toLowerCase();
  return ROLE_ALIASES[raw] || raw;
};

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return apiResponse(res, 401, "Authorization token missing");
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("_id name email role isActive isApproved department");

    if (!user) {
      return apiResponse(res, 401, "User not found");
    }

    if (!user.isActive) {
      return apiResponse(res, 403, "User account is deactivated");
    }
    if (APPROVAL_ROLES.has(normalizeRole(user.role)) && !user.isApproved) {
      return apiResponse(res, 403, "User account is pending approval");
    }

    user.role = normalizeRole(user.role);
    req.user = user;
    next();
  } catch (err) {
    return apiResponse(res, 401, "Invalid or expired token");
  }
};

exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id name email role isActive isApproved department");

    if (user && user.isActive && (!APPROVAL_ROLES.has(normalizeRole(user.role)) || user.isApproved)) {
      user.role = normalizeRole(user.role);
      req.user = user;
    }
  } catch (_) {
    // No-op for optional auth.
  }

  next();
};

exports.checkRole = (allowedRoles) => {
  const allowed = (Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]).map((r) => normalizeRole(r));

  return (req, res, next) => {
    if (!req.user?.role) {
      return apiResponse(res, 401, "Unauthorized");
    }

    const userRole = normalizeRole(req.user.role);
    if (!allowed.includes(userRole)) {
      return apiResponse(res, 403, "Access denied");
    }

    next();
  };
};
