// // backend/services/geo.service.js

// const User = require("../models/user");
// const Notification = require("../models/Notification");
// const socketManager = require("../config/socket");

// const NOTIFICATION_RADIUS = Number(process.env.NOTIFICATION_RADIUS || 2000); // meters

// /**
//  * Notify users near a newly reported issue
//  */
// exports.notifyNearbyUsers = async (issue) => {
//   try {
//     const users = await User.find({
//       _id: { $ne: issue.reportedBy }, // exclude reporter
//       location: {
//         $near: {
//           $geometry: issue.location,
//           $maxDistance: NOTIFICATION_RADIUS,
//         },
//       },
//     }).select("_id");

//     if (!users.length) return;

//     const notifications = users.map((user) => ({
//       user: user._id,
//       message: `New issue reported near you: ${issue.title}`,
//     }));

//     // Bulk insert for performance
//     const savedNotifications = await Notification.insertMany(notifications);

//     // Emit real-time notifications
//     if (socketManager?.io) {
//       savedNotifications.forEach((notification) => {
//         socketManager.io
//           .to(notification.user.toString())
//           .emit("notification:new", notification);
//       });
//     }
//   } catch (error) {
//     console.error("Geo Notification Error:", error);
//   }
// };
