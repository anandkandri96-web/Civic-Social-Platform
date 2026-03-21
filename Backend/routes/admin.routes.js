const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform } = require("../middlewares/permission.middleware");
const { validatePagination, validateSort } = require("../middlewares/validation.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
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
const {
  getRoleUpgradeRequests,
  reviewRoleUpgradeRequest,
} = require("../controllers/roleUpgrade.controller");
const { getHeatmap } = require("../controllers/analytics.controller");

// ✅ Admin Analytics & Insights
router.get("/stats", protect, canPerform(PERMISSIONS.ADMIN_VIEW_ANALYTICS), getStats);
router.get(
  "/analytics/heatmap",
  protect,
  canPerform(PERMISSIONS.ADMIN_VIEW_ANALYTICS),
  getHeatmap
);

// ✅ Admin Issue Management
router.get(
  "/issues",
  protect,
  canPerform(PERMISSIONS.ADMIN_VIEW_ISSUES),
  validatePagination(),
  validateSort(["createdAt", "-createdAt", "priorityScore", "-priorityScore", "voteCount", "-voteCount", "severity", "-severity"]),
  getAllIssues
);

// ✅ Admin User Management
router.get("/users", protect, canPerform(PERMISSIONS.ADMIN_MANAGE_USERS), getUsers);
router.post("/users", protect, canPerform(PERMISSIONS.ADMIN_MANAGE_USERS), createUser);
router.patch(
  "/users/:id/role",
  protect,
  canPerform(PERMISSIONS.ADMIN_CHANGE_ROLE),
  updateUserRole
);
router.patch(
  "/users/:id/status",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_USERS),
  updateUserStatus
);
router.patch(
  "/users/:id/approve",
  protect,
  canPerform(PERMISSIONS.ADMIN_APPROVE_USERS),
  approveUser
);
router.patch(
  "/users/:id/department",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_USERS),
  assignUserDepartment
);
router.delete(
  "/users/:id",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_USERS),
  deleteUser
);

// ✅ Role upgrade requests
router.get(
  "/role-upgrades",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_ROLE_UPGRADES),
  validatePagination(),
  getRoleUpgradeRequests
);
router.patch(
  "/role-upgrades/:id/decision",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_ROLE_UPGRADES),
  reviewRoleUpgradeRequest
);

// ✅ Admin Department Management
router.get("/departments", protect, canPerform(PERMISSIONS.ADMIN_MANAGE_DEPARTMENTS), getDepartments);
router.post(
  "/departments",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_DEPARTMENTS),
  createDepartment
);

module.exports = router;
