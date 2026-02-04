import api from "./axios.js";

/**
 * Fetch all issues
 * @param {Object} params - Optional: category, status, search, lat, lng, radius
 * @returns {Promise<Array>} Issue[]
 */
export const getIssues = async (params = {}) => {
  const res = await api.get("/issues", { params });
  const body = res.data || {};
  return body.data ?? body ?? [];
};



/**
 * Fetch single issue
 * Returns: Issue | null
 */
export const getIssueById = async (id) => {
  if (!id) throw new Error("Issue ID is required");

  const res = await api.get(`/issues/${id}`);
  const body = res.data || {};
  return body.data ?? body;
};

/**
 * Create issue
 * Returns: Issue
 */
export const createIssue = async (issueData) => {
  if (!issueData) throw new Error("Issue data is required");

  const isFormData = typeof FormData !== "undefined" && issueData instanceof FormData;
  const res = await api.post("/issues", issueData, isFormData ? {
    headers: { "Content-Type": "multipart/form-data" },
  } : undefined);
  const body = res.data || {};
  return body.data ?? body;
};

/**
 * Update issue status
 * Returns: Issue
 */
export const updateIssueStatus = async (id, status) => {
  if (!id || !status) {
    throw new Error("Issue ID and status are required");
  }

  const res = await api.patch(`/issues/${id}/status`, { status });
  const body = res.data || {};
  return body.data ?? body;
};

/**
 * Delete issue
 */
export const deleteIssue = async (id) => {
  if (!id) throw new Error("Issue ID is required");

  const res = await api.delete(`/issues/${id}`);
  return res.data;
};
