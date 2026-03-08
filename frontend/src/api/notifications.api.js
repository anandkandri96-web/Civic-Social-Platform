import api from './axios';

export const getNotifications = async (params = {}) => {
  const res = await api.get('/notifications', { params });
  return {
    items: res.data?.data ?? [],
    meta: res.data?.meta ?? {},
  };
};

export const markNotificationRead = async (id) => {
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data?.data ?? res.data;
};

export const markAllNotificationsRead = async () => {
  const res = await api.patch('/notifications/read-all');
  return res.data?.data ?? res.data;
};

