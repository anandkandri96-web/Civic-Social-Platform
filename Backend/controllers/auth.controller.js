const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ROLES, ROLE_ALIASES } = require("../config/roles");

const ALLOWED_REGISTER_FIELDS = ["name", "email", "password", "role"];
const PUBLIC_ROLES = new Set([ROLES.CITIZEN, ROLES.VOLUNTEER]);
const EMAIL_RE = /^\S+@\S+\.\S+$/;

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

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
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
    },
  });
};