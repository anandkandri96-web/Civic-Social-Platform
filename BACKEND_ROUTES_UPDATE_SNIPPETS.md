# BACKEND ROUTE UPDATES - Code Snippets

This file shows exactly how to update each backend route file to use the new permission middleware.

Copy and paste these snippets into your route files.

---

## File: Backend/routes/admin.routes.js

### Current Implementation

```javascript
const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const {
  getStats,
  getAllIssues,
  getUsers,
  updateUserRole,
  updateUserStatus,
  approveUser,
  deleteUser,
  getDepartments,
  createDepartment,
} = require("../controllers/admin.controller");

router.get("/stats", protect, checkRole(["admin"]), getStats);
router.get("/issues", protect, checkRole(["admin"]), getAllIssues);
router.get("/users", protect, checkRole(["admin"]), getUsers);
router.patch("/users/:id/role", protect, checkRole(["admin"]), updateUserRole);
router.patch("/users/:id/status", protect, checkRole(["admin"]), updateUserStatus);
router.patch("/users/:id/approve", protect, checkRole(["admin"]), approveUser);
router.delete("/users/:id", protect, checkRole(["admin"]), deleteUser);
router.get("/departments", protect, checkRole(["admin"]), getDepartments);
router.post("/departments", protect, checkRole(["admin"]), createDepartment);

module.exports = router;
```

### ✅ Updated Implementation (With Permission Middleware)

```javascript
const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const {
  getStats,
  getAllIssues,
  getUsers,
  updateUserRole,
  updateUserStatus,
  approveUser,
  deleteUser,
  getDepartments,
  createDepartment,
} = require("../controllers/admin.controller");

// ✅ UPDATED: Using permission middleware instead of role-based checkRole

router.get(
  "/stats",
  protect,
  canPerform(PERMISSIONS.ADMIN_VIEW_ANALYTICS),
  getStats
);

router.get(
  "/issues",
  protect,
  canPerform(PERMISSIONS.ADMIN_VIEW_ALL_ISSUES),
  getAllIssues
);

router.get(
  "/users",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_USERS),
  getUsers
);

router.patch(
  "/users/:id/role",
  protect,
  canPerform(PERMISSIONS.ADMIN_CHANGE_ROLE),
  updateUserRole
);

router.patch(
  "/users/:id/status",
  protect,
  canPerform(PERMISSIONS.ADMIN_DISABLE_ACCOUNT),
  updateUserStatus
);

router.patch(
  "/users/:id/approve",
  protect,
  canPerform(PERMISSIONS.ADMIN_APPROVE_USER),
  approveUser
);

router.delete(
  "/users/:id",
  protect,
  canPerform(PERMISSIONS.ADMIN_DELETE_USER),
  deleteUser
);

router.get(
  "/departments",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_DEPARTMENTS),
  getDepartments
);

router.post(
  "/departments",
  protect,
  canPerform(PERMISSIONS.ADMIN_MANAGE_DEPARTMENTS),
  createDepartment
);

module.exports = router;
```

**Changes Made:**
- Added import: `const { canPerform } = require('../middlewares/permission.middleware');`
- Added import: `const { PERMISSIONS } = require('../config/permissions.config');`
- Replaced `checkRole(["admin"])` with `canPerform(PERMISSIONS.ADMIN_*)` for each endpoint

---

## File: Backend/routes/officer.routes.js

### Current Implementation

```javascript
const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const {
  getOfficerIssues,
  reviewOfficerIssue,
  assignOfficerWorker,
  updateOfficerIssueStatus,
  getOfficerWorkers,
} = require("../controllers/officer.controller");

router.get("/issues", protect, checkRole(["officer"]), getOfficerIssues);
router.patch("/issues/:id/review", protect, checkRole(["officer"]), reviewOfficerIssue);
router.patch("/issues/:id/assign-worker", protect, checkRole(["officer"]), assignOfficerWorker);
router.patch("/issues/:id/status", protect, checkRole(["officer"]), updateOfficerIssueStatus);
router.get("/workers", protect, checkRole(["officer"]), getOfficerWorkers);

module.exports = router;
```

### ✅ Updated Implementation

```javascript
const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform, canPerformResourceAction } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const {
  getOfficerIssues,
  reviewOfficerIssue,
  assignOfficerWorker,
  updateOfficerIssueStatus,
  getOfficerWorkers,
} = require("../controllers/officer.controller");

// ✅ UPDATED: Using permission middleware

router.get(
  "/issues",
  protect,
  canPerform(PERMISSIONS.OFFICER_VIEW_QUEUE),
  getOfficerIssues
);

router.patch(
  "/issues/:id/review",
  protect,
  canPerform(PERMISSIONS.OFFICER_REVIEW_ISSUE),
  reviewOfficerIssue
);

router.patch(
  "/issues/:id/assign-worker",
  protect,
  canPerform(PERMISSIONS.OFFICER_ASSIGN_WORKER),
  assignOfficerWorker
);

router.patch(
  "/issues/:id/status",
  protect,
  canPerformResourceAction("ISSUE", "UPDATE_STATUS"),  // Resource-level check
  updateOfficerIssueStatus
);

router.get(
  "/workers",
  protect,
  canPerform(PERMISSIONS.OFFICER_VIEW_DEPARTMENT),
  getOfficerWorkers
);

module.exports = router;
```

**Note:** The status update uses resource-level permission (`canPerformResourceAction`) because officers can only update issues in their department.

---

## File: Backend/routes/volunteer.routes.js

### Current Implementation

```javascript
const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const {
  getAvailableIssues,
  claimIssue,
  submitResolution,
  updateProgress,
  getClaimedIssues,
} = require("../controllers/volunteer.controller");

router.get("/issues/available", protect, checkRole(["volunteer"]), getAvailableIssues);
router.post("/issues/:id/claim", protect, checkRole(["volunteer"]), claimIssue);
router.patch("/issues/:id/progress", protect, checkRole(["volunteer"]), updateProgress);
router.post("/issues/:id/submit", protect, checkRole(["volunteer"]), submitResolution);
router.get("/issues/claimed", protect, checkRole(["volunteer"]), getClaimedIssues);

module.exports = router;
```

### ✅ Updated Implementation

```javascript
const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const {
  getAvailableIssues,
  claimIssue,
  submitResolution,
  updateProgress,
  getClaimedIssues,
} = require("../controllers/volunteer.controller");

// ✅ UPDATED: Using permission middleware

router.get(
  "/issues/available",
  protect,
  canPerform(PERMISSIONS.VOLUNTEER_CLAIM_ISSUE),
  getAvailableIssues
);

router.post(
  "/issues/:id/claim",
  protect,
  canPerform(PERMISSIONS.VOLUNTEER_CLAIM_ISSUE),
  claimIssue
);

router.patch(
  "/issues/:id/progress",
  protect,
  canPerform(PERMISSIONS.VOLUNTEER_UPDATE_PROGRESS),
  updateProgress
);

router.post(
  "/issues/:id/submit",
  protect,
  canPerform(PERMISSIONS.VOLUNTEER_SUBMIT_RESOLUTION),
  submitResolution
);

router.get(
  "/issues/claimed",
  protect,
  canPerform(PERMISSIONS.VOLUNTEER_CLAIM_ISSUE),  // or could use a dedicated permission
  getClaimedIssues
);

module.exports = router;
```

---

## File: Backend/routes/task.routes.js (Worker Tasks)

### Current Implementation

```javascript
const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const {
  getWorkerTasks,
  acceptTask,
  updateTaskProgress,
  completeTask,
} = require("../controllers/task.controller");

router.get("/", protect, checkRole(["worker"]), getWorkerTasks);
router.patch("/:id/accept", protect, checkRole(["worker"]), acceptTask);
router.patch("/:id/progress", protect, checkRole(["worker"]), updateTaskProgress);
router.patch("/:id/complete", protect, checkRole(["worker"]), completeTask);

module.exports = router;
```

### ✅ Updated Implementation

```javascript
const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const {
  getWorkerTasks,
  acceptTask,
  updateTaskProgress,
  completeTask,
} = require("../controllers/task.controller");

// ✅ UPDATED: Using permission middleware

router.get(
  "/",
  protect,
  canPerform(PERMISSIONS.WORKER_VIEW_TASKS),
  getWorkerTasks
);

router.patch(
  "/:id/accept",
  protect,
  canPerform(PERMISSIONS.WORKER_ACCEPT_TASK),
  acceptTask
);

router.patch(
  "/:id/progress",
  protect,
  canPerform(PERMISSIONS.WORKER_UPDATE_PROGRESS),
  updateTaskProgress
);

router.patch(
  "/:id/complete",
  protect,
  canPerform(PERMISSIONS.WORKER_COMPLETE_TASK),
  completeTask
);

module.exports = router;
```

---

## File: Backend/routes/issue.routes.js (Public Routes)

### Current Implementation

```javascript
const router = require("express").Router();
const { protect, optionalAuth } = require("../middlewares/auth.middleware");
//...

router.get("/", optionalAuth, getIssues);
router.post("/", protect, createIssue);
router.get("/:id", optionalAuth, getIssueDetails);
router.patch("/:id/status", protect, checkRole(["admin", "officer"]), updateIssueStatus);
router.delete("/:id", protect, deleteIssue);  // This will be handled in controller
//...
```

### ✅ Updated Implementation

```javascript
const router = require("express").Router();
const { protect, optionalAuth } = require("../middlewares/auth.middleware");
const { canPerform, canPerformResourceAction } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
//...

router.get("/", optionalAuth, getIssues);
router.post("/", protect, canPerform(PERMISSIONS.ISSUE_CREATE), createIssue);
router.get("/:id", optionalAuth, getIssueDetails);
router.patch(
  "/:id/status",
  protect,
  canPerformResourceAction("ISSUE", "UPDATE_STATUS"),  // Resource-level
  updateIssueStatus
);
router.delete(
  "/:id",
  protect,
  canPerformResourceAction("ISSUE", "DELETE"),  // Resource-level
  deleteIssue
);
//...
```

---

## File: Backend/routes/comment.routes.js

### Current Implementation

```javascript
const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");

router.post("/:issueId", protect, createComment);
router.delete("/:issueId/:commentId", protect, deleteComment);
router.patch("/:issueId/:commentId", protect, updateComment);
```

### ✅ Updated Implementation

```javascript
const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform, canPerformResourceAction } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");

router.post(
  "/:issueId",
  protect,
  canPerform(PERMISSIONS.COMMENT_CREATE),
  createComment
);

router.delete(
  "/:issueId/:commentId",
  protect,
  canPerformResourceAction("COMMENT", "DELETE"),  // Resource-level: user can delete own comment or admin
  deleteComment
);

router.patch(
  "/:issueId/:commentId",
  protect,
  canPerformResourceAction("COMMENT", "EDIT"),  // Resource-level: user can edit own comment or admin
  updateComment
);
```

---

## Summary of Changes

| File | Old Pattern | New Pattern |
|------|-------------|------------|
| All routes | `checkRole(['admin'])` | `canPerform(PERMISSIONS.ADMIN_*)` |
| All routes | `checkRole(['officer'])` | `canPerform(PERMISSIONS.OFFICER_*)` |
| Resource routes | Role check only | `canPerformResourceAction('RESOURCE', 'ACTION')` |

### Imports to Add

```javascript
// Add these to the top of each route file:
const { canPerform, canPerformResourceAction } = require("../middlewares/permission.middleware");
const { PERMISSIONS } = require("../config/permissions.config");

// Remove these (optional, can keep for backward compatibility):
// const { checkRole } = require("../middlewares/auth.middleware");
```

---

## Next: Update Controllers

Controllers may need updates to handle resource-level permission checks. For example:

```javascript
// In controller after canPerformResourceAction middleware
exports.deleteIssue = async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  
  // Check resource permission
  if (!req.checkResourcePermission(issue)) {
    return apiResponse(res, 403, 'Cannot delete this issue');
  }
  
  // Proceed
  await issue.deleteOne();
  return apiResponse(res, 200, 'Issue deleted');
};
```

See the main RBAC_REFACTORING_GUIDE.md for more details.
