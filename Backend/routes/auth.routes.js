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
const { register, login, getMe, updateMe } = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth.middleware");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const schemas = require("../validators/joi.schemas");

router.post("/register", validateRequest(schemas.authRegister), register);
router.post("/login", validateRequest(schemas.authLogin), login);
router.get("/me", protect, getMe);
router.patch("/me", protect, validateRequest(schemas.authUpdateMe), updateMe);

module.exports = router;
