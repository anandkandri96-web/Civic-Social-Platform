import api from './axios';

/**
 * Fetch all issues (admin only)
 * GET /api/admin/issues
 */
export const getAllIssuesAdmin = async (params = {}) => {
  return await api.get('/admin/issues', { params });
};

/**
 * Fetch admin statistics
 * GET /api/admin/stats
 */
export const getAdminStats = async () => {
  return await api.get('/admin/stats');
};

/**
 * Update issue status (admin / volunteer)
 * PUT /api/issues/:id/status
 */
export const updateIssueStatusAdmin = async (id, status) => {
  if (!id || !status) {
    throw new Error('Issue ID and status are required');
  }

  return await api.patch(`/issues/${id}/status`, { status });
};

/**
 * Delete issue (admin only)
 * DELETE /api/issues/:id
 */
export const deleteIssueAdmin = async (id) => {
  if (!id) {
    throw new Error('Issue ID is required');
  }

  return await api.delete(`/issues/${id}`);
};
export const getAllIssues = async () => {
  const res = await api.get('/admin/issues');
  return res.data;
};
