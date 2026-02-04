// backend/controllers/analytics.controller.js

const Issue = require('../models/Issue');
const { apiResponse } = require('../utils/apiResponse');

/**
 * GET /api/analytics/trends
 * Admin analytics dashboard data
 */
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
      avgResolutionTime
    ] = await Promise.all([
      // 📈 Issues over time (month + year safe)
      Issue.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // 🏷 Issues by category
      Issue.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ]),

      // 🚦 Status breakdown
      Issue.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // ⏱ Average resolution time (hours)
      Issue.aggregate([
        {
          $match: {
            status: 'resolved',
            resolvedAt: { $ne: null }
          }
        },
        {
          $project: {
            resolutionTime: {
              $divide: [
                { $subtract: ['$resolvedAt', '$createdAt'] },
                1000 * 60 * 60
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgHours: { $avg: '$resolutionTime' }
          }
        }
      ])
    ]);

    return apiResponse(res, 200, 'Analytics data retrieved', {
      issuesOverTime,
      issuesByCategory,
      statusBreakdown,
      avgResolutionTime: avgResolutionTime[0]?.avgHours || 0
    });

  } catch (error) {
    console.error('Analytics Error:', error);
    return apiResponse(res, 500, 'Failed to load analytics');
  }
};
