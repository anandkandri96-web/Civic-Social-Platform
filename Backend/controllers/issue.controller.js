// backend/controllers/issue.controller.js

const Issue = require("../models/issue");
const Vote = require("../models/vote");
const { apiResponse } = require("../utils/apiResponse");

const CATEGORY_ENUM = ["ROADS", "ELECTRICITY", "GARBAGE", "DRAINAGE", "OTHER"];
const STATUS_ENUM = ["pending", "assigned", "resolved"];
const TITLE_MAX = 120;
const DESC_MAX = 2000;

function buildPublicFileUrl(req, relativePath) {
  // relativePath should be like: /uploads/issues/<file>
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  return `${proto}://${req.get("host")}${relativePath}`;
}

// ----------------------------------------------------
// CREATE ISSUE
// ----------------------------------------------------
exports.createIssue = async (req, res) => {
  try {
    if (req.user?.role && String(req.user.role).toLowerCase() === "admin") {
      return apiResponse(res, 403, "Admins cannot create issues");
    }

    const {
      title,
      description,
      category,
      severity,
      lat,
      lng,
      images = [],
      locationText,
    } = req.body;

    // Required field validation
    if (
      !title ||
      !description ||
      !category ||
      severity === undefined ||
      lat === undefined ||
      lng === undefined
    ) {
      return apiResponse(res, 400, "Missing required fields");
    }
    if (!locationText || !String(locationText).trim()) {
      return apiResponse(res, 400, "Location (manual) is required");
    }
    const safeTitle = String(title).trim();
    const safeDesc = String(description).trim();
    if (safeTitle.length < 3 || safeTitle.length > TITLE_MAX) {
      return apiResponse(res, 400, `Title must be 3-${TITLE_MAX} characters`);
    }
    if (safeDesc.length < 10 || safeDesc.length > DESC_MAX) {
      return apiResponse(res, 400, `Description must be 10-${DESC_MAX} characters`);
    }

    // Severity validation
    const severityNum = Number(severity);
    if (![1, 2, 3, 4, 5].includes(severityNum)) {
      return apiResponse(res, 400, "Severity must be between 1 and 5");
    }

    // Category validation
    if (!CATEGORY_ENUM.includes(String(category))) {
      return apiResponse(res, 400, "Invalid category");
    }

    // Coordinate validation
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return apiResponse(res, 400, "Invalid coordinates");
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return apiResponse(res, 400, "Coordinates out of range");
    }

    // Image validation (legacy base64 / URL strings)
    if (!Array.isArray(images)) {
      return apiResponse(res, 400, "Images must be an array");
    }

    const safeImages = images.filter(
      (img) => typeof img === "string" && img.length > 0
    );

    // Uploaded file (preferred)
    if (req.file?.filename) {
      const rel = `/uploads/issues/${req.file.filename}`;
      safeImages.unshift(buildPublicFileUrl(req, rel));
    }

    const location = {
      type: "Point",
      coordinates: [longitude, latitude],
    };

    // Duplicate prevention (50m, 24h)
    const duplicate = await Issue.findOne({
      category,
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

    const issue = await Issue.create({
      title: safeTitle,
      description: safeDesc,
      category,
      severity: severityNum,
      images: safeImages,
      location,
      locationText: String(locationText).trim().slice(0, 200),
      reportedBy: req.user._id,
    });

    return apiResponse(res, 201, "Issue created successfully", issue);
  } catch (error) {
    console.error("CreateIssue Error:", error);
    return apiResponse(res, 500, "Failed to create issue");
  }
};

// ----------------------------------------------------
// GET ALL ISSUES
// ----------------------------------------------------
exports.getIssues = async (req, res) => {
  try {
    const { category, status, search, lat, lng, radius = 2000 } = req.query;
    const filter = {};

    if (category) {
      if (!CATEGORY_ENUM.includes(String(category))) {
        return apiResponse(res, 400, "Invalid category");
      }
      filter.category = category;
    }

    if (status) {
      if (!STATUS_ENUM.includes(String(status))) {
        return apiResponse(res, 400, "Invalid status");
      }
      filter.status = status;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    if (lat && lng) {
      filter.location = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: Number(radius),
        },
      };
    }

   let query = Issue.find(filter)
  .populate("reportedBy", "_id name email")
  .lean();

if (!filter.location) {
  query = query.sort({ createdAt: -1 });
}

let issues = await query;

    if (req.user && issues.length > 0) {
      const issueIds = issues.map((i) => i._id);
      const votedIds = await Vote.find({
        user: req.user._id,
        issue: { $in: issueIds },
      })
        .select("issue")
        .lean();
      const votedSet = new Set(votedIds.map((v) => String(v.issue)));
      issues = issues.map((i) => ({
        ...i,
        userVoted: votedSet.has(String(i._id)),
      }));
    }

    return apiResponse(res, 200, "Issues retrieved successfully", issues);
  } catch (error) {
    console.error("GetIssues Error:", error);
    return apiResponse(res, 500, "Failed to fetch issues");
  }
};

// ----------------------------------------------------
// GET SINGLE ISSUE
// ----------------------------------------------------
exports.getIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id).populate(
      "reportedBy",
      "name email"
    );

    if (!issue) return apiResponse(res, 404, "Issue not found");

    let result = issue.toObject ? issue.toObject() : issue;
    if (req.user) {
      const voted = await Vote.findOne({
        user: req.user._id,
        issue: req.params.id,
      });
      result = { ...result, userVoted: !!voted };
    }

    return apiResponse(res, 200, "Issue retrieved successfully", result);
  } catch (error) {
    console.error("GetIssue Error:", error);
    return apiResponse(res, 500, "Failed to fetch issue");
  }
};

// ----------------------------------------------------
// UPDATE ISSUE STATUS (ADMIN)
// ----------------------------------------------------
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "assigned", "resolved"].includes(status)) {
      return apiResponse(res, 400, "Invalid status value");
    }

    const issue = await Issue.findByIdAndUpdate(
      req.params.id,
      {
        status,
        resolvedAt: status === "resolved" ? new Date() : null,
      },
      { new: true }
    );

    if (!issue) return apiResponse(res, 404, "Issue not found");

    return apiResponse(res, 200, "Issue status updated", issue);
  } catch (error) {
    console.error("UpdateStatus Error:", error);
    return apiResponse(res, 500, "Failed to update issue status");
  }
};

// ----------------------------------------------------
// DELETE ISSUE (admin: any; user: own only)
// ----------------------------------------------------
exports.deleteIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return apiResponse(res, 404, "Issue not found");

    const isAdmin = req.user.role && req.user.role.toLowerCase() === "admin";
    const isReporter =
      issue.reportedBy && String(issue.reportedBy) === String(req.user._id);

    if (!isAdmin && !isReporter) {
      return apiResponse(res, 403, "You can only delete your own issues");
    }

    await Issue.findByIdAndDelete(req.params.id);
    return apiResponse(res, 200, "Issue deleted successfully");
  } catch (error) {
    console.error("DeleteIssue Error:", error);
    return apiResponse(res, 500, "Failed to delete issue");
  }
};
