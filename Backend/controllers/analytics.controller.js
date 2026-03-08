const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");

exports.getTrends = async (req, res) => {
  try {
    const { from, to } = req.query;

    const matchStage = {};
    if (from || to) {
      matchStage.createdAt = {};
      if (from) matchStage.createdAt.$gte = new Date(from);
      if (to) matchStage.createdAt.$lte = new Date(to);
    }

    const [issuesOverTime, issuesByCategory, statusBreakdown, avgResolutionTime] = await Promise.all([
      Issue.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),
      Issue.aggregate([{ $match: matchStage }, { $group: { _id: "$category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Issue.aggregate([{ $match: matchStage }, { $group: { _id: "$status", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
      Issue.aggregate([
        { $match: { status: { $in: ["resolved", "resolved_by_community", "closed"] }, resolvedAt: { $ne: null } } },
        {
          $project: {
            resolutionTime: {
              $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60],
            },
          },
        },
        { $group: { _id: null, avgHours: { $avg: "$resolutionTime" } } },
      ]),
    ]);

    return apiResponse(res, 200, "Analytics data retrieved", {
      issuesOverTime,
      issuesByCategory,
      statusBreakdown,
      avgResolutionTime: avgResolutionTime[0]?.avgHours || 0,
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    return apiResponse(res, 500, "Failed to load analytics");
  }
};

exports.getHeatmap = async (req, res) => {
  try {
    const points = await Issue.aggregate([
      {
        $group: {
          _id: "$location.coordinates",
          count: { $sum: 1 },
          avgSeverity: { $avg: "$severity" },
          totalVotes: { $sum: "$voteCount" },
        },
      },
      {
        $project: {
          _id: 0,
          coordinates: "$_id",
          weight: {
            $add: [
              { $multiply: ["$count", 2] },
              { $multiply: ["$avgSeverity", 1.5] },
              "$totalVotes",
            ],
          },
        },
      },
      {
        $sort: { weight: -1 },
      },
    ]);

    return apiResponse(res, 200, "Heatmap points fetched", points);
  } catch (error) {
    console.error("Heatmap Error:", error);
    return apiResponse(res, 500, "Failed to fetch heatmap data");
  }
};