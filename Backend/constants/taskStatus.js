/** Task document status enum — keep in sync with models/task.js */
const TASK_STATUSES = Object.freeze([
  "assigned",
  "accepted",
  "in_progress",
  "completed",
  "complication_reported",
]);

module.exports = { TASK_STATUSES };
