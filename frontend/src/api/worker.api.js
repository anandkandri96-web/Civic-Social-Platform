import api from './axios';

export const getWorkerTasks = async () => {
  const res = await api.get('/worker/tasks');
  return res.data?.data ?? [];
};

export const acceptWorkerTask = async (taskId) => {
  const res = await api.patch(`/worker/tasks/${taskId}/accept`);
  return res.data?.data ?? res.data;
};

export const updateWorkerTaskProgress = async (taskId, payload) => {
  const res = await api.patch(`/worker/tasks/${taskId}/progress`, payload);
  return res.data?.data ?? res.data;
};
