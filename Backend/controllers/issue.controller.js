const mongoose = require("mongoose");
const Issue = require("../models/issue");
const Task = require("../models/task");
const Vote = require("../models/vote");
const User = require("../models/user");
const Comment = require("../models/comment");
const Notification = require("../models/notification");
const Resolution = require("../models/resolution");
const IdempotencyRecord = require("../models/idempotencyRecord");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_CATEGORIES, ISSUE_STATUS, ROLES } = require("../utils/constants");
const { getOrCreateDepartmentByCategory, normalizeCategory } = require("../services/routing.service");
const { recomputeIssuePriority } = require("../services/priority.service");
const { createNotificationsBulk, createNotification, notifyCitizenVerificationRequest } = require("../services/notification.service");
const { normalizeMulterFiles, persistUploadedFiles, deleteCloudinaryAssets } = require("../services/imageAsset.service");
const { assertIssueStatusChange, HANDLING_MODE } = require("../config/issueStatusMachine");
const { normalizeImageArray, collectCloudinaryIdsFromImages } = require("../utils/imageNormalize");
const appConfig = require("../config/appConfig");
const logger = require("../utils/logger");
const { logAudit } = require("../services/audit.service");

const TITLE_MAX = 120;
const DESC_MAX = 2000;
const VALID_STATUSES = new Set(Object.values(ISSUE_STATUS));
const CITIZEN_CORE_EDITABLE_STATUSES = new Set([ISSUE_STATUS.REPORTED]);
const TITLE_RE = /[a-zA-Z]/;

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildIssueSearchFilter(raw) {
  const term = String(raw || "").trim();
  if (!term) return null;
  const regex = new RegExp(escapeRegex(term), "i");
  return {
    $or: [
      { title: regex },
      { description: regex },
      { locationText: regex },
      { category: regex },
    ],
  };
}

function parseCoords(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}

function normalizeImageInput(rawImages) {
  if (Array.isArray(rawImages)) {
    return normalizeImageArray(rawImages);
  }

  if (typeof rawImages !== "string") return [];
  const trimmed = rawImages.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeImageArray(parsed);
      }
    } catch (_) {}
  }

  return normalizeImageArray(
    trimmed
      .split(",")
      .map((img) => img.trim())
      .filter(Boolean)
  );
}

function appendStatusHistory(issue, fromStatus, toStatus, userId, note = "") {
  if (!issue) return;
  issue.statusHistory = issue.statusHistory || [];
  issue.statusHistory.push({
    from: String(fromStatus || "unknown").trim(),
    to: String(toStatus || "").trim(),
    changedBy: userId,
    changedAt: new Date(),
    note: String(note || "").trim(),
  });
}

function auditCtx(req) {
  return {
    ip: req.ip || req.headers["x-forwarded-for"] || "",
    userAgent: String(req.headers["user-agent"] || "").slice(0, 512),
    requestPath: req.originalUrl || "",
    requestMethod: req.method || "",
  };
}

exports.createIssue = async (req, res) => {
  try {
    if (String(req.user?.role).toLowerCase() === ROLES.ADMIN) {
      return apiResponse(res, 403, "Admins cannot create issues");
    }

    const { title, description, category, severity, lat, lng, images = [], locationText } = req.body;

    if (!title || !description || !category || severity === undefined || lat === undefined || lng === undefined) {
      return apiResponse(res, 400, "Missing required fields");
    }

    const safeTitle = String(title).trim();
    const safeDesc = String(description).trim();
    const normalizedCategory = normalizeCategory(category);

    if (safeTitle.length < 3 || safeTitle.length > TITLE_MAX) {
      return apiResponse(res, 400, `Title must be 3-${TITLE_MAX} characters`);
    }
    if (!TITLE_RE.test(safeTitle)) {
      return apiResponse(res, 400, "Title must include at least one letter");
    }

    if (safeDesc.length < 10 || safeDesc.length > DESC_MAX) {
      return apiResponse(res, 400, `Description must be 10-${DESC_MAX} characters`);
    }

    if (!ISSUE_CATEGORIES.includes(normalizedCategory)) {
      return apiResponse(res, 400, "Invalid category");
    }

    const severityNum = Number(severity);
    if (![1, 2, 3, 4].includes(severityNum)) {
      return apiResponse(res, 400, "Severity must be between 1 and 5");
    }

    const coords = parseCoords(lat, lng);
    if (!coords) {
      return apiResponse(res, 400, "Invalid coordinates");
    }

    if (!locationText || !String(locationText).trim()) {
      return apiResponse(res, 400, "Location text is required");
    }

    const safeImages = normalizeImageInput(images);
    const uploadedFiles = normalizeMulterFiles(req, ["image", "images"]);
    let mergedImages = [...safeImages];
    if (uploadedFiles.length > 0) {
      const uploadedItems = await persistUploadedFiles(req, uploadedFiles, req.user?._id || null);
      mergedImages = [...uploadedItems, ...mergedImages];
    }
    mergedImages = normalizeImageArray(mergedImages).slice(0, 10);

    const location = { type: "Point", coordinates: [coords.longitude, coords.latitude] };

    const duplicate = await Issue.findOne({
      category: normalizedCategory,
      location: {
        $near: {
          $geometry: location,
          $maxDistance: 50,
        },
      },
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (duplicate) {
      return apiResponse(res, 409, "Similar issue already reported nearby");
    }

    const department = await getOrCreateDepartmentByCategory(normalizedCategory, location);

    const issue = await Issue.create({
      title: safeTitle,
      description: safeDesc,
      category: normalizedCategory,
      severity: severityNum,
      images: mergedImages,
      location,
      locationText: String(locationText).trim().slice(0, 200),
      reportedBy: req.user._id,
      assignedDepartment: department._id,
      status: ISSUE_STATUS.REPORTED,
      handlingMode: HANDLING_MODE.UNASSIGNED,
      statusHistory: [
        {
          from: "new",
          to: ISSUE_STATUS.REPORTED,
          changedBy: req.user._id,
          changedAt: new Date(),
          note: "Initial report",
        },
      ],
    });

    await recomputeIssuePriority(issue);
    await issue.save();

    if (req.idempotencyKey) {
      try {
        await IdempotencyRecord.create({ user: req.user._id, key: req.idempotencyKey, issue: issue._id });
      } catch (e) {
        if (e.code !== 11000) logger.warn("Idempotency record failed", { message: e.message });
      }
    }

    logAudit({
      issue: issue._id,
      user: req.user._id,
      action: "issue.create",
      resourceType: "issue",
      resourceId: issue._id,
      detail: "Issue created",
      ...auditCtx(req),
    });

    // Notify admins/officers about new issue intake.
    const reviewers = await User.find({ role: { $in: [ROLES.ADMIN, ROLES.OFFICER] }, isActive: true })
      .select("_id")
      .lean();
    await createNotificationsBulk(
      reviewers.map((u) => ({
        userId: u._id,
        title: "New civic issue reported",
        message: `${issue.title} reported in ${issue.locationText}`,
        issueId: issue._id,
      }))
    );

    return apiResponse(res, 201, "Issue created successfully", issue);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("CreateIssue Error:", error);
    return apiResponse(res, 500, "Failed to create issue");
  }
};

exports.updateIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    const isAdmin = req.user.role === ROLES.ADMIN;
    const isReporter = String(issue.reportedBy) === String(req.user._id);
    if (!isReporter && !isAdmin) {
      return apiResponse(res, 403, "You can only update your own issues");
    }

    const { title, description, category, severity, lat, lng, locationText, images } = req.body;

    const coreLocked = !CITIZEN_CORE_EDITABLE_STATUSES.has(issue.status);
    const attemptsCoreChange =
      category !== undefined || severity !== undefined || lat !== undefined || lng !== undefined;
    if (!isAdmin && coreLocked && attemptsCoreChange) {
      return apiResponse(
        res,
        403,
        "Category, location, and severity can no longer be changed because this issue is already being triaged or handled. Add a comment instead if you need to provide more context."
      );
    }

    if (title !== undefined) {
      const safeTitle = String(title).trim();
      if (safeTitle.length < 3 || safeTitle.length > TITLE_MAX) {
        return apiResponse(res, 400, `Title must be 3-${TITLE_MAX} characters`);
      }
      if (!TITLE_RE.test(safeTitle)) {
        return apiResponse(res, 400, "Title must include at least one letter");
      }
      issue.title = safeTitle;
    }

    if (description !== undefined) {
      const safeDesc = String(description).trim();
      if (safeDesc.length < 10 || safeDesc.length > DESC_MAX) {
        return apiResponse(res, 400, `Description must be 10-${DESC_MAX} characters`);
      }
      issue.description = safeDesc;
    }

    if (severity !== undefined) {
      const severityNum = Number(severity);
      if (![1, 2, 3, 4].includes(severityNum)) {
        return apiResponse(res, 400, "Severity must be between 1 and 5");
      }
      issue.severity = severityNum;
    }

    let categoryChanged = false;
    if (category !== undefined) {
      const normalizedCategory = normalizeCategory(category);
      if (!ISSUE_CATEGORIES.includes(normalizedCategory)) {
        return apiResponse(res, 400, "Invalid category");
      }
      issue.category = normalizedCategory;
      categoryChanged = true;
    }

    let locationChanged = false;
    if (lat !== undefined || lng !== undefined) {
      if (lat === undefined || lng === undefined) {
        return apiResponse(res, 400, "Both lat and lng are required when updating coordinates");
      }
      const coords = parseCoords(lat, lng);
      if (!coords) return apiResponse(res, 400, "Invalid coordinates");
      issue.location = { type: "Point", coordinates: [coords.longitude, coords.latitude] };
      locationChanged = true;
    }

    if (locationText !== undefined) {
      const safeLocationText = String(locationText).trim();
      if (!safeLocationText) return apiResponse(res, 400, "Location text is required");
      issue.locationText = safeLocationText.slice(0, 200);
    }

    if (images !== undefined) {
      issue.images = normalizeImageArray(normalizeImageInput(images));
    }

    const uploadedFiles = normalizeMulterFiles(req, ["image", "images"]);
    if (uploadedFiles.length > 0) {
      const uploadedItems = await persistUploadedFiles(req, uploadedFiles, req.user?._id || null);
      issue.images = normalizeImageArray([...(uploadedItems || []), ...(issue.images || [])]).slice(0, 10);
    }

    if (categoryChanged || locationChanged) {
      const department = await getOrCreateDepartmentByCategory(issue.category, issue.location);
      issue.assignedDepartment = department._id;
    }

    await recomputeIssuePriority(issue);
    await issue.save();

    return apiResponse(res, 200, "Issue updated", issue);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("UpdateIssue Error:", error);
    return apiResponse(res, 500, "Failed to update issue");
  }
};

exports.getIssues = async (req, res) => {
  try {
    const { category, status, search, lat, lng, radius = 2000, page = 1, limit = 20, sort = "priority" } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const allowedSorts = new Set(["priority", "-priority", "newest", "-newest", "voteCount", "-voteCount"]);
    const normalizedSort = String(sort || "priority").trim().toLowerCase();

    const filter = {};

    if (category) {
      const normalizedCategory = normalizeCategory(category);
      if (!ISSUE_CATEGORIES.includes(normalizedCategory)) {
        return apiResponse(res, 400, "Invalid category");
      }
      filter.category = normalizedCategory;
    }

    if (status) {
      filter.status = String(status).trim().toLowerCase();
    }

    const searchFilter = buildIssueSearchFilter(search);
    if (searchFilter) Object.assign(filter, searchFilter);

    if (lat !== undefined && lng !== undefined) {
      const coords = parseCoords(lat, lng);
      if (!coords) return apiResponse(res, 400, "Invalid coordinates");

      const maxDistance = Math.max(100, Number(radius) || 2000);
      filter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [coords.longitude, coords.latitude],
          },
          $maxDistance: maxDistance,
        },
      };
    }

    let query = Issue.find(filter)
      .populate("reportedBy", "_id name email")
      .populate("assignedDepartment", "_id name")
      .lean();

    // When not using geo-near sorting (which is distance-based), allow priority-based sorting.
    if (!filter.location) {
      if (normalizedSort === "newest" || normalizedSort === "-newest") {
        query = query.sort({ createdAt: -1 });
      } else if (normalizedSort === "voteCount" || normalizedSort === "-voteCount") {
        query = query.sort({ voteCount: normalizedSort.startsWith("-") ? -1 : 1, createdAt: -1 });
      } else {
        // Default: priority first, then newest.
        query = query.sort({ priorityScore: -1, createdAt: -1 });
      }

      query = query.skip(skip).limit(limitNum);
    } else {
      query = query.limit(limitNum);
    }

    const total = await Issue.countDocuments(filter);
    let issues = await query;

    if (req.user && issues.length > 0) {
      const issueIds = issues.map((i) => i._id);
      const votedIds = await Vote.find({ user: req.user._id, issue: { $in: issueIds } }).select("issue").lean();
      const votedSet = new Set(votedIds.map((v) => String(v.issue)));
      issues = issues.map((i) => ({ ...i, userVoted: votedSet.has(String(i._id)) }));
    }

    // Attach worker progress images (stored on Task) so issue cards/lists can render them.
    if (issues.length > 0) {
      const issueIds = issues.map((i) => i._id);
      const tasks = await Task.find({ issue: { $in: issueIds } })
        .select("issue progressImages")
        .lean();

      const map = new Map();
      for (const t of tasks) {
        const key = String(t.issue);
        const imgs = Array.isArray(t.progressImages)
          ? t.progressImages
              .map((p) => (typeof p === "string" ? p : p?.url))
              .filter(Boolean)
              .slice(0, 10)
          : [];
        if (!map.has(key)) map.set(key, imgs);
      }

      issues = issues.map((i) => ({
        ...i,
        workerProgressImages: map.get(String(i._id)) || [],
      }));
    }

    return apiResponse(res, 200, "Issues retrieved successfully", issues, {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("GetIssues Error:", error);
    return apiResponse(res, 500, "Failed to fetch issues");
  }
};

exports.getNearbyIssues = async (req, res) => {
  try {
    const { lat, lng, radius = 3000 } = req.query;
    const coords = parseCoords(lat, lng);
    if (!coords) {
      return apiResponse(res, 400, "lat and lng are required and must be valid");
    }

    const maxDistance = Math.max(100, Number(radius) || 3000);
    const issues = await Issue.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [coords.longitude, coords.latitude],
          },
          $maxDistance: maxDistance,
        },
      },
    })
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(200)
      .lean();

    return apiResponse(res, 200, "Nearby issues retrieved", issues);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Nearby issues error:", error);
    return apiResponse(res, 500, "Failed to fetch nearby issues");
  }
};

exports.getIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate("reportedBy", "name email")
      .populate("assignedDepartment", "name")
      .populate("assignedWorker", "name email workerId")
      .populate("volunteer", "name email");

    if (!issue) return apiResponse(res, 404, "Issue not found");

    // Populate images with _id and url for each image asset
    let images = [];
    if (Array.isArray(issue.images) && issue.images.length > 0) {
      const ids = issue.images
        .map(img => (img && typeof img === 'object' && img._id ? img._id : null))
        .filter(Boolean);
      if (ids.length > 0) {
        const assets = await require("../models/imageAsset").find({ _id: { $in: ids } }).select('_id url cloudinaryPublicId').lean();
        const assetMap = new Map(assets.map(a => [String(a._id), a]));
        images = issue.images.map(img => {
          if (img && typeof img === 'object' && img._id && assetMap.has(String(img._id))) {
            const asset = assetMap.get(String(img._id));
            return { _id: asset._id, url: asset.url, cloudinaryId: asset.cloudinaryPublicId };
          }
          if (typeof img === 'string') return { url: img };
          return img;
        });
      } else {
        images = issue.images.map(img => (typeof img === 'string' ? { url: img } : img));
      }
    }

    const task = await Task.findOne({ issue: issue._id }).select("status progressImages completionReport completedAt").lean();

    const mapImg = (p) => (typeof p === "string" ? p : p?.url);
    const workerProgressImages = Array.isArray(task?.progressImages)
      ? task.progressImages.map(mapImg).filter(Boolean)
      : [];

    let result = {
      ...issue.toObject(),
      images,
      workerProgressImages,
      workerTask: task || null,
    };
    if (req.user) {
      const voted = await Vote.findOne({ user: req.user._id, issue: req.params.id }).lean();
      result = { ...result, userVoted: !!voted };
    }

    return apiResponse(res, 200, "Issue retrieved successfully", result);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("GetIssue Error:", error);
    return apiResponse(res, 500, "Failed to fetch issue");
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const nextStatus = String(status || "").trim().toLowerCase();

    if (!nextStatus) {
      return apiResponse(res, 400, "Status is required");
    }
    if (!VALID_STATUSES.has(nextStatus)) {
      return apiResponse(res, 400, "Invalid status");
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    if (req.user.role === ROLES.OFFICER) {
      if (!req.user.department) {
        return apiResponse(res, 403, "Officer must belong to a department");
      }
      if (String(issue.assignedDepartment) !== String(req.user.department)) {
        return apiResponse(res, 403, "Officer can update status only for own department issues");
      }
    }

    const check = assertIssueStatusChange({ issue, nextStatus, user: req.user, context: {} });
    if (!check.ok) {
      return apiResponse(res, check.statusCode, check.message);
    }

    appendStatusHistory(issue, issue.status, nextStatus, req.user._id, "Status updated");
    logAudit({
      issue: issue._id,
      user: req.user._id,
      action: "issue.status_update",
      fromStatus: issue.status,
      targetStatus: nextStatus,
      detail: "Status updated through updateStatus endpoint",
      ...auditCtx(req),
    });

    issue.status = nextStatus;

    if ([ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY].includes(nextStatus)) {
      issue.resolvedAt = new Date();
      const deadline = new Date(Date.now() + appConfig.citizenVerificationDays * appConfig.dayMs);
      issue.verificationDeadline = deadline;
    }

    if (nextStatus === ISSUE_STATUS.CLOSED) {
      issue.closedAt = new Date();
    }

    await recomputeIssuePriority(issue);
    await issue.save();
    return apiResponse(res, 200, "Issue status updated", issue);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("UpdateStatus Error:", error);
    return apiResponse(res, 500, "Failed to update issue status");
  }
};

exports.verifyIssueResolution = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    if (String(issue.reportedBy) !== String(req.user._id) && req.user.role !== ROLES.ADMIN) {
      return apiResponse(res, 403, "Only reporting citizen or admin can verify resolution");
    }

    if (![ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY].includes(issue.status)) {
      return apiResponse(res, 400, "Issue cannot be verified in current status");
    }

    const vcheck = assertIssueStatusChange({
      issue,
      nextStatus: ISSUE_STATUS.CITIZEN_VERIFIED,
      user: req.user,
      context: { isReporter: String(issue.reportedBy) === String(req.user._id) },
    });
    if (!vcheck.ok) {
      return apiResponse(res, vcheck.statusCode, vcheck.message);
    }

    appendStatusHistory(issue, issue.status, ISSUE_STATUS.CITIZEN_VERIFIED, req.user._id, "Verified by citizen");
    logAudit({
      issue: issue._id,
      user: req.user._id,
      action: "issue.verify_resolution",
      fromStatus: issue.status,
      targetStatus: ISSUE_STATUS.CITIZEN_VERIFIED,
      detail: "Citizen resolution verification",
      ...auditCtx(req),
    });
    issue.status = ISSUE_STATUS.CITIZEN_VERIFIED;
    issue.verifiedByCitizen = true;
    issue.verificationDeadline = null;
    await issue.save();

    if (issue.volunteer) {
      await createNotification({
        userId: issue.volunteer,
        title: "Issue verified",
        message: "A citizen verified your community fix.",
        issueId: issue._id,
      });
    }

    if (issue.assignedWorker) {
      await createNotification({
        userId: issue.assignedWorker,
        title: "Issue verified",
        message: "A citizen verified the government resolution.",
        issueId: issue._id,
      });
    }

    return apiResponse(res, 200, "Issue verified by citizen", issue);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Verify issue error:", error);
    return apiResponse(res, 500, "Failed to verify issue");
  }
};

exports.rejectIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    if (![ISSUE_STATUS.REPORTED, ISSUE_STATUS.UNDER_REVIEW].includes(issue.status)) {
      return apiResponse(res, 400, "Issue can only be rejected while reported or under review");
    }

    const rj = assertIssueStatusChange({ issue, nextStatus: ISSUE_STATUS.REJECTED, user: req.user, context: {} });
    if (!rj.ok) {
      return apiResponse(res, rj.statusCode, rj.message);
    }

    appendStatusHistory(issue, issue.status, ISSUE_STATUS.REJECTED, req.user._id, "Issue rejected by officer/admin");
    logAudit({
      issue: issue._id,
      user: req.user._id,
      action: "issue.reject",
      fromStatus: issue.status,
      targetStatus: ISSUE_STATUS.REJECTED,
      detail: "Issue rejected",
      ...auditCtx(req),
    });

    issue.status = ISSUE_STATUS.REJECTED;
    await issue.save();

    return apiResponse(res, 200, 'Issue rejected', issue);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error('Reject issue error:', error);
    return apiResponse(res, 500, 'Failed to reject issue');
  }
};

exports.closeIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    if (![ISSUE_STATUS.CITIZEN_VERIFIED, ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY].includes(issue.status)) {
      return apiResponse(res, 400, "Issue must be in verify-ready state before closing");
    }

    const cl = assertIssueStatusChange({ issue, nextStatus: ISSUE_STATUS.CLOSED, user: req.user, context: {} });
    if (!cl.ok) {
      return apiResponse(res, cl.statusCode, cl.message);
    }

    appendStatusHistory(issue, issue.status, ISSUE_STATUS.CLOSED, req.user._id, "Issue closed");
    logAudit({
      issue: issue._id,
      user: req.user._id,
      action: "issue.close",
      fromStatus: issue.status,
      targetStatus: ISSUE_STATUS.CLOSED,
      detail: "Issue closed",
      ...auditCtx(req),
    });
    issue.status = ISSUE_STATUS.CLOSED;
    issue.closedAt = new Date();
    await issue.save();

    return apiResponse(res, 200, "Issue closed", issue);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Close issue error:", error);
    return apiResponse(res, 500, "Failed to close issue");
  }
};

exports.reopenIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    if (String(issue.reportedBy) !== String(req.user._id) && req.user.role !== ROLES.ADMIN) {
      return apiResponse(res, 403, "Only reporting citizen or admin can reopen issue");
    }

    if (issue.status !== ISSUE_STATUS.CLOSED) {
      return apiResponse(res, 400, "Issue can only be reopened from closed status");
    }

    const op = assertIssueStatusChange({
      issue,
      nextStatus: ISSUE_STATUS.REPORTED,
      user: req.user,
      context: { isReporter: String(issue.reportedBy) === String(req.user._id) },
    });
    if (!op.ok) {
      return apiResponse(res, op.statusCode, op.message);
    }

    appendStatusHistory(issue, issue.status, ISSUE_STATUS.REPORTED, req.user._id, "Issue reopened");
    logAudit({
      issue: issue._id,
      user: req.user._id,
      action: "issue.reopen",
      fromStatus: issue.status,
      targetStatus: ISSUE_STATUS.REPORTED,
      detail: "Issue reopened",
      ...auditCtx(req),
    });
    issue.status = ISSUE_STATUS.REPORTED;
    issue.verifiedByCitizen = false;
    issue.resolvedAt = null;
    issue.closedAt = null;
    issue.verificationDeadline = null;
    issue.handlingMode = HANDLING_MODE.UNASSIGNED;
    await issue.save();

    return apiResponse(res, 200, "Issue reopened", issue);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Reopen issue error:", error);
    return apiResponse(res, 500, "Failed to reopen issue");
  }
};

/** Admin: force-close when verification is impossible (e.g. reporter account gone). */
exports.forceCloseIssue = async (req, res) => {
  try {
    if (req.user.role !== ROLES.ADMIN) {
      return apiResponse(res, 403, "Admin only");
    }
    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    if (![ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY].includes(issue.status)) {
      return apiResponse(res, 400, "Force close applies only to resolved issues awaiting verification");
    }

    const check = assertIssueStatusChange({
      issue,
      nextStatus: ISSUE_STATUS.CLOSED,
      user: req.user,
      context: {},
    });
    if (!check.ok) {
      return apiResponse(res, check.statusCode, check.message);
    }

    appendStatusHistory(issue, issue.status, ISSUE_STATUS.CLOSED, req.user._id, "Force closed by admin");
    issue.status = ISSUE_STATUS.CLOSED;
    issue.closedAt = new Date();
    await issue.save();

    logAudit({
      issue: issue._id,
      user: req.user._id,
      action: "issue.force_close",
      resourceType: "issue",
      resourceId: issue._id,
      detail: "Admin force close",
      ...auditCtx(req),
    });

    return apiResponse(res, 200, "Issue force-closed", issue);
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Force close error:", error);
    return apiResponse(res, 500, "Failed to force-close issue");
  }
};

exports.deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    const isAdmin = req.user.role === ROLES.ADMIN;
    const isReporter = String(issue.reportedBy) === String(req.user._id);

    if (!isAdmin) {
      if (!isReporter) {
        return apiResponse(res, 403, "You can only delete your own issues");
      }

      // Citizens can delete their own issue in early stage and after full closure.
      if (![ISSUE_STATUS.REPORTED, ISSUE_STATUS.CLOSED].includes(issue.status)) {
        return apiResponse(res, 400, "Issue can only be deleted when reported or closed");
      }
    }

    const issueId = issue._id;

    const [tasks, comments, resolutions] = await Promise.all([
      Task.find({ issue: issueId }).select("progressImages").lean(),
      Comment.find({ issue: issueId }).select("images").lean(),
      Resolution.find({ issue: issueId }).select("proofImages").lean(),
    ]);

    const cloudinaryIds = [
      ...collectCloudinaryIdsFromImages(issue.images),
      ...collectCloudinaryIdsFromImages(issue.communityProof),
      ...tasks.flatMap((t) => collectCloudinaryIdsFromImages(t.progressImages)),
      ...comments.flatMap((c) => collectCloudinaryIdsFromImages(c.images)),
      ...resolutions.flatMap((r) => collectCloudinaryIdsFromImages(r.proofImages)),
    ];

    try {
      await deleteCloudinaryAssets(cloudinaryIds);
    } catch (e) {
      logger.warn("Cloudinary cleanup on issue delete", { message: e.message });
    }

    await Promise.all([
      Issue.deleteOne({ _id: issueId }),
      Vote.deleteMany({ issue: issueId }),
      Comment.deleteMany({ issue: issueId }),
      Task.deleteMany({ issue: issueId }),
      Notification.deleteMany({ issue: issueId }),
      Resolution.deleteMany({ issue: issueId }),
    ]);

    logAudit({
      issue: issueId,
      user: req.user._id,
      action: "issue.delete",
      resourceType: "issue",
      resourceId: issueId,
      detail: "Issue deleted",
      ...auditCtx(req),
    });

    return apiResponse(res, 200, "Issue deleted successfully");
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("DeleteIssue Error:", error);
    return apiResponse(res, 500, "Failed to delete issue");
  }
};
