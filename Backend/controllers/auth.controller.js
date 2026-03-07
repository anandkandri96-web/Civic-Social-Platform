const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ROLES, ROLE_ALIASES } = require("../config/roles");

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

exports.register = async (req, res) => {
  try {
    const body = {};
    for (const key of ALLOWED_REGISTER_FIELDS) {
      if (req.body[key] != null) body[key] = req.body[key];
    }

    if (!body.name || !body.email || !body.password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const name = String(body.name).trim();
    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);
    const requestedRole = normalizeRole(body.role || ROLES.CITIZEN);

    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({ message: "Name must be 2-60 characters" });
    }

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ message: "Password must be 6-128 characters" });
    }

    if (!PUBLIC_ROLES.has(requestedRole)) {
      return res.status(400).json({ message: "Invalid role for public registration" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: requestedRole,
      isApproved: requestedRole === ROLES.CITIZEN,
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const passwordStr = String(password);
    if (!EMAIL_RE.test(emailNorm)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (passwordStr.length < 6 || passwordStr.length > 128) {
      return res.status(400).json({ message: "Password must be 6-128 characters" });
    }

    const user = await User.findOne({ email: emailNorm }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(passwordStr, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is disabled" });
    }
    if (APPROVAL_ROLES.has(normalizeRole(user.role)) && !user.isApproved) {
      return res.status(403).json({ message: "Account pending admin approval" });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        isApproved: user.isApproved,
        department: user.department || null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

exports.getMe = async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isApproved: req.user.isApproved,
      department: req.user.department || null,
    },
  });
};

exports.updateMe = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const updates = {};

    if (name !== undefined) {
      const safeName = String(name).trim();
      if (safeName.length < 2 || safeName.length > 60) {
        return res.status(400).json({ message: "Name must be 2-60 characters" });
      }
      updates.name = safeName;
    }

    if (email !== undefined) {
      const safeEmail = String(email).trim().toLowerCase();
      if (!EMAIL_RE.test(safeEmail)) {
        return res.status(400).json({ message: "Invalid email format" });
      }
      const existing = await User.findOne({ email: safeEmail, _id: { $ne: req.user._id } });
      if (existing) return res.status(400).json({ message: "Email already in use" });
      updates.email = safeEmail;
    }

    if (password !== undefined) {
      const safePassword = String(password);
      if (safePassword.length < 6 || safePassword.length > 128) {
        return res.status(400).json({ message: "Password must be 6-128 characters" });
      }
      updates.password = safePassword;
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ message: "User not found" });

    Object.assign(user, updates);
    await user.save();

    return res.json({
      message: "Profile updated",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        isApproved: user.isApproved,
        department: user.department || null,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Failed to update profile" });
  }
};
