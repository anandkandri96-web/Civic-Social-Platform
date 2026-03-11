const User = require("../models/user");
const Department = require("../models/department");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ROLES, ROLE_ALIASES } = require("../config/roles");
const { apiResponse } = require("../utils/apiResponse");

const ALLOWED_REGISTER_FIELDS = ["name", "email", "password", "role"];
const PUBLIC_ROLES = new Set([ROLES.CITIZEN, ROLES.VOLUNTEER]);
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const APPROVAL_ROLES = new Set([ROLES.VOLUNTEER, ROLES.OFFICER, ROLES.WORKER]);

const normalizeRole = (role) => {
  const raw = String(role || "").toLowerCase();
  return ROLE_ALIASES[raw] || raw;
};

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: normalizeRole(user.role) }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

const getDepartmentPayload = async (departmentId) => {
  if (!departmentId) return null;
  try {
    const dept = await Department.findById(departmentId).select("_id name").lean();
    return dept || departmentId;
  } catch (_) {
    return departmentId;
  }
};

exports.register = async (req, res) => {
  try {
    const body = {};
    for (const key of ALLOWED_REGISTER_FIELDS) {
      if (req.body[key] != null) body[key] = req.body[key];
    }

    if (!body.name || !body.email || !body.password) {
      return apiResponse(res, 400, "Name, email and password are required");
    }

    const name = String(body.name).trim();
    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);
    const requestedRole = normalizeRole(body.role || ROLES.CITIZEN);

    if (name.length < 2 || name.length > 60) {
      return apiResponse(res, 400, "Name must be 2-60 characters");
    }

    if (!EMAIL_RE.test(email)) {
      return apiResponse(res, 400, "Invalid email format");
    }

    if (password.length < 6 || password.length > 128) {
      return apiResponse(res, 400, "Password must be 6-128 characters");
    }

    if (!PUBLIC_ROLES.has(requestedRole)) {
      return apiResponse(res, 400, "Invalid role for public registration");
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return apiResponse(res, 400, "Email already registered");
    }

    const user = await User.create({
      name,
      email,
      password,
      role: requestedRole,
      isApproved: requestedRole === ROLES.CITIZEN,
    });

    const token = generateToken(user);

    return apiResponse(
      res,
      201,
      "Registration successful",
      { token, user: { id: user._id, name: user.name, email: user.email, role: user.role } }
    );
  } catch (err) {
    console.error("Register error:", err);
    return apiResponse(res, 500, "Registration failed");
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return apiResponse(res, 400, "Email and password are required");
    }

    const emailNorm = String(email).trim().toLowerCase();
    const passwordStr = String(password);
    if (!EMAIL_RE.test(emailNorm)) {
      return apiResponse(res, 400, "Invalid email format");
    }

    if (passwordStr.length < 6 || passwordStr.length > 128) {
      return apiResponse(res, 400, "Password must be 6-128 characters");
    }

    const user = await User.findOne({ email: emailNorm }).select("+password");
    if (!user) {
      return apiResponse(res, 401, "Invalid email or password");
    }

    const match = await bcrypt.compare(passwordStr, user.password);
    if (!match) {
      return apiResponse(res, 401, "Invalid email or password");
    }

    if (!user.isActive) {
      return apiResponse(res, 403, "Account is disabled");
    }
    if (APPROVAL_ROLES.has(normalizeRole(user.role)) && !user.isApproved) {
      return apiResponse(res, 403, "Account pending admin approval");
    }

    const token = generateToken(user);
    const department = await getDepartmentPayload(user.department);

    return apiResponse(res, 200, "Login successful", {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        isApproved: user.isApproved,
        department,
        workerId: user.workerId || null,
        officerId: user.officerId || null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return apiResponse(res, 500, "Login failed");
  }
};

exports.getMe = async (req, res) => {
  const department = await getDepartmentPayload(req.user.department);
  return apiResponse(res, 200, "User profile retrieved", {
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    isApproved: req.user.isApproved,
    department,
    workerId: req.user.workerId || null,
    officerId: req.user.officerId || null,
  });
};

exports.updateMe = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const updates = {};

    if (name !== undefined) {
      const safeName = String(name).trim();
      if (safeName.length < 2 || safeName.length > 60) {
        return apiResponse(res, 400, "Name must be 2-60 characters");
      }
      updates.name = safeName;
    }

    if (email !== undefined) {
      const safeEmail = String(email).trim().toLowerCase();
      if (!EMAIL_RE.test(safeEmail)) {
        return apiResponse(res, 400, "Invalid email format");
      }
      const existing = await User.findOne({ email: safeEmail, _id: { $ne: req.user._id } });
      if (existing) return apiResponse(res, 400, "Email already in use");
      updates.email = safeEmail;
    }

    if (password !== undefined) {
      const safePassword = String(password);
      if (safePassword.length < 6 || safePassword.length > 128) {
        return apiResponse(res, 400, "Password must be 6-128 characters");
      }
      updates.password = safePassword;
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return apiResponse(res, 404, "User not found");

    Object.assign(user, updates);
    await user.save();
    const department = await getDepartmentPayload(user.department);

    return apiResponse(res, 200, "Profile updated", {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
      isApproved: user.isApproved,
      department,
      workerId: user.workerId || null,
      officerId: user.officerId || null,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return apiResponse(res, 500, "Failed to update profile");
  }
};
