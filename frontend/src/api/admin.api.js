import api from './axios';
import { getResponseData } from './utils';

export const getAdminStats = async () => {
  const res = await api.get('/admin/stats');
  return getResponseData(res) || {};
};

export const getAllIssuesAdmin = async (params = {}) => {
  const res = await api.get('/admin/issues', { params });
  return getResponseData(res) || { data: [], pagination: {} };
};

export const getAdminUsers = async (params = {}) => {
  const res = await api.get('/admin/users', { params });
  return getResponseData(res) || { data: [], pagination: {} };
};

export const updateUserRoleAdmin = async (userId, role) => {
  const res = await api.patch(`/admin/users/${userId}/role`, { role });
  return getResponseData(res);
};

export const updateUserStatusAdmin = async (userId, isActive) => {
  const res = await api.patch(`/admin/users/${userId}/status`, { isActive });
  return getResponseData(res);
};

export const approveUserAdmin = async (userId, isApproved) => {
  const res = await api.patch(`/admin/users/${userId}/approve`, { isApproved });
  return getResponseData(res);
};

export const assignUserDepartmentAdmin = async (userId, departmentId) => {
  const res = await api.patch(`/admin/users/${userId}/department`, { departmentId });
  return getResponseData(res);
};

export const deleteUserAdmin = async (userId) => {
  const res = await api.delete(`/admin/users/${userId}`);
  return getResponseData(res);
};

export const getDepartmentsAdmin = async () => {
  const res = await api.get('/admin/departments');
  return getResponseData(res) || [];
};

export const createDepartmentAdmin = async (payload) => {
  const res = await api.post('/admin/departments', payload);
  return getResponseData(res);
};

export const updateIssueStatusAdmin = async (issueId, status) => {
  const res = await api.patch(`/issues/${issueId}/status`, { status });
  return getResponseData(res);
};
