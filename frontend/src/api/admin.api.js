import api from './axios';

export const getAdminStats = async () => {
  const res = await api.get('/admin/stats');
  return res.data?.data ?? {};
};

export const getAllIssuesAdmin = async (params = {}) => {
  const res = await api.get('/admin/issues', { params });
  return res.data?.data ?? { data: [], pagination: {} };
};

export const getAdminUsers = async (params = {}) => {
  const res = await api.get('/admin/users', { params });
  return res.data?.data ?? { data: [], pagination: {} };
};

export const updateUserRoleAdmin = async (userId, role) => {
  const res = await api.patch(`/admin/users/${userId}/role`, { role });
  return res.data?.data ?? res.data;
};

export const updateUserStatusAdmin = async (userId, isActive) => {
  const res = await api.patch(`/admin/users/${userId}/status`, { isActive });
  return res.data?.data ?? res.data;
};

export const approveUserAdmin = async (userId, isApproved) => {
  const res = await api.patch(`/admin/users/${userId}/approve`, { isApproved });
  return res.data?.data ?? res.data;
};

export const assignUserDepartmentAdmin = async (userId, departmentId) => {
  const res = await api.patch(`/admin/users/${userId}/department`, { departmentId });
  return res.data?.data ?? res.data;
};

export const deleteUserAdmin = async (userId) => {
  const res = await api.delete(`/admin/users/${userId}`);
  return res.data;
};

export const getDepartmentsAdmin = async () => {
  const res = await api.get('/admin/departments');
  return res.data?.data ?? [];
};

export const createDepartmentAdmin = async (payload) => {
  const res = await api.post('/admin/departments', payload);
  return res.data?.data ?? res.data;
};

export const updateIssueStatusAdmin = async (issueId, status) => {
  const res = await api.patch(`/issues/${issueId}/status`, { status });
  return res.data?.data ?? res.data;
};
