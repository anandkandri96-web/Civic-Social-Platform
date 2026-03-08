import api from './axios';

export const getIssueComments = async (issueId) => {
  const res = await api.get(`/comments/${issueId}`);
  return res.data?.data ?? [];
};

export const createIssueComment = async (issueId, payload) => {
  const res = await api.post(`/comments/${issueId}`, payload);
  return res.data?.data ?? res.data;
};

export const updateIssueComment = async (commentId, payload) => {
  const res = await api.patch(`/comments/single/${commentId}`, payload);
  return res.data?.data ?? res.data;
};

export const deleteIssueComment = async (commentId) => {
  const res = await api.delete(`/comments/single/${commentId}`);
  return res.data;
};

