const Notification = require("../models/notification");
const { apiResponse } = require("../utils/apiResponse");

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { user: req.user._id };
    if (String(unreadOnly).toLowerCase() === "true") {
      filter.read = false;
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate("issue", "_id title status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);

    return apiResponse(res, 200, "Notifications retrieved", items, {
      total,
      page: pageNum,
      limit: limitNum,
      unreadCount,
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return apiResponse(res, 500, "Failed to fetch notifications");
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true } },
      { new: true }
    );

    if (!notification) {
      return apiResponse(res, 404, "Notification not found");
    }

    return apiResponse(res, 200, "Notification marked as read", notification);
  } catch (error) {
    console.error("Mark notification read error:", error);
    return apiResponse(res, 500, "Failed to update notification");
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true } }
    );

    return apiResponse(res, 200, "All notifications marked as read", {
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return apiResponse(res, 500, "Failed to update notifications");
  }
};
