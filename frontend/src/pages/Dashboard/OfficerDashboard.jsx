import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { assignOfficerWorker, getOfficerIssues, reviewOfficerIssue, updateOfficerIssueStatus } from '../../api/officer.api';
import { getErrorMessage } from '../../api/utils';
import './RoleDashboard.css';
import { canTransition } from '../../utils/statusFlow';

const OfficerDashboard = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');
  const [workerInputs, setWorkerInputs] = useState({});

  useEffect(() => {
    let mounted = true;

    const fetchIssues = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getOfficerIssues();
        if (mounted) setIssues(Array.isArray(data) ? data : []);
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

  const patchIssue = (updatedIssue) => {
    setIssues((prev) => prev.map((issue) => (issue._id === updatedIssue._id ? updatedIssue : issue)));
  };

  const runAction = async (issueId, action) => {
    setWorkingId(issueId);
    try {
      const updated = await action();
      patchIssue(updated);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setWorkingId('');
    }
  };

  const grouped = {
    underReview: issues.filter((issue) => issue.status === 'under_review').length,
    assigned: issues.filter((issue) => issue.status === 'assigned_to_department').length,
    progress: issues.filter((issue) => issue.status === 'work_in_progress').length,
    resolved: issues.filter((issue) => issue.status === 'resolved').length,
  };

  const officerStatuses = useMemo(
    () => ['under_review', 'assigned_to_department', 'work_in_progress', 'resolved', 'rejected'],
    []
  );

  return (
    <section className="role-dashboard page">
      <div className="container">
        <header className="role-dashboard__header">
          <div>
            <h1>Officer Dashboard</h1>
            <p>Review department issues and move valid reports across the government resolution flow.</p>
          </div>
          <Link to="/dashboard/officer/analytics" className="role-dashboard__action">
            View Analytics
          </Link>
        </header>

        {error && <div className="issues-error">{error}</div>}

        <div className="role-dashboard__grid">
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Under Review</div>
            <div className="role-dashboard__stat-value">{grouped.underReview}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Assigned to Department</div>
            <div className="role-dashboard__stat-value">{grouped.assigned}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Work In Progress</div>
            <div className="role-dashboard__stat-value">{grouped.progress}</div>
          </article>
          <article className="card role-dashboard__stat">
            <div className="role-dashboard__stat-label">Resolved</div>
            <div className="role-dashboard__stat-value">{grouped.resolved}</div>
          </article>
        </div>

        <section className="card role-dashboard__panel">
          <h2>Department Queue</h2>
          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : issues.length === 0 ? (
            <p className="text-muted">No issues assigned to your department.</p>
          ) : (
            <table className="role-dashboard__table">
              <thead>
                <tr>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Reporter</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue._id}>
                    <td>{issue.title}</td>
                    <td>{issue.status}</td>
                    <td>{issue.category}</td>
                    <td>{issue.reportedBy?.name || '-'}</td>
                    <td>
                      <div className="role-dashboard__actions">
                        <button
                          type="button"
                          disabled={workingId === issue._id}
                          onClick={() => runAction(issue._id, () => reviewOfficerIssue(issue._id))}
                        >
                          Review
                        </button>
                        <input
                          type="text"
                          placeholder="Worker ID"
                          value={workerInputs[issue._id] ?? ''}
                          onChange={(e) =>
                            setWorkerInputs((prev) => ({ ...prev, [issue._id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          disabled={workingId === issue._id || !(workerInputs[issue._id] || '').trim()}
                          onClick={() =>
                            runAction(issue._id, () =>
                              assignOfficerWorker(issue._id, String(workerInputs[issue._id]).trim())
                            )
                          }
                        >
                          Assign
                        </button>
                        <select
                          defaultValue={issue.status}
                          disabled={workingId === issue._id}
                          onChange={(e) =>
                            runAction(issue._id, () => updateOfficerIssueStatus(issue._id, e.target.value))
                          }
                        >
                          {officerStatuses
                            .filter((status) => status === issue.status || canTransition(issue.status, status))
                            .map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                        </select>
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

export default OfficerDashboard;
