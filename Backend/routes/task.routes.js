const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const { canPerform } = require("../middlewares/permission.middleware");
const { uploadImages } = require("../middlewares/upload.middleware");
const { PERMISSIONS } = require("../config/permissions.config");
const { validateRequest } = require("../middlewares/validateRequest.middleware");
const schemas = require("../validators/joi.schemas");
const { requireTaskAddProgressPayload } = require("../middlewares/bodyOrUploadGuards.middleware");
const {
  createTask,
  getMyTasks,
  updateTaskStatus,
  addTaskProgress,
} = require("../controllers/task.controller");

// ✅ All task routes require authentication
router.use(protect);

// ✅ Worker: List assigned tasks
router.get(
  "/my",
  canPerform(PERMISSIONS.TASK_VIEW_OWN),
  getMyTasks
);

// ✅ Officer/Admin: Create and assign tasks to workers
router.post(
  "/",
  canPerform(PERMISSIONS.TASK_CREATE),
  validateRequest(schemas.taskCreate),
  createTask
);

// ✅ Worker: Update task status (accept/in_progress/completed)
router.patch(
  "/:id/status",
  canPerform(PERMISSIONS.TASK_UPDATE_STATUS),
  validateRequest(schemas.updateTaskStatus),
  updateTaskStatus
);

// ✅ Worker: Upload progress reports with images
router.post(
  "/:id/progress",
  canPerform(PERMISSIONS.TASK_ADD_PROGRESS),
  uploadImages("progressImages", 5),
  validateRequest(schemas.addTaskProgress),
  requireTaskAddProgressPayload,
  addTaskProgress
);

module.exports = router;

