const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform, canPerformResourceAction } = require("../middlewares/permission.middleware");
const { validatePagination, validateSort } = require("../middlewares/validation.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const Issue = require("../models/issue");
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
const { forceCloseIssue } = require("../controllers/issue.controller");
const {
  getRoleUpgradeRequests,
  reviewRoleUpgradeRequest,
} = require("../controllers/roleUpgrade.controller");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const schemas = require("../validators/joi.schemas");
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

router.patch(
  "/issues/:id/force-close",
  protect,
  canPerform(PERMISSIONS.ADMIN_CLOSE_ISSUE),
  canPerformResourceAction("ISSUE", "CLOSE", async (req) => Issue.findById(req.params.id)),
  forceCloseIssue
);

// ✅ Admin User Management
router.get("/users", protect, canPerform(PERMISSIONS.ADMIN_MANAGE_USERS), getUsers);
router.post("/users", protect, canPerform(PERMISSIONS.ADMIN_MANAGE_USERS), validateRequest(schemas.adminCreateUser), createUser);
router.patch(
  "/users/:id/role",
  protect,
  canPerform(PERMISSIONS.ADMIN_CHANGE_ROLE),
  validateRequest(schemas.adminUpdateUserRole),
  updateUserRole
);
router.patch(
  "/users/:id/status",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_USERS),
  validateRequest(schemas.adminUpdateUserStatus),
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
  validateRequest(schemas.adminAssignUserDepartment),
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
  validateRequest(schemas.roleUpgradeReviewDecision),
  reviewRoleUpgradeRequest
);

// ✅ Admin Department Management
router.get("/departments", protect, canPerform(PERMISSIONS.ADMIN_MANAGE_DEPARTMENTS), getDepartments);
router.post(
  "/departments",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_DEPARTMENTS),
  validateRequest(schemas.departmentCreate),
  createDepartment
);

module.exports = router;
