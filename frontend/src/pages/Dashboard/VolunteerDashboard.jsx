import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  claimVolunteerIssue,
  getAvailableVolunteerIssues,
  updateVolunteerProgress,
} from '@api/volunteer.api.js';
import { getErrorMessage } from '@api/utils';
import { getIssues } from '@api/issues.api';
import IssueCard from '../../components/issues/IssueCard/IssueCard';
import IssueCardSkeleton from '../../components/common/Skeleton/IssueCardSkeleton';
import './RoleDashboard.css';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { ISSUE_STATUS_LABELS } from '../../constants/issueStatus';

const VolunteerDashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [myIssues, setMyIssues] = useState([]);
  const [myLoading, setMyLoading] = useState(true);
  const [myError, setMyError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getAvailableVolunteerIssues();
        if (mounted) setIssues(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchMine = async () => {
      setMyLoading(true);
      setMyError('');
      try {
        const data = await getIssues();
        const list = Array.isArray(data) ? data : [];
        const mine = list.filter((i) => {
          const rep = i?.reportedBy;
          const repId = rep && typeof rep === 'object' ? rep._id : rep;
          return user?.id && String(repId) === String(user.id);
        });
        if (mounted) setMyIssues(mine);
      } catch (err) {
        if (mounted) setMyError(getErrorMessage(err));
      } finally {
        if (mounted) setMyLoading(false);
      }
    };

    if (user?.id) fetchMine();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const patchLocalIssue = (nextIssue) => {
    setIssues((prev) => prev.map((issue) => (issue._id === nextIssue._id ? nextIssue : issue)));
  };

  const runAction = async (issueId, action) => {
    setWorkingId(issueId);
    try {
      const updated = await action();
      patchLocalIssue(updated);
      return true;
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
      return false;
    } finally {
      setWorkingId('');
    }
  };

  const claimedCount = issues.filter((issue) => issue.status === 'volunteer_claimed').length;
  const communityFixCount = issues.filter((issue) => issue.status === 'community_fix_in_progress').length;
  const myStats = useMemo(() => {
    const total = myIssues.length;
    const resolved = myIssues.filter((i) => ['resolved', 'resolved_by_community', 'closed'].includes(i.status)).length;
    const active = total - resolved;
    const inProgress = myIssues.filter((i) => ['under_review', 'assigned_to_department', 'work_in_progress'].includes(i.status)).length;
    return { total, active, inProgress, resolved };
  }, [myIssues]);

  return (
    <section className="role-dashboard page">
      <div className="container">
        <header className="role-dashboard__header">
          <div>
            <h1>Volunteer Dashboard</h1>
            <p>Claim reports, start community fixes, and submit proof to complete community resolution.</p>
          </div>
        </header>

        {error && <div className="issues-error">{error}</div>}

        <div className="role-dashboard__grid">
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Available Issues</div>
            <div className="role-dashboard__stat-value">{issues.length}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Volunteer Claimed</div>
            <div className="role-dashboard__stat-value">{claimedCount}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Community Fix In Progress</div>
            <div className="role-dashboard__stat-value">{communityFixCount}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Awaiting Citizen Verification</div>
            <div className="role-dashboard__stat-value">
              {issues.filter((issue) => issue.status === 'resolved_by_community').length}
            </div>
          </article>
        </div>

        <section className="card role-dashboard__panel">
          <h2>Volunteer Actions</h2>
          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : issues.length === 0 ? (
            <p className="text-muted">No volunteer-eligible issues right now.</p>
          ) : (
            <div className="table-wrapper">
              <table className="role-dashboard__table">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th>Category</th>
                  <th>Status</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue._id}>
                    <td>{issue.title}</td>
                    <td>{issue.category}</td>
                    <td>{ISSUE_STATUS_LABELS[issue.status] || issue.status}</td>
                    <td>{issue.locationText || '-'}</td>
                    <td>
                      <div className="role-dashboard__actions">
                        <button
                          type="button"
                          disabled={workingId === issue._id || !['reported', 'under_review'].includes(issue.status)}
                          onClick={() => runAction(issue._id, () => claimVolunteerIssue(issue._id))}
                        >
                          Claim
                        </button>
                        <button
                          type="button"
                          disabled={workingId === issue._id || !['volunteer_claimed', 'community_fix_in_progress'].includes(issue.status)}
                          onClick={() => runAction(issue._id, () => updateVolunteerProgress(issue._id))}
                        >
                          Start Fix
                        </button>
                        {issue.status === 'community_fix_in_progress' ? (
                          <Link to={`/dashboard/volunteer/submit/${issue._id}`} className="role-dashboard__link-btn">
                            Open Submit Form
                          </Link>
                        ) : (
                          <span className="text-muted">Start fix to resolve</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card role-dashboard__panel">
          <div className="role-dashboard__panel-head">
            <h2>My Reported Issues</h2>
            <Link to="/issues/create" className="role-dashboard__link-btn">+ New Report</Link>
          </div>

          {myError && <div className="issues-error">{myError}</div>}

          {myLoading ? (
            <div className="dashboard-skeleton-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <IssueCardSkeleton key={i} />
              ))}
            </div>
          ) : myIssues.length === 0 ? (
            <p className="text-muted">You have not reported any issues yet.</p>
          ) : (
            <>
              <div className="role-dashboard__grid">
                <article className="card role-dashboard__stat">
                  <div className="role-dashboard__stat-label">Total</div>
                  <div className="role-dashboard__stat-value">{myStats.total}</div>
                </article>
                <article className="card role-dashboard__stat">
                  <div className="role-dashboard__stat-label">Active</div>
                  <div className="role-dashboard__stat-value">{myStats.active}</div>
                </article>
                <article className="card role-dashboard__stat">
                  <div className="role-dashboard__stat-label">In Progress</div>
                  <div className="role-dashboard__stat-value">{myStats.inProgress}</div>
                </article>
                <article className="card role-dashboard__stat">
                  <div className="role-dashboard__stat-label">Resolved</div>
                  <div className="role-dashboard__stat-value">{myStats.resolved}</div>
                </article>
              </div>
              <div className="issues-wrapper">
                {myIssues.map((issue) => (
                  <IssueCard
                    key={issue._id}
                    issue={issue}
                    onVote={(result) => {
                      setMyIssues((prev) =>
                        prev.map((i) =>
                          i._id === issue._id ? { ...i, voteCount: result.voteCount, userVoted: result.voted } : i
                        )
                      );
                    }}
                    onDeleted={(deletedId) => {
                      setMyIssues((prev) => prev.filter((i) => i._id !== deletedId));
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </section>
  );
};

export default VolunteerDashboard;
