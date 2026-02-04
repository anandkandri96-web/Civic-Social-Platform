// const express = require("express");
// const {
//   register,
//   login,
//   getMe,
// } = require("../controllers/auth.controller");

// const { protect } = require("../middlewares/auth.middleware");
// // const rateLimit = require("../middlewares/rateLimit.middleware"); // ❌ NOT A FUNCTION

// const router = express.Router();

// /**
//  * Public routes
//  */
// router.post("/register", register);
// router.post("/login", login);

// /**
//  * Protected routes
//  */
// router.get("/me", protect, getMe);

// module.exports = router;

const router = require("express").Router();
const { register, login, getMe } = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");

router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);

module.exports = router;
