const Issue = require("../models/issue");
const User = require("../models/user");
const { apiResponse } = require("../utils/apiResponse");

exports.getStats = async (_req, res) => {
  try {
    const [totalIssues, totalUsers, statusBreakdown, avgResolution] = await Promise.all([
      Issue.countDocuments(),
      User.countDocuments(),
      Issue.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Issue.aggregate([
        {
          $match: {
            status: { $in: ["resolved", "resolved_by_community", "closed"] },
            resolvedAt: { $ne: null },
          },
        },
        {
          $project: {
            resolutionHours: {
              $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60],
            },
          },
        },
        { $group: { _id: null, avgHours: { $avg: "$resolutionHours" } } },
      ]),
    ]);

    return apiResponse(res, 200, "Admin stats retrieved", {
      totalIssues,
      totalUsers,
      statusBreakdown,
      avgResolutionHours: avgResolution[0]?.avgHours || 0,
    });
  } catch (error) {
    console.error("Admin Stats Error:", error);
    return apiResponse(res, 500, "Failed to load admin stats");
  }
};

exports.getAllIssues = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, category, sort = "-createdAt" } = req.query;

    const filter = {};
    if (status) filter.status = String(status).toLowerCase();
    if (category) filter.category = String(category).toLowerCase();

    const skip = (Number(page) - 1) * Number(limit);

    const [issues, total] = await Promise.all([
      Issue.find(filter)
        .populate("reportedBy", "name email role")
        .populate("assignedDepartment", "name")
        .populate("assignedWorker", "name email")
        .populate("volunteer", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Issue.countDocuments(filter),
    ]);

    return apiResponse(res, 200, "Issues retrieved", {
      data: issues,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Admin Issues Error:", error);
    return apiResponse(res, 500, "Failed to fetch issues");
  }
};