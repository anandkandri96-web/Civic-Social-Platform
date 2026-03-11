import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getIssues } from '@api/issues.api';
import { getErrorMessage } from '@api/utils';
import IssueCard from '../../components/issues/IssueCard/IssueCard';
import Skeleton from '../../components/common/Skeleton/Skeleton';
import './UserDashboard.css';

const UserDashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getIssues();
        const list = Array.isArray(data) ? data : [];
        const mine = list.filter((i) => {
          const rep = i?.reportedBy;
          const repId = rep && typeof rep === 'object' ? rep._id : rep;
          return user?.id && String(repId) === String(user.id);
        });
        if (mounted) setIssues(mine);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const stats = useMemo(() => {
    const total = issues.length;
    const resolved = issues.filter((i) => ['resolved', 'resolved_by_community', 'closed'].includes(i.status)).length;
    const active = total - resolved;
    const inProgress = issues.filter((i) => ['under_review', 'assigned_to_department', 'work_in_progress'].includes(i.status)).length;
    return { total, active, inProgress, resolved };
  }, [issues]);

  return (
    <section className="dashboard-page page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>My Dashboard</h1>
            <p>Track the status of issues you have reported.</p>
          </div>

          <Link to="/issues/create" className="new-report-btn">
            + New Report
          </Link>
        </div>

        {error && <div className="issues-error">{error}</div>}

        {loading ? (
          <div className="dashboard-skeleton-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={220} />
            ))}
          </div>
        ) : issues.length === 0 ? (
          <div className="issues-empty card">
            <p>You have not reported any issues yet.</p>
            <Link to="/issues/create" className="issues-empty-cta">
              Report your first issue
            </Link>
          </div>
        ) : null}

        {!loading && issues.length > 0 ? (
          <div className="dashboard-stats-grid">
            <article className="card dashboard-stat">
              <span>Total</span>
              <strong>{stats.total}</strong>
            </article>
            <article className="card dashboard-stat">
              <span>Active</span>
              <strong>{stats.active}</strong>
            </article>
            <article className="card dashboard-stat">
              <span>In Progress</span>
              <strong>{stats.inProgress}</strong>
            </article>
            <article className="card dashboard-stat">
              <span>Resolved</span>
              <strong>{stats.resolved}</strong>
            </article>
          </div>
        ) : null}

        <div className="issues-wrapper">
          {issues.map((issue) => (
            <IssueCard
              key={issue._id}
              issue={issue}
              onVote={(result) => {
                setIssues((prev) =>
                  prev.map((i) =>
                    i._id === issue._id ? { ...i, voteCount: result.voteCount, userVoted: result.voted } : i
                  )
                );
              }}
              onDeleted={(deletedId) => {
                setIssues((prev) => prev.filter((i) => i._id !== deletedId));
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default UserDashboard;
