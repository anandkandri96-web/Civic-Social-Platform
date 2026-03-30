const mongoose = require("mongoose");
const RoleUpgradeRequest = require("../models/roleUpgradeRequest");
const Department = require("../models/department");
const User = require("../models/user");
const { apiResponse } = require("../utils/apiResponse");
const { ROLES } = require("../config/roles");
const { generateNextOfficerId, generateNextWorkerId } = require("../services/serialId.service");

const { REQUESTABLE_UPGRADE_ROLES } = require("../constants/roleUpgrade");
const REQUESTABLE_ROLES = REQUESTABLE_UPGRADE_ROLES;
const STAFF_ROLES = new Set([ROLES.OFFICER, ROLES.WORKER]);
const OFFICER_REQUEST_ROLES = new Set([ROLES.OFFICER]);

const parseLinks = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  return String(raw)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
};

const normalizeRole = (role) => String(role || "").toLowerCase();

exports.createRoleUpgradeRequest = async (req, res) => {
  try {
    const user = req.user;
    const requestedRole = normalizeRole(req.body?.requestedRole);

    if (!user?._id) return apiResponse(res, 401, "Unauthorized");
    if (normalizeRole(user.role) === ROLES.ADMIN) {
      return apiResponse(res, 400, "Admins do not need role upgrades");
    }

    if (!REQUESTABLE_ROLES.includes(requestedRole)) {
      return apiResponse(res, 400, "You may only request volunteer or officer roles. Worker accounts are created by an administrator.");
    }

    const currentRole = normalizeRole(user.role);
    if (![ROLES.CITIZEN, ROLES.VOLUNTEER].includes(currentRole)) {
      return apiResponse(res, 403, "Only citizens or volunteers can request role upgrades");
    }

    if (requestedRole === currentRole) {
      return apiResponse(res, 400, "You already have this role");
    }

    const motivation = String(req.body?.motivation || "").trim();
    const experience = String(req.body?.experience || "").trim();
    const availability = String(req.body?.availability || "").trim();
    const skills = String(req.body?.skills || "").trim();
    const preferredDepartment = String(req.body?.preferredDepartment || "").trim();

    if (OFFICER_REQUEST_ROLES.has(requestedRole) && !preferredDepartment) {
      return apiResponse(res, 400, "Preferred department is required for officer requests");
    }

    const existing = await RoleUpgradeRequest.findOne({
      user: user._id,
      status: "pending",
    });

    if (existing) {
      return apiResponse(res, 409, "You already have a pending role upgrade request");
    }

    const payload = {
      user: user._id,
      currentRole: normalizeRole(user.role),
      requestedRole,
      preferredDepartment,
      motivation,
      experience,
      availability,
      skills,
      supportingLinks: parseLinks(req.body?.supportingLinks),
    };

    const created = await RoleUpgradeRequest.create(payload);

    return apiResponse(res, 201, "Role upgrade request submitted", created);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Create role upgrade request error:", error);
    return apiResponse(res, 500, "Failed to submit role upgrade request");
  }
};

exports.getMyRoleUpgradeRequests = async (req, res) => {
  try {
    const user = req.user;
    if (!user?._id) return apiResponse(res, 401, "Unauthorized");

    const items = await RoleUpgradeRequest.find({ user: user._id })
      .populate("department", "_id name")
      .sort({ createdAt: -1 })
      .lean();

    return apiResponse(res, 200, "Role upgrade requests retrieved", items || []);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Get my role upgrade requests error:", error);
    return apiResponse(res, 500, "Failed to fetch role upgrade requests");
  }
};

exports.getRoleUpgradeRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, requestedRole, userId, departmentId, search } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (status) filter.status = String(status).toLowerCase();
    if (requestedRole) filter.requestedRole = String(requestedRole).toLowerCase();
    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return apiResponse(res, 400, "Invalid department id");
      }
      filter.department = departmentId;
    }
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.user = userId;
    }

    if (search) {
      const q = String(search).trim();
      if (q) {
        const users = await User.find({
          $or: [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }).select("_id");
        const ids = users.map((u) => u._id);
        if (!ids.length) {
          return apiResponse(res, 200, "Role upgrade requests retrieved", {
            data: [],
            pagination: { total: 0, page: pageNum, pages: 0 },
          });
        }
        filter.user = { $in: ids };
      }
    }

    const [items, total] = await Promise.all([
      RoleUpgradeRequest.find(filter)
        .populate("user", "_id name email role department")
        .populate("department", "_id name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      RoleUpgradeRequest.countDocuments(filter),
    ]);

    return apiResponse(res, 200, "Role upgrade requests retrieved", {
      data: items || [],
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Get role upgrade requests error:", error);
    return apiResponse(res, 500, "Failed to fetch role upgrade requests");
  }
};

const applyStaffSerialIds = async (user, role) => {
  if (role === ROLES.WORKER && !user.workerId) {
    for (let i = 0; i < 5; i += 1) {
      try {
        user.workerId = await generateNextWorkerId();
        break;
      } catch (err) {
        if (err?.code === 11000) continue;
        throw err;
      }
    }
  }

  if (role === ROLES.OFFICER && !user.officerId) {
    for (let i = 0; i < 5; i += 1) {
      try {
        user.officerId = await generateNextOfficerId();
        break;
      } catch (err) {
        if (err?.code === 11000) continue;
        throw err;
      }
    }
  }
};

exports.reviewRoleUpgradeRequest = async (req, res) => {
  try {
    const { decision, status, adminNotes = "", departmentId } = req.body || {};
    const nextStatus = String(status || decision || "").toLowerCase();

    if (!["approved", "rejected"].includes(nextStatus)) {
      return apiResponse(res, 400, "Decision must be approved or rejected");
    }

    const request = await RoleUpgradeRequest.findById(req.params.id);
    if (!request) return apiResponse(res, 404, "Role upgrade request not found");

    if (request.status !== 'pending') {
      return apiResponse(res, 400, "Only pending requests can be reviewed");
    }

    if (nextStatus === 'approved') {
      const user = await User.findById(request.user);
      if (!user) return apiResponse(res, 404, "User not found");

      const targetRole = normalizeRole(request.requestedRole);
      if (!REQUESTABLE_ROLES.includes(targetRole)) {
        return apiResponse(res, 400, "Invalid requested role on request");
      }

      let department = null;
      if (STAFF_ROLES.has(targetRole)) {
        const deptId = departmentId || request.department;
        if (!deptId) {
          return apiResponse(res, 400, "Department is required for officer or worker approval");
        }
        if (!mongoose.Types.ObjectId.isValid(deptId)) {
          return apiResponse(res, 400, "Invalid department id");
        }
        department = await Department.findById(deptId);
        if (!department) return apiResponse(res, 404, "Department not found");
      }

      user.role = targetRole;
      if (department) user.department = department._id;
      user.isApproved = true;

      await applyStaffSerialIds(user, targetRole);
      await user.save();

      request.department = department ? department._id : request.department;
    }

    request.status = nextStatus;
    request.adminNotes = String(adminNotes || "").trim();
    request.reviewedBy = req.user?._id || null;
    request.reviewedAt = new Date();

    await request.save();

    const populated = await RoleUpgradeRequest.findById(request._id)
      .populate("user", "_id name email role department")
      .populate("department", "_id name")
      .lean();

    return apiResponse(res, 200, "Role upgrade request updated", populated);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Review role upgrade request error:", error);
    return apiResponse(res, 500, "Failed to review role upgrade request");
  }
};
