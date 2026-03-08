import { useEffect, useState } from 'react';
import {
  claimVolunteerIssue,
  getAvailableVolunteerIssues,
  resolveVolunteerIssue,
  updateVolunteerProgress,
} from '../../api/volunteer.api';
import { getErrorMessage } from '../../api/utils';
import './RoleDashboard.css';

const VolunteerDashboard = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');
  const [proofFilesByIssue, setProofFilesByIssue] = useState({});

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
      alert(getErrorMessage(err));
      return false;
    } finally {
      setWorkingId('');
    }
  };

  const claimedCount = issues.filter((issue) => issue.status === 'volunteer_claimed').length;
  const communityFixCount = issues.filter((issue) => issue.status === 'community_fix_in_progress').length;

  const handleResolve = async (issueId) => {
    const proofFiles = proofFilesByIssue[issueId] || [];
    if (proofFiles.length === 0) {
      alert('Please upload at least one after-fix photo to resolve this issue.');
      return;
    }

    const success = await runAction(issueId, () => resolveVolunteerIssue(issueId, { proofFiles }));
    if (success) {
      setProofFilesByIssue((prev) => {
        const next = { ...prev };
        delete next[issueId];
        return next;
      });
    }
  };

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
            <div className="role-dashboard__stat-label">Ready for Citizen Verification</div>
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
                    <td>{issue.status}</td>
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
                        <button
                          type="button"
                          disabled={workingId === issue._id || issue.status !== 'community_fix_in_progress'}
                          onClick={() => void handleResolve(issue._id)}
                        >
                          Resolve
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={workingId === issue._id || issue.status !== 'community_fix_in_progress'}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setProofFilesByIssue((prev) => ({ ...prev, [issue._id]: files }));
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </section>
  );
};

export default VolunteerDashboard;
