const IdempotencyRecord = require("../models/idempotencyRecord");
const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");
const appConfig = require("../config/appConfig");

const rateWindowMs = appConfig.issueCreateRateLimitWindowMinutes * 60 * 1000;
const rateBuckets = new Map();

function issueCreateRateLimit(req, res, next) {
  const uid = String(req.user?._id || "");
  if (!uid) return next();

  const now = Date.now();
  const windowStart = now - rateWindowMs;
  let arr = rateBuckets.get(uid) || [];
  arr = arr.filter((t) => t > windowStart);
  if (arr.length >= appConfig.issueCreateRateLimitMax) {
    return apiResponse(
      res,
      429,
      `You are creating issues too quickly. Please wait up to ${appConfig.issueCreateRateLimitWindowMinutes} minutes before submitting another report.`
    );
  }
  arr.push(now);
  rateBuckets.set(uid, arr);
  return next();
}

async function issueCreateIdempotency(req, res, next) {
  const key =
    (req.headers["x-idempotency-key"] && String(req.headers["x-idempotency-key"]).trim()) ||
    (req.body?.idempotencyKey && String(req.body.idempotencyKey).trim()) ||
    "";

  if (!key) {
    req.idempotencyKey = null;
    return next();
  }

  try {
    const existing = await IdempotencyRecord.findOne({ user: req.user._id, key });
    if (existing?.issue) {
      const issue = await Issue.findById(existing.issue);
      if (issue) {
        return apiResponse(res, 200, "Issue already submitted (duplicate request)", issue);
      }
    }
    req.idempotencyKey = key;
  } catch (e) {
    req.idempotencyKey = key;
  }
  return next();
}

module.exports = { issueCreateRateLimit, issueCreateIdempotency };
