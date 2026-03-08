const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const { uploadImages } = require("../middlewares/upload.middleware");
const { ROLES } = require("../utils/constants");
const {
  assignTask,
  getWorkerTasks,
  updateTaskProgress,
  completeTask,
} = require("../controllers/task.controller");

router.use(protect);

// Officer/Admin can assign tasks
router.post("/assign", checkRole([ROLES.OFFICER, ROLES.ADMIN]), assignTask);

// Workers can view their tasks, officers/admins can view any
router.get("/worker/:workerId", checkRole([ROLES.WORKER, ROLES.OFFICER, ROLES.ADMIN]), getWorkerTasks);

// Workers can update progress
router.patch("/:taskId/progress", checkRole([ROLES.WORKER]), uploadImages("progressImages", 5), updateTaskProgress);

// Workers can complete tasks
router.patch("/:taskId/complete", checkRole([ROLES.WORKER]), uploadImages("completionImages", 5), completeTask);

module.exports = router;