// const Notification = require('../models/Notification');
// const { io } = require('../config/socket');

// exports.createNotification = async (userId, message, type, location) => {
//   const notification = new Notification({ user: userId, message, type, location });
//   await notification.save();
//   io.to(userId).emit('notification:new', notification);
//   return notification;
// };