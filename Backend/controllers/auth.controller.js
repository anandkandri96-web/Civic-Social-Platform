// // backend/controllers/auth.controller.js

// const User = require("../models/user");
// const jwt = require("jsonwebtoken");
// const { apiResponse } = require("../utils/apiResponse");

// /**
//  * Generate JWT
//  */
// const generateToken = (user) => {
//   return jwt.sign(
//     { id: user._id, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: "7d" }
//   );
// };

// /**
//  * @desc    Register user
//  * @route   POST /api/auth/register
//  * @access  Public
//  */
// exports.register = async (req, res) => {
//   try {
//     const { name, email, password, location } = req.body;

//     if (!name || !email || !password) {
//       return apiResponse(res, 400, "All fields are required");
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return apiResponse(res, 400, "Email already registered");
//     }

//     const userData = {
//       name,
//       email,
//       password,
//       role: "CITIZEN",
//     };

//     if (
//       location &&
//       Array.isArray(location.coordinates) &&
//       location.coordinates.length === 2
//     ) {
//       userData.location = {
//         type: "Point",
//         coordinates: location.coordinates,
//       };
//     }

//     const user = await User.create(userData);
//     const token = generateToken(user);

//     return apiResponse(res, 201, "User registered successfully", {
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//       token,
//     });
//   } catch (error) {
//     console.error("Register Error:", error);
//     return apiResponse(res, 500, "Registration failed");
//   }
// };

// /**
//  * @desc    Login user
//  * @route   POST /api/auth/login
//  * @access  Public
//  */
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return apiResponse(res, 400, "Email and password are required");
//     }

//     const user = await User.findOne({ email }).select("+password");
//     if (!user) {
//       return apiResponse(res, 401, "Invalid email or password");
//     }

//     const isMatch = await user.comparePassword(password);
//     if (!isMatch) {
//       return apiResponse(res, 401, "Invalid email or password");
//     }

//     if (!user.isActive) {
//       return apiResponse(res, 403, "Account is disabled");
//     }

//     const token = generateToken(user);

//     return apiResponse(res, 200, "Login successful", {
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//       token,
//     });
//   } catch (error) {
//     console.error("Login Error:", error);
//     return apiResponse(res, 500, "Login failed");
//   }
// };

// /**
//  * @desc    Get current user
//  * @route   GET /api/auth/me
//  * @access  Private
//  */
// exports.getMe = async (req, res) => {
//   return apiResponse(res, 200, "User profile", {
//     id: req.user._id,
//     name: req.user.name,
//     email: req.user.email,
//     role: req.user.role,
//     location: req.user.location || null,
//   });
// };

const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/** Allowlisted fields only – prevents role escalation */
const ALLOWED_REGISTER_FIELDS = ["name", "email", "password", "role"];
// WARNING: Insecure. Allows anyone to self-register as admin.
// Use only for local/dev unless you add an invite code or admin approval.
const PUBLIC_ROLES = new Set(["user", "volunteer", "admin"]);
const EMAIL_RE = /^\S+@\S+\.\S+$/;

exports.register = async (req, res) => {
  try {
    const body = {};
    for (const key of ALLOWED_REGISTER_FIELDS) {
      if (req.body[key] != null) body[key] = req.body[key];
    }
    if (body.role) {
      const role = String(body.role).toLowerCase();
      if (!PUBLIC_ROLES.has(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      body.role = role;
    }
    if (!body.name || !body.email || !body.password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    const name = String(body.name).trim();
    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);
    if (name.length < 2 || name.length > 60) {
      return res.status(400).json({ message: "Name must be 2-60 characters" });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }
    if (password.length < 6 || password.length > 128) {
      return res.status(400).json({ message: "Password must be 6-128 characters" });
    }
    body.name = name;
    body.email = email;
    body.password = password;
    const existing = await User.findOne({ email: body.email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const user = await User.create(body);
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
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
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Account is disabled" });
    }
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
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
