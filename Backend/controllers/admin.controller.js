// backend/controllers/admin.controller.js

const Issue = require("../models/issue");
const { apiResponse } = require('../utils/apiResponse');

/**
 * GET /api/admin/stats
 * Admin dashboard statistics
 */
exports.getStats = async (req, res) => {
  try {
    const [total, statusBreakdown, avgResolution] = await Promise.all([
      // Total issues
      Issue.countDocuments(),

      // Status-wise counts
      Issue.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Average resolution time (in hours)
      Issue.aggregate([
        {
          $match: {
            status: 'resolved',
            resolvedAt: { $ne: null }
          }
        },
        {
          $project: {
            resolutionHours: {
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
            avgHours: { $avg: '$resolutionHours' }
          }
        }
      ])
    ]);

    return apiResponse(res, 200, 'Admin stats retrieved', {
      totalIssues: total,
      statusBreakdown,
      avgResolutionHours: avgResolution[0]?.avgHours || 0
    });

  } catch (error) {
    console.error('Admin Stats Error:', error);
    return apiResponse(res, 500, 'Failed to load admin stats');
  }
};

/**
 * GET /api/admin/issues
 * Paginated admin issue list
 */
exports.getAllIssues = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      sort = '-createdAt'
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;

    const issues = await Issue.find(filter)
      .populate('reportedBy', 'name email role')
      // .populate('assignedTo', 'name') ❌ comment if field not in Issue schema
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Issue.countDocuments(filter);

    return apiResponse(res, 200, 'Issues retrieved', {
      data: issues,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Admin Issues Error:', error);
    return apiResponse(res, 500, 'Failed to fetch issues');
  }
};

