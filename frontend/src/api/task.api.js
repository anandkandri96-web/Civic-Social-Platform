import api from './axios';
import { getResponseData } from './utils';

export const getMyTasks = async () => {
  const res = await api.get('/tasks/my');
  return getResponseData(res) || [];
};

export const createTask = async (payload) => {
  const res = await api.post('/tasks', payload);
  return getResponseData(res);
};

export const updateTaskStatus = async (taskId, status, completionReport = '') => {
  const payload = { status };
  if (completionReport) payload.completionReport = completionReport;
  const res = await api.patch(`/tasks/${taskId}/status`, payload);
  return getResponseData(res);
};

export const uploadTaskProgress = async (taskId, payload) => {
  const progressImages = Array.isArray(payload?.progressImages) ? payload.progressImages : [];
  const completionReport = typeof payload?.completionReport === 'string' ? payload.completionReport : '';
  const complicationReport = typeof payload?.complicationReport === 'string' ? payload.complicationReport : '';

  const formData = new FormData();
  progressImages.forEach((file) => formData.append('progressImages', file));
  if (completionReport.trim()) formData.append('completionReport', completionReport.trim());
  if (complicationReport.trim()) formData.append('complicationReport', complicationReport.trim());

  const res = await api.post(`/tasks/${taskId}/progress`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return getResponseData(res);
};

