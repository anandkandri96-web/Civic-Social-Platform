// // backend/routes/admin.routes.js

// const express = require('express');
// const { getStats, getAllIssues } = require('../controllers/admin.controller');
// const { protect, checkRole } = require('../middlewares/auth.middleware'); // updated import

// const router = express.Router();

// // Admin-only routes
// router.get('/stats', protect, checkRole(['admin']), getStats);
// router.get('/issues', protect, checkRole(['admin']), getAllIssues);

// module.exports = router;

const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const { getStats, getAllIssues } = require("../controllers/admin.controller");

router.get("/stats", protect, checkRole(["admin"]), getStats);
router.get("/issues", protect, checkRole(["admin"]), getAllIssues);

module.exports = router;
