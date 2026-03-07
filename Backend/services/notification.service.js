const Notification = require("../models/notification");

async function createNotification({ userId, title, message, issueId = null }) {
  return Notification.create({
    user: userId,
    title,
    message,
    issue: issueId || undefined,
  });
}

async function createNotificationsBulk(payloads) {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    return [];
  }
  const docs = payloads
    .filter((item) => item && item.userId && item.message)
    .map((item) => ({
      user: item.userId,
      title: item.title || "Civic update",
      message: item.message,
      issue: item.issueId || undefined,
    }));
  if (!docs.length) return [];
  return Notification.insertMany(docs, { ordered: false });
}

module.exports = {
  createNotification,
  createNotificationsBulk,
};
