const Issue = require("../models/issue");
const Task = require("../models/task");
const User = require("../models/user");
const Department = require("../models/department");
const { apiResponse } = require("../utils/apiResponse");
const { ROLES, DEPARTMENT_NAMES } = require("../utils/constants");
const { generateNextOfficerId, generateNextWorkerId } = require("../services/serialId.service");

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const NAME_RE = /^[A-Za-z][A-Za-z\s.'-]{1,59}$/;

const buildIssueSearchFilter = (raw) => {
  const term = String(raw || "").trim();
  if (!term) return null;
  const regex = new RegExp(escapeRegex(term), "i");
  return {
    $or: [
      { title: regex },
      { description: regex },
      { locationText: regex },
      { category: regex },
    ],
  };
};

exports.getStats = async (_req, res) => {
  try {
    const [totalIssues, totalUsers, statusBreakdown, avgResolution] = await Promise.all([
      Issue.countDocuments(),
      User.countDocuments(),
      Issue.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Issue.aggregate([
        {
          $match: {
            status: { $in: ["resolved", "resolved_by_community", "closed"] },
            resolvedAt: { $ne: null },
          },
        },
        {
          $project: {
            resolutionHours: {
              $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60],
            },
          },
        },
        { $group: { _id: null, avgHours: { $avg: "$resolutionHours" } } },
      ]),
    ]);

    return apiResponse(res, 200, "Admin stats retrieved", {
      totalIssues,
      totalUsers,
      statusBreakdown,
      avgResolutionHours: avgResolution[0]?.avgHours || 0,
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    return apiResponse(res, 500, "Failed to load admin stats");
  }
};

exports.getAllIssues = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, sort = "-createdAt", search } = req.query;

    const allowedSortFields = new Set(["createdAt", "-createdAt", "priorityScore", "-priorityScore", "voteCount", "-voteCount", "severity", "-severity"]);
    const sortValue = allowedSortFields.has(String(sort).trim()) ? String(sort).trim() : "-createdAt";

    const filter = {};
    if (status) filter.status = String(status).toLowerCase();
    if (category) filter.category = String(category).toLowerCase();
    const searchFilter = buildIssueSearchFilter(search);
    if (searchFilter) Object.assign(filter, searchFilter);

    const skip = (Number(page) - 1) * Number(limit);

    const [issuesRaw, total] = await Promise.all([
      Issue.find(filter)
        .populate("reportedBy", "name email role")
        .populate("assignedDepartment", "name")
        .populate("assignedWorker", "name email workerId")
        .populate("volunteer", "name email")
        .sort(sortValue)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Issue.countDocuments(filter),
    ]);

    const issues = Array.isArray(issuesRaw) ? issuesRaw : [];
    if (issues.length > 0) {
      const issueIds = issues.map((i) => i._id);
      const tasks = await Task.find({ issue: { $in: issueIds } })
        .select("issue progressImages")
        .lean();

      const map = new Map();
      for (const t of tasks) {
        const key = String(t.issue);
        const imgs = Array.isArray(t.progressImages) ? t.progressImages.filter(Boolean).slice(0, 10) : [];
        if (!map.has(key)) map.set(key, imgs);
      }

      for (const issue of issues) {
        issue.workerProgressImages = map.get(String(issue._id)) || [];
      }
    }

    return apiResponse(res, 200, "Issues retrieved", {
      data: issues,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Admin Issues Error:", error);
    return apiResponse(res, 500, "Failed to fetch issues");
  }
};

exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, isActive, isApproved, departmentId } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (role) filter.role = String(role).toLowerCase();
    if (isActive !== undefined) filter.isActive = String(isActive).toLowerCase() === "true";
    if (isApproved !== undefined) filter.isApproved = String(isApproved).toLowerCase() === "true";
    if (departmentId) filter.department = departmentId;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("_id name email role isActive isApproved department createdAt workerId officerId")
        .populate("department", "_id name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      User.countDocuments(filter),
    ]);

    return apiResponse(res, 200, "Users retrieved", {
      data: users,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    return apiResponse(res, 500, "Failed to fetch users");
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, departmentId, isApproved } = req.body;
    const allowedRoles = [ROLES.CITIZEN, ROLES.VOLUNTEER, ROLES.OFFICER, ROLES.WORKER, ROLES.ADMIN];
    const nextRole = String(role || "").toLowerCase();

    if (!name || !email || !password || !nextRole) {
      return apiResponse(res, 400, "name, email, password and role are required");
    }

    if (!NAME_RE.test(String(name).trim())) {
      return apiResponse(res, 400, "Name must be 2-60 letters and spaces only");
    }

    if (!EMAIL_RE.test(String(email).trim().toLowerCase())) {
      return apiResponse(res, 400, "Invalid email format");
    }

    if (String(password).length < 6 || String(password).length > 128) {
      return apiResponse(res, 400, "Password must be 6-128 characters");
    }

    if (!allowedRoles.includes(nextRole)) {
      return apiResponse(res, 400, "Invalid role");
    }

    let department = null;
    if (departmentId) {
      department = await Department.findById(departmentId);
      if (!department) return apiResponse(res, 404, "Department not found");
    }
    if ([ROLES.OFFICER, ROLES.WORKER].includes(nextRole) && !department) {
      return apiResponse(res, 400, "departmentId is required for officer/worker");
    }

    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) {
      return apiResponse(res, 400, "Email already exists");
    }

    const user = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: String(password),
      role: nextRole,
      isActive: true,
      isApproved: typeof isApproved === "boolean" ? isApproved : nextRole === ROLES.CITIZEN,
      department: department ? department._id : null,
    });

    // Assign serial IDs for staff roles.
    if (nextRole === ROLES.WORKER && !user.workerId) {
      for (let i = 0; i < 5; i += 1) {
        try {
          user.workerId = await generateNextWorkerId();
          await user.save();
          break;
        } catch (err) {
          if (err?.code === 11000) continue;
          throw err;
        }
      }
    }
    if (nextRole === ROLES.OFFICER && !user.officerId) {
      for (let i = 0; i < 5; i += 1) {
        try {
          user.officerId = await generateNextOfficerId();
          await user.save();
          break;
        } catch (err) {
          if (err?.code === 11000) continue;
          throw err;
        }
      }
    }

    return apiResponse(res, 201, "User created", {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isApproved: user.isApproved,
      department: user.department,
      workerId: user.workerId,
      officerId: user.officerId,
    });
  } catch (error) {
    console.error("Create user error:", error);
    return apiResponse(res, 500, "Failed to create user");
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const nextRole = String(role || "").toLowerCase();
    const allowedRoles = [ROLES.CITIZEN, ROLES.VOLUNTEER, ROLES.OFFICER, ROLES.WORKER, ROLES.ADMIN];
    if (!allowedRoles.includes(nextRole)) {
      return apiResponse(res, 400, "Invalid role");
    }

    const user = await User.findById(req.params.id);
    if (!user) return apiResponse(res, 404, "User not found");

    user.role = nextRole;
    if ([ROLES.OFFICER, ROLES.WORKER].includes(nextRole) && !user.department) {
      return apiResponse(res, 400, "Assign department before setting officer/worker role");
    }

    if (nextRole === ROLES.WORKER && !user.workerId) {
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
    if (nextRole === ROLES.OFFICER && !user.officerId) {
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
    await user.save();

    return apiResponse(res, 200, "User role updated", {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isApproved: user.isApproved,
      department: user.department,
      workerId: user.workerId,
      officerId: user.officerId,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return apiResponse(res, 500, "Failed to update user role");
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return apiResponse(res, 400, "isActive must be boolean");
    }

    const user = await User.findById(req.params.id);
    if (!user) return apiResponse(res, 404, "User not found");

    user.isActive = isActive;
    await user.save();

    return apiResponse(res, 200, "User status updated", {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isApproved: user.isApproved,
      department: user.department,
    });
  } catch (error) {
    console.error("Update user status error:", error);
    return apiResponse(res, 500, "Failed to update user status");
  }
};

exports.approveUser = async (req, res) => {
  try {
    const { isApproved } = req.body;
    if (typeof isApproved !== "boolean") {
      return apiResponse(res, 400, "isApproved must be boolean");
    }

    const user = await User.findById(req.params.id);
    if (!user) return apiResponse(res, 404, "User not found");

    user.isApproved = isApproved;
    if (isApproved && [ROLES.OFFICER, ROLES.WORKER].includes(user.role) && !user.department) {
      return apiResponse(res, 400, "Officer/worker must have a department before approval");
    }
    await user.save();

    return apiResponse(res, 200, "User approval updated", {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isApproved: user.isApproved,
      department: user.department,
    });
  } catch (error) {
    console.error("Approve user error:", error);
    return apiResponse(res, 500, "Failed to update user approval");
  }
};

exports.assignUserDepartment = async (req, res) => {
  try {
    const { departmentId } = req.body;
    if (!departmentId) return apiResponse(res, 400, "departmentId is required");

    const [user, department] = await Promise.all([
      User.findById(req.params.id),
      Department.findById(departmentId),
    ]);

    if (!user) return apiResponse(res, 404, "User not found");
    if (!department) return apiResponse(res, 404, "Department not found");

    user.department = department._id;
    await user.save();

    return apiResponse(res, 200, "User department assigned", {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      isApproved: user.isApproved,
      department: user.department,
    });
  } catch (error) {
    console.error("Assign user department error:", error);
    return apiResponse(res, 500, "Failed to assign user department");
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return apiResponse(res, 404, "User not found");

    if (String(user._id) === String(req.user._id)) {
      return apiResponse(res, 400, "Admin cannot delete own account");
    }

    await User.findByIdAndDelete(req.params.id);
    return apiResponse(res, 200, "User deleted");
  } catch (error) {
    console.error("Delete user error:", error);
    return apiResponse(res, 500, "Failed to delete user");
  }
};

exports.getDepartments = async (_req, res) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });
    return apiResponse(res, 200, "Departments retrieved", departments);
  } catch (error) {
    console.error("Get departments error:", error);
    return apiResponse(res, 500, "Failed to fetch departments");
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, description = "", categories = [], coverageArea } = req.body;
    if (!name || !String(name).trim()) {
      return apiResponse(res, 400, "Department name is required");
    }

    const trimmedName = String(name).trim();
    if (!DEPARTMENT_NAMES.includes(trimmedName)) {
      return apiResponse(
        res,
        400,
        `Department name must be one of: ${DEPARTMENT_NAMES.join(", ")}`
      );
    }

    const existing = await Department.findOne({ name: trimmedName });
    if (existing) return apiResponse(res, 400, "Department already exists");

    const data = {
      name: trimmedName,
      description: String(description).trim(),
      categories: Array.isArray(categories) ? categories.map((c) => String(c).toLowerCase()) : [],
    };
    if (coverageArea && coverageArea.type === "Polygon" && Array.isArray(coverageArea.coordinates)) {
      data.coverageArea = coverageArea;
    }

    const department = await Department.create(data);

    return apiResponse(res, 201, "Department created", department);
  } catch (error) {
    console.error("Create department error:", error);
    return apiResponse(res, 500, "Failed to create department");
  }
};
