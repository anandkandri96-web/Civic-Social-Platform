import api from "./axios.js";
import { getResponseData } from './utils';

/**
 * Fetch all issues
 * @param {Object} params - Optional: category, status, search, lat, lng, radius
 * @returns {Promise<Array>} Issue[]
 */
export const getIssues = async (params = {}) => {
  const res = await api.get("/issues", { params });
  return getResponseData(res) || [];
};

/**
 * Fetch single issue
 * Returns: Issue | null
 */
export const getIssueById = async (id) => {
  if (!id) throw new Error("Issue ID is required");
  const res = await api.get(`/issues/${id}`);
  return getResponseData(res);
};

/**
 * Create issue
 * Returns: Issue
 */
export const createIssue = async (issueData) => {
  if (!issueData) throw new Error("Issue data is required");
  const res = await api.post("/issues", issueData);
  return getResponseData(res);
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
  return getResponseData(res);
};

export const updateIssue = async (id, payload) => {
  const res = await api.patch(`/issues/${id}`, payload);
  return getResponseData(res);
};

export const verifyIssue = async (id) => {
  const res = await api.patch(`/issues/${id}/verify`);
  return getResponseData(res);
};

export const reopenIssue = async (id) => {
  const res = await api.patch(`/issues/${id}/reopen`);
  return getResponseData(res);
};

export const closeIssue = async (id) => {
  const res = await api.patch(`/issues/${id}/close`);
  return getResponseData(res);
};

/**
 * Delete issue
 */
export const deleteIssue = async (id) => {
  if (!id) throw new Error("Issue ID is required");
  const res = await api.delete(`/issues/${id}`);
  return getResponseData(res);
};
