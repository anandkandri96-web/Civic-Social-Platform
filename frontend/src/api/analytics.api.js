import api from './axios';
import { getResponseData } from './utils';

export const getAnalyticsTrends = async (params = {}) => {
  const res = await api.get('/analytics/trends', { params });
  return getResponseData(res) || {};
};

export const getAnalyticsHeatmap = async () => {
  const res = await api.get('/analytics/heatmap');
  return getResponseData(res) || [];
};

