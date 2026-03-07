const Issue = require("../models/issue");
const Vote = require("../models/vote");
const { apiResponse } = require("../utils/apiResponse");
const { ISSUE_CATEGORIES, ISSUE_STATUS, ROLES } = require("../utils/constants");
const { getOrCreateDepartmentByCategory, normalizeCategory } = require("../services/routing.service");
const { recomputeIssuePriority } = require("../services/priority.service");

const TITLE_MAX = 120;
const DESC_MAX = 2000;

function buildPublicFileUrl(req, relativePath) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.get("host")}${relativePath}`;
}

function parseCoords(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
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

    if (safeDesc.length < 10 || safeDesc.length > DESC_MAX) {
      return apiResponse(res, 400, `Description must be 10-${DESC_MAX} characters`);
    }

    if (!ISSUE_CATEGORIES.includes(normalizedCategory)) {
      return apiResponse(res, 400, "Invalid category");
    }

    const severityNum = Number(severity);
    if (![1, 2, 3, 4, 5].includes(severityNum)) {
      return apiResponse(res, 400, "Severity must be between 1 and 5");
    }

    const coords = parseCoords(lat, lng);
    if (!coords) {
      return apiResponse(res, 400, "Invalid coordinates");
    }

    if (!locationText || !String(locationText).trim()) {
      return apiResponse(res, 400, "Location text is required");
    }

    if (!Array.isArray(images)) {
      return apiResponse(res, 400, "Images must be an array");
    }

    const safeImages = images.filter((img) => typeof img === "string" && img.length > 0);

    if (req.file?.filename) {
      const rel = `/uploads/issues/${req.file.filename}`;
      safeImages.unshift(buildPublicFileUrl(req, rel));
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

    const department = await getOrCreateDepartmentByCategory(normalizedCategory);

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
    });

    await recomputeIssuePriority(issue);
    await issue.save();

    return apiResponse(res, 201, "Issue created successfully", issue);
  } catch (error) {
    console.error("CreateIssue Error:", error);
    return apiResponse(res, 500, "Failed to create issue");
  }
};

exports.getIssues = async (req, res) => {
  try {
    const { category, status, search, lat, lng, radius = 2000 } = req.query;
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

    if (search) {
      filter.$text = { $search: String(search).trim() };
    }

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

    if (!filter.location) {
      query = query.sort({ createdAt: -1 });
    }

    let issues = await query;

    if (req.user && issues.length > 0) {
      const issueIds = issues.map((i) => i._id);
      const votedIds = await Vote.find({ user: req.user._id, issue: { $in: issueIds } }).select("issue").lean();
      const votedSet = new Set(votedIds.map((v) => String(v.issue)));
      issues = issues.map((i) => ({ ...i, userVoted: votedSet.has(String(i._id)) }));
    }

    return apiResponse(res, 200, "Issues retrieved successfully", issues);
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
      .populate("assignedWorker", "name email")
      .populate("volunteer", "name email");

    if (!issue) return apiResponse(res, 404, "Issue not found");

    let result = issue.toObject();
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

    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

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

    if (String(issue.reportedBy) !== String(req.user._id)) {
      return apiResponse(res, 403, "Only reporting citizen can verify resolution");
    }

    if (![ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY].includes(issue.status)) {
      return apiResponse(res, 400, "Issue cannot be verified in current status");
    }

    issue.status = ISSUE_STATUS.CITIZEN_VERIFIED;
    issue.verifiedByCitizen = true;
    await issue.save();

    return apiResponse(res, 200, "Issue verified by citizen", issue);
  } catch (error) {
    console.error("Verify issue error:", error);
    return apiResponse(res, 500, "Failed to verify issue");
  }
};

exports.closeIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

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

    if (String(issue.reportedBy) !== String(req.user._id)) {
      return apiResponse(res, 403, "Only reporting citizen can reopen issue");
    }

    if (![ISSUE_STATUS.RESOLVED, ISSUE_STATUS.RESOLVED_BY_COMMUNITY, ISSUE_STATUS.CLOSED].includes(issue.status)) {
      return apiResponse(res, 400, "Issue cannot be reopened in current status");
    }

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

      if (issue.status !== ISSUE_STATUS.REPORTED) {
        return apiResponse(res, 400, "Issue cannot be deleted after workflow has started");
      }
    }

    await Issue.findByIdAndDelete(req.params.id);
    await Vote.deleteMany({ issue: req.params.id });

    return apiResponse(res, 200, "Issue deleted successfully");
  } catch (error) {
    console.error("DeleteIssue Error:", error);
    return apiResponse(res, 500, "Failed to delete issue");
  }
};