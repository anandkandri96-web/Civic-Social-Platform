import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markNotificationRead } from '@api/notifications.api.js';
import { getErrorMessage } from '@api/utils';
import Skeleton from '../../common/Skeleton/Skeleton';
import './NotificationPanel.css';

function formatTime(dateInput) {
  if (!dateInput) return 'Recently';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return 'Recently';
  return d.toLocaleString();
}

const NotificationPanel = ({ isOpen, onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;

    const fetchNotifications = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getNotifications({ limit: 20 });
        if (cancelled) return;
        setItems(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNotifications();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  const handleMarkRead = async (id) => {
    try {
      const updated = await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (n._id === id ? updated : n)));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notif-panel" role="dialog" aria-label="Notifications">
      <div className="notif-panel__header">
        <div className="notif-panel__title">
          Notifications{unread > 0 ? ` (${unread})` : ''}
        </div>
        <button type="button" className="notif-panel__close" onClick={onClose} aria-label="Close notifications">
          X
        </button>
      </div>

      {error ? <div className="notif-panel__empty">{error}</div> : null}

      <div className="notif-panel__list">
        {loading ? (
          <>
            <Skeleton height={92} />
            <Skeleton height={92} />
            <Skeleton height={92} />
          </>
        ) : items.length === 0 ? (
          <div className="notif-panel__empty">No notifications yet.</div>
        ) : (
          items.map((n) => {
            const issueId = n?.issue?._id;
            const isUnread = !n.read;
            return (
              <article key={n._id} className={`notif-item${isUnread ? ' is-unread' : ''}`}>
                <div className="notif-item__top">
                  <div>
                    <div className="notif-item__title">{n.title || 'Notification'}</div>
                    <div className="notif-item__message">{n.message || ''}</div>
                  </div>
                </div>

                <div className="notif-item__meta">
                  <span>{formatTime(n.createdAt)}</span>
                  <span>{isUnread ? 'Unread' : 'Read'}</span>
                </div>

                <div className="notif-item__actions">
                  {issueId ? (
                    <Link className="notif-item__btn notif-item__btn--ghost" to={`/issues/${issueId}`} onClick={onClose}>
                      Open issue
                    </Link>
                  ) : null}
                  {!n.read ? (
                    <button type="button" className="notif-item__btn" onClick={() => handleMarkRead(n._id)}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationPanel;

