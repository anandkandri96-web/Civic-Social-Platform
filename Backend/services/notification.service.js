const Notification = require("../models/notification");
const User = require("../models/user");
const { ROLES } = require("../utils/constants");

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

async function notifyVolunteerClaimed(issue, volunteer) {
  // Notify the citizen who reported the issue
  await createNotification({
    userId: issue.reportedBy,
    title: "Volunteer claimed your issue",
    message: "A volunteer has claimed your reported issue for community resolution.",
    issueId: issue._id,
  });
}

async function notifyWorkerAssigned(issue, worker) {
  // Notify the assigned worker
  await createNotification({
    userId: worker._id,
    title: "New task assigned",
    message: `You have been assigned to work on: ${issue.title}`,
    issueId: issue._id,
  });

  // Notify officers in the same department
  const officers = await User.find({
    role: ROLES.OFFICER,
    department: issue.assignedDepartment,
    isActive: true,
  }).select("_id");

  if (officers.length > 0) {
    await createNotificationsBulk(
      officers.map((officer) => ({
        userId: officer._id,
        title: "Worker assigned to issue",
        message: `${worker.name} has been assigned to work on: ${issue.title}`,
        issueId: issue._id,
      }))
    );
  }
}

async function notifyCitizenVerificationRequest(issue) {
  // Notify the citizen that verification is needed
  await createNotification({
    userId: issue.reportedBy,
    title: "Issue resolution verification needed",
    message: "Your reported issue has been marked as resolved. Please verify the resolution.",
    issueId: issue._id,
  });
}

async function notifyIssueEscalated(issue, level) {
  // Notify admins and officers
  const adminsAndOfficers = await User.find({
    role: { $in: [ROLES.ADMIN, ROLES.OFFICER] },
    isActive: true,
  }).select("_id");

  if (adminsAndOfficers.length > 0) {
    await createNotificationsBulk(
      adminsAndOfficers.map((user) => ({
        userId: user._id,
        title: `Issue escalated (Level ${level})`,
        message: `${issue.title} has been escalated to priority level ${level}`,
        issueId: issue._id,
      }))
    );
  }
}

async function notifyIssueResolved(issue, resolverType) {
  const resolverMessage = resolverType === "worker"
    ? "Your reported issue has been resolved by a government worker."
    : "Your reported issue has been resolved by community volunteers.";

  await createNotification({
    userId: issue.reportedBy,
    title: "Issue resolved",
    message: resolverMessage,
    issueId: issue._id,
  });
}

module.exports = {
  createNotification,
  createNotificationsBulk,
  notifyVolunteerClaimed,
  notifyWorkerAssigned,
  notifyCitizenVerificationRequest,
  notifyIssueEscalated,
  notifyIssueResolved,
};
