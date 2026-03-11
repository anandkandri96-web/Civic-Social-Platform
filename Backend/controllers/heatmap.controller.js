const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");

/**
 * Public heatmap endpoint.
 * Aggregates issues by exact coordinate pair and returns minimal data.
 *
 * Response example:
 * [{ lat: 12.9716, lng: 77.5946, count: 12 }]
 */
exports.getPublicHeatmap = async (_req, res) => {
  try {
    const points = await Issue.aggregate([
      {
        $match: {
          location: { $exists: true },
          "location.coordinates.0": { $type: "number" },
          "location.coordinates.1": { $type: "number" },
        },
      },
      {
        $group: {
          _id: "$location.coordinates",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          lng: { $arrayElemAt: ["$_id", 0] },
          lat: { $arrayElemAt: ["$_id", 1] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5000 },
    ]);

    return apiResponse(res, 200, "Public heatmap points fetched", points);
  } catch (error) {
    console.error("Public heatmap error:", error);
    return apiResponse(res, 500, "Failed to fetch heatmap data");
  }
};

