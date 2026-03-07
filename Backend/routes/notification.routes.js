const router = require("express").Router();
const { protect } = require("../middlewares/auth.middleware");
const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notification.controller");

router.use(protect);
router.get("/", getNotifications);
router.patch("/:id/read", markNotificationRead);
router.patch("/read-all", markAllNotificationsRead);

module.exports = router;
