import { useEffect, useState } from 'react';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../../api/notifications.api';
import Loader from '../../components/common/Loader/Loader';
import './Notifications.css';

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getNotifications({ limit: 50 });
        if (!mounted) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setMeta(data.meta || {});
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || err?.message || 'Failed to load notifications');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleMarkRead = async (id) => {
    setWorking(id);
    try {
      const updated = await markNotificationRead(id);
      setItems((prev) => prev.map((it) => (it._id === id ? updated : it)));
      setMeta((prev) => ({ ...prev, unreadCount: Math.max(0, Number(prev.unreadCount || 0) - 1) }));
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Failed to mark notification');
    } finally {
      setWorking('');
    }
  };

  const handleMarkAll = async () => {
    setWorking('all');
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((it) => ({ ...it, read: true })));
      setMeta((prev) => ({ ...prev, unreadCount: 0 }));
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Failed to mark all notifications');
    } finally {
      setWorking('');
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <section className="notifications-page page">
      <div className="container">
        <header className="notifications-header">
          <div>
            <h1>Notifications</h1>
            <p>Unread: {meta.unreadCount ?? 0}</p>
          </div>
          <button type="button" onClick={handleMarkAll} disabled={working === 'all'}>
            Mark all as read
          </button>
        </header>

        {error && <div className="issues-error">{error}</div>}

        {items.length === 0 ? (
          <div className="card notifications-empty">No notifications yet.</div>
        ) : (
          <div className="notifications-list">
            {items.map((n) => (
              <article key={n._id} className={`card notifications-item ${n.read ? 'is-read' : 'is-unread'}`}>
                <div>
                  <h3>{n.title}</h3>
                  <p>{n.message}</p>
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </div>
                <div className="notifications-actions">
                  {!n.read && (
                    <button type="button" onClick={() => handleMarkRead(n._id)} disabled={working === n._id}>
                      Mark read
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Notifications;

