const mongoose = require("mongoose");
const Issue = require("../models/issue");
const Task = require("../models/task");
const Vote = require("../models/vote");
const User = require("../models/user");
const Comment = require("../models/comment");
const Notification = require("../models/notification");
const ImageAsset = require("../models/imageAsset");
const AuditLog = require("../models/auditLog");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_CATEGORIES, ISSUE_STATUS, ROLES } = require("../utils/constants");
const { getOrCreateDepartmentByCategory, normalizeCategory } = require("../services/routing.service");
const { recomputeIssuePriority } = require("../services/priority.service");
const { createNotificationsBulk, createNotification, notifyCitizenVerificationRequest } = require("../services/notification.service");
const { normalizeMulterFiles, persistUploadedFiles } = require("../services/imageAsset.service");
const { canTransition } = require("../utils/statusFlow");

const TITLE_MAX = 120;
const DESC_MAX = 2000;
const VALID_STATUSES = new Set(Object.values(ISSUE_STATUS));
const CITIZEN_EDITABLE_STATUSES = new Set([ISSUE_STATUS.REPORTED, ISSUE_STATUS.UNDER_REVIEW]);
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

function extractImageAssetId(url) {
  if (!url) return null;
  const s = String(url);
  const marker = "/api/images/";
  const idx = s.indexOf(marker);
  if (idx === -1) return null;
  const tail = s.slice(idx + marker.length);
  const id = tail.split(/[?#/]/)[0];
  return id || null;
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
    return rawImages.filter((img) => typeof img === "string" && img.trim()).map((img) => img.trim());
  }

  if (typeof rawImages !== "string") return [];
  const trimmed = rawImages.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter((img) => typeof img === "string" && img.trim()).map((img) => img.trim());
      }
    } catch (_) {}
  }

  return trimmed
    .split(",")
    .map((img) => img.trim())
    .filter(Boolean);
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

async function createAuditLog(issueId, userId, action, fromStatus, toStatus, detail = "") {
  try {
    await AuditLog.create({
      issue: issueId,
      user: userId,
      action,
      fromStatus,
      targetStatus: toStatus,
      detail,
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
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
    if (uploadedFiles.length > 0) {
      const uploadedUrls = await persistUploadedFiles(req, uploadedFiles, req.user?._id || null);
      safeImages.unshift(...uploadedUrls);
    }

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
      images: safeImages,
      location,
      locationText: String(locationText).trim().slice(0, 200),
      reportedBy: req.user._id,
      assignedDepartment: department._id,
      status: ISSUE_STATUS.REPORTED,
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
    console.error("CreateIssue Error:", error);
    return apiResponse(res, 500, "Failed to create issue");
  }
};

exports.updateIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    if (String(issue.reportedBy) !== String(req.user._id)) {
      return apiResponse(res, 403, "You can only update your own issues");
    }

    if (!CITIZEN_EDITABLE_STATUSES.has(issue.status)) {
      return apiResponse(res, 400, "Issue can only be edited before assignment");
    }

    const { title, description, category, severity, lat, lng, locationText, images } = req.body;

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
      issue.images = normalizeImageInput(images);
    }

    const uploadedFiles = normalizeMulterFiles(req, ["image", "images"]);
    if (uploadedFiles.length > 0) {
      const uploadedUrls = await persistUploadedFiles(req, uploadedFiles, req.user?._id || null);
      issue.images = [...uploadedUrls, ...(issue.images || [])];
    }

    if (categoryChanged || locationChanged) {
      const department = await getOrCreateDepartmentByCategory(issue.category, issue.location);
      issue.assignedDepartment = department._id;
    }

    await recomputeIssuePriority(issue);
    await issue.save();

    return apiResponse(res, 200, "Issue updated", issue);
  } catch (error) {
    console.error("UpdateIssue Error:", error);
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
        const imgs = Array.isArray(t.progressImages) ? t.progressImages.filter(Boolean).slice(0, 10) : [];
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
    console.error("GetIssues Error:", error);
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
    console.error("Nearby issues error:", error);
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

    const task = await Task.findOne({ issue: issue._id }).select("status progressImages completionReport completedAt").lean();

    let result = {
      ...issue.toObject(),
      workerProgressImages: Array.isArray(task?.progressImages) ? task.progressImages.filter(Boolean) : [],
      workerTask: task || null,
    };
    if (req.user) {
      const voted = await Vote.findOne({ user: req.user._id, issue: req.params.id }).lean();
      result = { ...result, userVoted: !!voted };
    }

    return apiResponse(res, 200, "Issue retrieved successfully", result);
  } catch (error) {
    console.error("GetIssue Error:", error);
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

    // Citizen cannot change status from this endpoint
    if (req.user.role === ROLES.CITIZEN) {
      return apiResponse(res, 403, "Citizens are not allowed to change issue status");
    }

    // Officer restricted to own department issues
    if (req.user.role === ROLES.OFFICER) {
      if (!req.user.department) {
        return apiResponse(res, 403, "Officer must belong to a department");
      }
      if (String(issue.assignedDepartment) !== String(req.user.department)) {
        return apiResponse(res, 403, "Officer can update status only for own department issues");
      }
    }

    // Volunteer restrictions: community flow only
    if (req.user.role === ROLES.VOLUNTEER) {
      const volunteerAllowed = new Set([
        ISSUE_STATUS.VOLUNTEER_CLAIMED,
        ISSUE_STATUS.COMMUNITY_FIX_IN_PROGRESS,
        ISSUE_STATUS.RESOLVED_BY_COMMUNITY,
        ISSUE_STATUS.CITIZEN_VERIFIED,
        ISSUE_STATUS.CLOSED,
      ]);
      if (!volunteerAllowed.has(nextStatus)) {
        return apiResponse(res, 403, "Volunteer can only update community-flow statuses");
      }
      if (String(issue.volunteer) !== String(req.user._id)) {
        return apiResponse(res, 403, "Volunteer can only update their claimed issue");
      }
    }

    // Validate transition according to workflow graph (same for all roles)
    if (!canTransition(issue.status, nextStatus)) {
      return apiResponse(res, 400, `Invalid transition from ${issue.status} to ${nextStatus}`);
    }

    appendStatusHistory(issue, issue.status, nextStatus, req.user._id, 'Status updated');
    await createAuditLog(issue._id, req.user._id, 'status_update', issue.status, nextStatus, 'Status updated through updateStatus endpoint');

    issue.status = nextStatus;

    if ([ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY].includes(nextStatus)) {
      issue.resolvedAt = new Date();
    }

    if (nextStatus === ISSUE_STATUS.CLOSED) {
      issue.closedAt = new Date();
    }

    await issue.save();
    return apiResponse(res, 200, "Issue status updated", issue);
  } catch (error) {
    console.error("UpdateStatus Error:", error);
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

    if (!canTransition(issue.status, ISSUE_STATUS.CITIZEN_VERIFIED)) {
      return apiResponse(res, 400, `Invalid transition from ${issue.status} to ${ISSUE_STATUS.CITIZEN_VERIFIED}`);
    }

    appendStatusHistory(issue, issue.status, ISSUE_STATUS.CITIZEN_VERIFIED, req.user._id, 'Verified by citizen');
    await createAuditLog(issue._id, req.user._id, 'verify_resolution', issue.status, ISSUE_STATUS.CITIZEN_VERIFIED, 'Citizen resolution verification');
    issue.status = ISSUE_STATUS.CITIZEN_VERIFIED;
    issue.verifiedByCitizen = true;
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
    console.error("Verify issue error:", error);
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

    if (!canTransition(issue.status, ISSUE_STATUS.REJECTED)) {
      return apiResponse(res, 400, `Invalid transition from ${issue.status} to ${ISSUE_STATUS.REJECTED}`);
    }

    appendStatusHistory(issue, issue.status, ISSUE_STATUS.REJECTED, req.user._id, 'Issue rejected by officer/admin');
    await createAuditLog(issue._id, req.user._id, 'reject_issue', issue.status, ISSUE_STATUS.REJECTED, 'Issue rejected');

    issue.status = ISSUE_STATUS.REJECTED;
    await issue.save();

    return apiResponse(res, 200, 'Issue rejected', issue);
  } catch (error) {
    console.error('Reject issue error:', error);
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

    if (!canTransition(issue.status, ISSUE_STATUS.CLOSED)) {
      return apiResponse(res, 400, `Invalid transition from ${issue.status} to ${ISSUE_STATUS.CLOSED}`);
    }

    appendStatusHistory(issue, issue.status, ISSUE_STATUS.CLOSED, req.user._id, 'Issue closed');
    await createAuditLog(issue._id, req.user._id, 'close_issue', issue.status, ISSUE_STATUS.CLOSED, 'Issue closed by user');
    issue.status = ISSUE_STATUS.CLOSED;
    issue.closedAt = new Date();
    await issue.save();

    return apiResponse(res, 200, "Issue closed", issue);
  } catch (error) {
    console.error("Close issue error:", error);
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

    if (!canTransition(issue.status, ISSUE_STATUS.REPORTED)) {
      return apiResponse(res, 400, `Invalid transition from ${issue.status} to ${ISSUE_STATUS.REPORTED}`);
    }

    appendStatusHistory(issue, issue.status, ISSUE_STATUS.REPORTED, req.user._id, 'Issue reopened');
    await createAuditLog(issue._id, req.user._id, 'reopen_issue', issue.status, ISSUE_STATUS.REPORTED, 'Issue reopened by user');
    issue.status = ISSUE_STATUS.REPORTED;
    issue.verifiedByCitizen = false;
    issue.resolvedAt = null;
    issue.closedAt = null;
    await issue.save();

    return apiResponse(res, 200, "Issue reopened", issue);
  } catch (error) {
    console.error("Reopen issue error:", error);
    return apiResponse(res, 500, "Failed to reopen issue");
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

    // Collect image assets for best-effort cleanup so we don't leave broken media around.
    const [tasks, comments] = await Promise.all([
      Task.find({ issue: issueId }).select("progressImages").lean(),
      Comment.find({ issue: issueId }).select("images").lean(),
    ]);

    const candidateUrls = [
      ...(Array.isArray(issue.images) ? issue.images : []),
      ...(Array.isArray(issue.communityProof) ? issue.communityProof : []),
      ...tasks.flatMap((t) => (Array.isArray(t?.progressImages) ? t.progressImages : [])),
      ...comments.flatMap((c) => (Array.isArray(c?.images) ? c.images : [])),
    ]
      .map((u) => String(u || "").trim())
      .filter(Boolean);

    const assetIds = Array.from(
      new Set(candidateUrls.map(extractImageAssetId).filter((id) => id && mongoose.Types.ObjectId.isValid(id)))
    );

    await Promise.all([
      Issue.deleteOne({ _id: issueId }),
      Vote.deleteMany({ issue: issueId }),
      Comment.deleteMany({ issue: issueId }),
      Task.deleteMany({ issue: issueId }),
      Notification.deleteMany({ issue: issueId }),
    ]);

    if (assetIds.length > 0) {
      await ImageAsset.deleteMany({ _id: { $in: assetIds } });
    }

    return apiResponse(res, 200, "Issue deleted successfully");
  } catch (error) {
    console.error("DeleteIssue Error:", error);
    return apiResponse(res, 500, "Failed to delete issue");
  }
};
