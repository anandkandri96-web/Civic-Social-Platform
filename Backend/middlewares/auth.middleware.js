// backend/middlewares/auth.middleware.js

const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { apiResponse } = require("../utils/apiResponse");

/**
 * Protect routes (JWT authentication)
 */
exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return apiResponse(res, 401, "Authorization token missing");
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "_id name email role isActive"
      // location ❌ not used yet
    );

    if (!user) {
      return apiResponse(res, 401, "User not found");
    }

    if (!user.isActive) {
      return apiResponse(res, 403, "User account is deactivated");
    }

    req.user = user;
    next();
  } catch (err) {
    return apiResponse(res, 401, "Invalid or expired token");
  }
};

/**
 * Optional auth: set req.user if valid token, never 401
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("_id name email role isActive");
    if (user && user.isActive) req.user = user;
  } catch (_) {}
  next();
};

/**
 * Role-based access control
 * Usage: checkRole("ADMIN")
 */
exports.checkRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user?.role) {
      return apiResponse(res, 401, "Unauthorized");
    }

    const userRole = req.user.role.toLowerCase();
    const allowed = allowedRoles.map(r => r.toLowerCase());

    if (!allowed.includes(userRole)) {
      return apiResponse(res, 403, "Access denied");
    }

    next();
  };
};

