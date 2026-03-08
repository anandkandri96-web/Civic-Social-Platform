import api from './axios';
import { getResponseData } from './utils';

export const getWorkerTasks = async () => {
  const res = await api.get('/worker/tasks');
  return getResponseData(res) || [];
};

export const acceptWorkerTask = async (taskId) => {
  const res = await api.patch(`/worker/tasks/${taskId}/accept`);
  return getResponseData(res);
};

export const updateWorkerTaskProgress = async (taskId, payload) => {
  const res = await api.patch(`/worker/tasks/${taskId}/progress`, payload);
  return getResponseData(res);
};
