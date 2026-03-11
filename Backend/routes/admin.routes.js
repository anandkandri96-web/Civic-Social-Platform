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
const {
  getStats,
  getAllIssues,
  getUsers,
  createUser,
  updateUserRole,
  updateUserStatus,
  approveUser,
  assignUserDepartment,
  deleteUser,
  getDepartments,
  createDepartment,
} = require("../controllers/admin.controller");
const { getHeatmap } = require("../controllers/analytics.controller");

router.get("/stats", protect, checkRole(["admin"]), getStats);
router.get("/issues", protect, checkRole(["admin"]), getAllIssues);
router.get("/users", protect, checkRole(["admin"]), getUsers);
router.post("/users", protect, checkRole(["admin"]), createUser);
router.patch("/users/:id/role", protect, checkRole(["admin"]), updateUserRole);
router.patch("/users/:id/status", protect, checkRole(["admin"]), updateUserStatus);
router.patch("/users/:id/approve", protect, checkRole(["admin"]), approveUser);
router.patch("/users/:id/department", protect, checkRole(["admin"]), assignUserDepartment);
router.delete("/users/:id", protect, checkRole(["admin"]), deleteUser);
router.get("/departments", protect, checkRole(["admin"]), getDepartments);
router.post("/departments", protect, checkRole(["admin"]), createDepartment);
router.get("/analytics/heatmap", protect, checkRole(["admin", "officer"]), getHeatmap);

module.exports = router;
