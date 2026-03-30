const appConfig = require("../config/appConfig");

/**
 * Explicit priority score: votes, severity, age since creation, optional escalation boost.
 * Higher = more urgent. Tuned for sort descending on issue lists.
 */
function calculatePriorityScore({ severity, voteCount, createdAt, escalated }) {
  const sev = Math.min(4, Math.max(1, Number(severity) || 1));
  const votes = Math.max(0, Number(voteCount) || 0);
  const created = new Date(createdAt).getTime();
  const safeCreated = Number.isFinite(created) ? created : Date.now();
  const ageHours = Math.max(0, (Date.now() - safeCreated) / (1000 * 60 * 60));
  const maxAge = appConfig.priorityMaxAgeHours || 168;
  const ageFactor = Math.min(Number.isFinite(ageHours) ? ageHours : 0, maxAge);

  const severityPoints = sev * 25;
  const votePoints = votes * 4;
  const agePoints = ageFactor * 1.2;
  const escalationBonus = escalated ? 35 : 0;

  const total = severityPoints + votePoints + agePoints + escalationBonus;
  return Number.isFinite(total) ? Math.round(total) : 0;
}

module.exports = { calculatePriorityScore };
