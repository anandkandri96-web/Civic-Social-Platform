import api from './axios';
import { getResponseData } from './utils';

export const getIssueComments = async (issueId) => {
  const res = await api.get(`/comments/${issueId}`);
  return getResponseData(res) || [];
};

export const createIssueComment = async (issueId, payload) => {
  const res = await api.post(`/comments/${issueId}`, payload);
  return getResponseData(res);
};

export const updateIssueComment = async (commentId, payload) => {
  const res = await api.patch(`/comments/single/${commentId}`, payload);
  return getResponseData(res);
};

export const deleteIssueComment = async (commentId) => {
  const res = await api.delete(`/comments/single/${commentId}`);
  return getResponseData(res);
};

