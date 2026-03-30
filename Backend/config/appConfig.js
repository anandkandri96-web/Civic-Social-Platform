/**
 * Centralized environment-driven configuration with documented defaults.
 * No secrets here — only reads process.env.
 */

const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

function num(envKey, fallback) {
  const v = process.env[envKey];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(envKey, fallback) {
  const v = process.env[envKey];
  if (v === undefined || v === "") return fallback;
  return String(v).toLowerCase() === "true" || v === "1";
}

module.exports = Object.freeze({
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",

  clientUrl: process.env.CLIENT_URL || "",

  jwtSecret: process.env.JWT_SECRET,

  /** Volunteer claim expires if still in volunteer_claimed (not yet in progress). */
  volunteerClaimTtlHours: num("VOLUNTEER_CLAIM_TTL_HOURS", 72),

  /** After resolution, citizen must verify within this window or issue auto-closes. */
  citizenVerificationDays: num("CITIZEN_VERIFICATION_DAYS", 7),

  /** Idempotency key TTL for duplicate issue submission (same user + key). */
  issueIdempotencyTtlMinutes: num("ISSUE_IDEMPOTENCY_TTL_MINUTES", 15),

  /** Soft rate limit: max issues per user within window. */
  issueCreateRateLimitMax: num("ISSUE_CREATE_RATE_LIMIT_MAX", 5),
  issueCreateRateLimitWindowMinutes: num("ISSUE_CREATE_RATE_LIMIT_WINDOW_MINUTES", 10),

  /** Escalation cron schedule */
  escalationCron: process.env.ESCALATION_CRON || "0 * * * *",

  /** API base URL for static uploads fallback (no Cloudinary) */
  publicApiBaseUrl: process.env.PUBLIC_API_BASE_URL || "",

  /** Priority: max age factor in hours (matches priority.service cap) */
  priorityMaxAgeHours: num("PRIORITY_MAX_AGE_HOURS", 168),

  hourMs,
  dayMs,
});
