import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllIssuesAdmin } from '@api/admin.api';
import { getErrorMessage } from '@api/utils';
import Loader from '../../../components/common/Loader/Loader';
import PageHeader from '../../../components/ui/PageHeader/PageHeader';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchIssues = async () => {
      setLoading(true);
      setError('');

      try {
        const payload = await getAllIssuesAdmin({ limit: 100 });
        if (mounted) setIssues(Array.isArray(payload?.data) ? payload.data : []);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchIssues();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = issues.length;
    const pending = issues.filter((i) => ['reported', 'under_review'].includes(i.status)).length;
    const assigned = issues.filter((i) => ['assigned_to_department', 'work_in_progress'].includes(i.status)).length;
    const resolved = issues.filter((i) => i.status === 'resolved').length;
    return { total, pending, assigned, resolved };
  }, [issues]);

  const recentIssues = useMemo(
    () =>
      [...issues]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5),
    [issues]
  );

  const getBarHeight = (value) => {
    const max = Math.max(stats.pending, stats.assigned, stats.resolved, 1);
    const ratio = value / max;
    return `${Math.max(16, Math.round(ratio * 100))}%`;
  };

  if (loading) {
    return <Loader fullScreen />;
  }

  return (
    <section className="admin-dashboard page">
      <div className="container">
        <PageHeader
          title="Admin Dashboard"
          subtitle="System health and issue trends at a glance."
          action={
            <div className="admin-dashboard-actions">
              <Link className="admin-dashboard-link" to="/admin/analytics">
                View Analytics
              </Link>
              <Link className="admin-dashboard-link" to="/admin/users">
                Manage Users
              </Link>
              <Link className="admin-dashboard-link admin-dashboard-link--primary" to="/admin/manage-issues">
                Open Admin Panel
              </Link>
            </div>
          }
        />

        {error && <div className="issues-error">{error}</div>}

        <div className="admin-stats-grid">
          <article className="admin-stat-card card">
            <span>Total Issues</span>
            <h2>{stats.total}</h2>
          </article>
          <article className="admin-stat-card card">
            <span>Pending</span>
            <h2 className="status-warning">{stats.pending}</h2>
          </article>
          <article className="admin-stat-card card">
            <span>Assigned</span>
            <h2 className="status-primary">{stats.assigned}</h2>
          </article>
          <article className="admin-stat-card card">
            <span>Resolved</span>
            <h2 className="status-success">{stats.resolved}</h2>
          </article>
        </div>

        <div className="admin-dashboard-panels">
          <section className="card admin-panel">
            <h3>Issue Status Distribution</h3>
            <div className="admin-chart">
              <div className="admin-bar-wrapper">
                <div className="admin-bar pending" style={{ height: getBarHeight(stats.pending) }} />
                <span>Pending</span>
              </div>
              <div className="admin-bar-wrapper">
                <div className="admin-bar assigned" style={{ height: getBarHeight(stats.assigned) }} />
                <span>Assigned</span>
              </div>
              <div className="admin-bar-wrapper">
                <div className="admin-bar resolved" style={{ height: getBarHeight(stats.resolved) }} />
                <span>Resolved</span>
              </div>
            </div>
          </section>

          <section className="card admin-panel">
            <h3>Recent Reports</h3>
            {recentIssues.length === 0 ? (
              <p className="admin-note">No issue activity yet.</p>
            ) : (
              <ul className="admin-recent-list">
                {recentIssues.map((issue) => (
                  <li key={issue._id}>
                    <span className="admin-recent-title">{issue.title}</span>
                    <span className="admin-recent-meta">
                      {issue.category || 'other'} · {issue.status || 'reported'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </section>
  );
};

export default AdminDashboard;
