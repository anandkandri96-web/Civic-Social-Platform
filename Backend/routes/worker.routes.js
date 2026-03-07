const router = require("express").Router();
const { protect, checkRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../utils/constants");
const { getMyTasks, acceptTask, updateTaskProgress } = require("../controllers/worker.controller");

router.use(protect, checkRole([ROLES.WORKER]));

router.get("/tasks", getMyTasks);
router.patch("/tasks/:taskId/accept", acceptTask);
router.patch("/tasks/:taskId/progress", updateTaskProgress);

module.exports = router;