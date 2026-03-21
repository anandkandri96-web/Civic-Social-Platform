import api from './axios';
import { getResponseData } from './utils';

export const createRoleUpgradeRequest = async (payload) => {
  const res = await api.post('/role-upgrades', payload);
  return getResponseData(res);
};

export const getMyRoleUpgradeRequests = async () => {
  const res = await api.get('/role-upgrades/my');
  return getResponseData(res) || [];
};

export const getRoleUpgradeRequestsAdmin = async (params = {}) => {
  const res = await api.get('/admin/role-upgrades', { params });
  return getResponseData(res) || { data: [], pagination: {} };
};

export const reviewRoleUpgradeRequestAdmin = async (requestId, payload) => {
  const res = await api.patch(`/admin/role-upgrades/${requestId}/decision`, payload);
  return getResponseData(res);
};
