import api from './axios';
import { getResponseData } from './utils';

export const getAnalyticsTrends = async (params = {}) => {
  const res = await api.get('/analytics/trends', { params });
  return getResponseData(res) || {};
};

// Public heatmap: works without login.
export const getPublicHeatmap = async () => {
  const res = await api.get('/heatmap');
  return getResponseData(res) || [];
};

// Admin/officer heatmap: richer weighting for dashboards.
export const getAdminHeatmap = async () => {
  const res = await api.get('/admin/analytics/heatmap');
  return getResponseData(res) || [];
};

