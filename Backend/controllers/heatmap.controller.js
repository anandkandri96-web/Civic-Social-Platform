const Issue = require("../models/issue");
const { apiResponse } = require("../utils/apiResponse");

/**
 * Public heatmap endpoint.
 * Aggregates issues by exact coordinate pair and returns minimal data.
 *
 * Response example:
 * [{ lat: 12.9716, lng: 77.5946, count: 12 }]
 */
exports.getPublicHeatmap = async (req, res) => {
  try {
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(5000, Math.max(1, Number(req.query.limit) || 500));
    const skip = (pageNum - 1) * limitNum;

    const points = await Issue.aggregate([
      {
        $match: {
          location: { $exists: true },
        },
      },
      {
        $project: {
          lng: {
            $convert: {
              input: { $arrayElemAt: ["$location.coordinates", 0] },
              to: "double",
              onError: null,
              onNull: null,
            },
          },
          lat: {
            $convert: {
              input: { $arrayElemAt: ["$location.coordinates", 1] },
              to: "double",
              onError: null,
              onNull: null,
            },
          },
          severitySafe: { $ifNull: ["$severity", 1] },
        },
      },
      {
        $match: {
          lng: { $ne: null },
          lat: { $ne: null },
        },
      },
      {
        $group: {
          _id: { lng: "$lng", lat: "$lat" },
          count: { $sum: 1 },
          avgSeverity: { $avg: "$severitySafe" },
          maxSeverity: { $max: "$severitySafe" },
        },
      },
      {
        $project: {
          _id: 0,
          lng: "$_id.lng",
          lat: "$_id.lat",
          count: 1,
          avgSeverity: { $round: ["$avgSeverity", 1] },
          maxSeverity: 1,
        },
      },
      { $sort: { count: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ]);

    return apiResponse(res, 200, "Public heatmap points fetched", points, {
      page: pageNum,
      limit: limitNum,
      returned: points.length,
    });
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Public heatmap error:", error);
    return apiResponse(res, 500, "Failed to fetch heatmap data");
  }
};
