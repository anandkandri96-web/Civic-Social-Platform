import { useEffect, useState } from 'react';
import { getNotifications, markNotificationRead } from "@api/notifications.api.js";
import { getErrorMessage } from '@api/utils';
import './NotificationPanel.css';

const NotificationPanel = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { items } = await getNotifications();
      setNotifications(items);
    } catch (err) {
      console.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error(getErrorMessage(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <h3>Notifications</h3>
        <button onClick={onClose}>×</button>
      </div>
      <div className="notification-list">
        {loading ? (
          <p>Loading...</p>
        ) : notifications.length === 0 ? (
          <p>No notifications</p>
        ) : (
          notifications.map(notification => (
            <div key={notification._id} className="notification-item">
              <p>{notification.message}</p>
              <small>{new Date(notification.createdAt).toLocaleString()}</small>
              <button onClick={() => handleMarkRead(notification._id)}>Mark Read</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;