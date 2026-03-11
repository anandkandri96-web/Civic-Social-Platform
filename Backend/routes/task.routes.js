const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const { uploadImages } = require("../middlewares/upload.middleware");
const { ROLES } = require("../utils/constants");
const {
  createTask,
  getMyTasks,
  updateTaskStatus,
  addTaskProgress,
} = require("../controllers/task.controller");

router.use(protect);

// Worker: list own tasks
router.get("/my", checkRole([ROLES.WORKER]), getMyTasks);

// Officer/Admin: create/assign a task for an issue
router.post("/", checkRole([ROLES.OFFICER, ROLES.ADMIN]), createTask);

// Worker: update task status (accept / in_progress / completed / complication_reported)
router.patch("/:id/status", checkRole([ROLES.WORKER]), updateTaskStatus);

// Worker: upload progress images / reports
router.post("/:id/progress", checkRole([ROLES.WORKER]), uploadImages("progressImages", 5), addTaskProgress);

module.exports = router;

