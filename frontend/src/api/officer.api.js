import api from './axios';

export const getOfficerIssues = async (params = {}) => {
  const res = await api.get('/officer/issues', { params });
  return res.data?.data ?? [];
};

export const reviewOfficerIssue = async (issueId) => {
  const res = await api.patch(`/officer/issues/${issueId}/review`);
  return res.data?.data ?? res.data;
};

export const assignOfficerWorker = async (issueId, workerId) => {
  const res = await api.patch(`/officer/issues/${issueId}/assign-worker`, { workerId });
  return res.data?.data ?? res.data;
};

export const updateOfficerIssueStatus = async (issueId, status) => {
  const res = await api.patch(`/officer/issues/${issueId}/status`, { status });
  return res.data?.data ?? res.data;
};
