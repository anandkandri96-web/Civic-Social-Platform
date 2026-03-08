import api from './axios';

export const getAnalyticsTrends = async (params = {}) => {
  const res = await api.get('/analytics/trends', { params });
  return res.data?.data ?? {};
};

export const getAnalyticsHeatmap = async () => {
  const res = await api.get('/analytics/heatmap');
  return res.data?.data ?? [];
};

