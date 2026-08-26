const Issue = require("../models/issue");
const Department = require("../models/department");
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

    const [
      issuesOverTime,
      issuesByCategory,
      statusBreakdown,
      avgResolutionTime,
      resolvedDepartmentCounts,
      departments,
    ] = await Promise.all([
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
      Issue.aggregate([
        {
          $match: {
            ...matchStage,
            assignedDepartment: { $ne: null },
            status: { $in: ["resolved", "resolved_by_community", "citizen_verified", "closed"] },
          },
        },
        { $group: { _id: "$assignedDepartment", count: { $sum: 1 } } },
        {
          $lookup: {
            from: "departments",
            localField: "_id",
            foreignField: "_id",
            as: "dept",
          },
        },
        { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            departmentId: "$_id",
            department: { $ifNull: ["$dept.name", "Unknown"] },
            count: 1,
          },
        },
      ]),
      Department.find({ isActive: true }).select("_id name").sort({ name: 1 }).lean(),
    ]);

    const countByDepartmentId = new Map(
      resolvedDepartmentCounts.map((item) => [String(item.departmentId), Number(item.count || 0)])
    );
    const knownDepartmentIds = new Set(departments.map((department) => String(department._id)));
    const resolvedByDepartment = departments.map((department) => ({
      departmentId: department._id,
      department: department.name,
      count: countByDepartmentId.get(String(department._id)) || 0,
    }));

    for (const item of resolvedDepartmentCounts) {
      const id = String(item.departmentId || "");
      if (!id || knownDepartmentIds.has(id)) continue;
      resolvedByDepartment.push(item);
    }

    return apiResponse(res, 200, "Analytics data retrieved", {
      issuesOverTime,
      issuesByCategory,
      statusBreakdown,
      avgResolutionTime: avgResolutionTime[0]?.avgHours || 0,
      resolvedByDepartment,
      filters: { from: from || null, to: to || null },
    });
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Analytics Error:", error);
    return apiResponse(res, 500, "Failed to load analytics");
  }
};

exports.getHeatmap = async (req, res) => {
  try {
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(5000, Math.max(1, Number(req.query.limit) || 500));
    const skip = (pageNum - 1) * limitNum;

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
      { $skip: skip },
      { $limit: limitNum },
    ]);

    return apiResponse(res, 200, "Heatmap points fetched", points, {
      page: pageNum,
      limit: limitNum,
      returned: points.length,
    });
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error("Heatmap Error:", error);
    return apiResponse(res, 500, "Failed to fetch heatmap data");
  }
};
