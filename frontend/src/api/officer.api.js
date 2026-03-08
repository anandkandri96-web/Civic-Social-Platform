import api from './axios';
import { getResponseData } from './utils';

export const getOfficerIssues = async (params = {}) => {
  const res = await api.get('/officer/issues', { params });
  return getResponseData(res) || [];
};

export const reviewOfficerIssue = async (issueId) => {
  const res = await api.patch(`/officer/issues/${issueId}/review`);
  return getResponseData(res);
};

export const assignOfficerWorker = async (issueId, workerId) => {
  const res = await api.patch(`/officer/issues/${issueId}/assign-worker`, { workerId });
  return getResponseData(res);
};

export const updateOfficerIssueStatus = async (issueId, status) => {
  const res = await api.patch(`/officer/issues/${issueId}/status`, { status });
  return getResponseData(res);
};
