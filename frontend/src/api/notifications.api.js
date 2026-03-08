import api from './axios';
import { getResponseData } from './utils';

export const getNotifications = async (params = {}) => {
  const res = await api.get('/notifications', { params });
  const data = getResponseData(res) || [];
  const meta = res.data?.meta ?? {};
  return { items: data, meta };
};

export const markNotificationRead = async (id) => {
  const res = await api.patch(`/notifications/${id}/read`);
  return getResponseData(res);
};

export const markAllNotificationsRead = async () => {
  const res = await api.patch('/notifications/read-all');
  return getResponseData(res);
};

