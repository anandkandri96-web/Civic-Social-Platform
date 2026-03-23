import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { assignOfficerWorker, getOfficerIssues, getOfficerWorkers, reviewOfficerIssue, updateOfficerIssueStatus } from '@api/officer.api.js';
import { getErrorMessage } from '@api/utils';
import './RoleDashboard.css';
import { canTransition } from '../../utils/statusFlow';
import { useAuth } from '../../hooks/useAuth';
import { getDepartmentName, getOfficerDisplayId, getUserId, getWorkerDisplayId } from '../../utils/userDisplay';
import { useToast } from '../../contexts/ToastContext';

const getIssueId = (issue) => {
  const id = issue?._id ?? issue?.id;
  return id ? String(id) : '';
};

const OfficerDashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');
  const [workerInputs, setWorkerInputs] = useState({});
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [workerDirectoryError, setWorkerDirectoryError] = useState('');
  const { showToast } = useToast();

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

  useEffect(() => {
    let mounted = true;

    const fetchWorkers = async () => {
      setWorkerDirectoryError('');
      try {
        const data = await getOfficerWorkers();
        if (!mounted) return;
        setAvailableWorkers(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!mounted) return;
        // Keep manual worker-id assignment as a fallback if the endpoint is unavailable.
        setAvailableWorkers([]);
        setWorkerDirectoryError(getErrorMessage(err));
      }
    };

    fetchWorkers();
    return () => {
      mounted = false;
    };
  }, []);

  const patchIssue = (updatedIssue) => {
    const updatedId = getIssueId(updatedIssue);
    if (!updatedId) return;
    setIssues((prev) =>
      prev.map((issue) => (getIssueId(issue) === updatedId ? { ...issue, ...updatedIssue } : issue))
    );
  };

  const runAction = async (issueId, action) => {
    if (!issueId) {
      showToast('Issue not found.', { tone: 'error' });
      return;
    }
    setWorkingId(issueId);
    try {
      const updated = await action();
      if (updated) patchIssue(updated);
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
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

  const chartStats = {
    pending: grouped.underReview,
    assigned: grouped.assigned + grouped.progress,
    resolved: grouped.resolved,
  };

  const getBarHeight = (value) => {
    const max = Math.max(chartStats.pending, chartStats.assigned, chartStats.resolved, 1);
    const ratio = value / max;
    return `${Math.max(16, Math.round(ratio * 100))}%`;
  };

  const officerStatuses = useMemo(
    () => ['under_review', 'assigned_to_department', 'work_in_progress', 'resolved', 'rejected'],
    []
  );

  const activeLoadByWorkerId = useMemo(() => {
    const counts = new Map();
    const activeStatuses = new Set(['assigned_to_department', 'work_in_progress']);
    for (const issue of issues) {
      if (!activeStatuses.has(String(issue?.status || '').toLowerCase())) continue;
      const workerId = getUserId(issue?.assignedWorker);
      if (!workerId) continue;
      counts.set(workerId, (counts.get(workerId) || 0) + 1);
    }
    return counts;
  }, [issues]);

  const hasWorkerDirectory = Array.isArray(availableWorkers) && availableWorkers.length > 0;
  const getWorkerOptionLabel = (worker) => {
    const wid = getWorkerDisplayId(worker);
    const name = worker?.name || '-';
    const dept = getDepartmentName(worker) || '-';
    const explicitLoad =
      worker?.activeTasks ?? worker?.activeTaskCount ?? worker?.currentTaskLoad ?? worker?.currentLoad;
    const computedLoad = worker?._id ? activeLoadByWorkerId.get(String(worker._id)) : undefined;
    const load = typeof explicitLoad === 'number' ? explicitLoad : typeof computedLoad === 'number' ? computedLoad : 'N/A';
    return `${wid} | ${name} | ${dept} | Active: ${load}`;
  };

  return (
    <section className="role-dashboard page">
      <div className="container">
        <header className="role-dashboard__header">
          <div>
            <h1>Officer Dashboard</h1>
            <p>Review department issues and move valid reports across the government resolution flow.</p>
          </div>
          <div className="role-dashboard__profile card">
            <div className="role-dashboard__profile-kv">
              <span>Officer ID</span>
              <strong>{getOfficerDisplayId(user)}</strong>
            </div>
            <div className="role-dashboard__profile-kv">
              <span>Name</span>
              <strong>{user?.name || '-'}</strong>
            </div>
            <div className="role-dashboard__profile-kv">
              <span>Department</span>
              <strong>{getDepartmentName(user) || '-'}</strong>
            </div>
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

        <section className="card role-dashboard__panel role-dashboard__chart">
          <h2>Issue Status Distribution</h2>
          <div className="role-dashboard__chart-wrap">
            <div className="role-dashboard__chart-bars">
              <div className="role-dashboard__bar">
                <span>{chartStats.pending}</span>
                <div className="role-dashboard__bar-fill pending" style={{ height: getBarHeight(chartStats.pending) }} />
              </div>
              <div className="role-dashboard__bar">
                <span>{chartStats.assigned}</span>
                <div className="role-dashboard__bar-fill assigned" style={{ height: getBarHeight(chartStats.assigned) }} />
              </div>
              <div className="role-dashboard__bar">
                <span>{chartStats.resolved}</span>
                <div className="role-dashboard__bar-fill resolved" style={{ height: getBarHeight(chartStats.resolved) }} />
              </div>
            </div>
            <div className="role-dashboard__chart-labels">
              <span>Pending</span>
              <span>Assigned</span>
              <span>Resolved</span>
            </div>
          </div>
        </section>

        <section className="card role-dashboard__panel">
          <h2>Department Queue</h2>
          {!hasWorkerDirectory ? (
            <p className="text-muted" style={{ marginBottom: 10 }}>
              Worker directory unavailable. Enter a worker user ID to assign.
              {workerDirectoryError ? ` (${workerDirectoryError})` : ''}
            </p>
          ) : null}
          {loading ? (
            <p className="text-muted">Loading...</p>
          ) : issues.length === 0 ? (
            <p className="text-muted">No issues assigned to your department.</p>
          ) : (
            <div className="table-wrapper">
              <table className="role-dashboard__table">
                <thead>
                  <tr>
                    <th>Issue</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Reporter</th>
                    <th>Worker ID</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.map((issue) => {
                    const issueId = getIssueId(issue);
                    const issueStatus = String(issue?.status || '').toLowerCase();
                    return (
                    <tr key={issueId || issue.title}>
                      <td>{issue.title}</td>
                      <td>{issue.status}</td>
                      <td>{issue.category}</td>
                      <td>{issue.reportedBy?.name || '-'}</td>
                      <td>{getWorkerDisplayId(issue.assignedWorker)}</td>
                      <td>
                        <div className="role-dashboard__actions">
                          <button
                            type="button"
                            disabled={workingId === issueId}
                            onClick={() => runAction(issueId, () => reviewOfficerIssue(issueId))}
                          >
                            Review
                          </button>
                          {hasWorkerDirectory ? (
                            <select
                              value={workerInputs[issueId] ?? ''}
                              onChange={(e) =>
                                setWorkerInputs((prev) => ({ ...prev, [issueId]: e.target.value }))
                              }
                              disabled={workingId === issueId}
                            >
                              <option value="">Select worker</option>
                              {availableWorkers.map((worker) => (
                                <option key={worker._id || worker.id || worker.email} value={worker._id || worker.id || ''}>
                                  {getWorkerOptionLabel(worker)}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              placeholder="Worker ID"
                              value={workerInputs[issueId] ?? ''}
                              onChange={(e) =>
                                setWorkerInputs((prev) => ({ ...prev, [issueId]: e.target.value }))
                              }
                            />
                          )}
                          <button
                            type="button"
                            disabled={workingId === issueId || !(workerInputs[issueId] || '').trim()}
                            onClick={() =>
                              runAction(issueId, () =>
                                assignOfficerWorker(issueId, String(workerInputs[issueId]).trim())
                              )
                            }
                          >
                            Assign
                          </button>
                          {hasWorkerDirectory && (workerInputs[issueId] || '').trim() ? (
                            (() => {
                              const selectedId = String(workerInputs[issueId]).trim();
                              const selected = availableWorkers.find((w) => String(w?._id ?? w?.id) === selectedId);
                              if (!selected) return null;
                              const explicitLoad =
                                selected?.activeTasks ?? selected?.activeTaskCount ?? selected?.currentTaskLoad ?? selected?.currentLoad;
                              const computedLoad = selected?._id ? activeLoadByWorkerId.get(String(selected._id)) : undefined;
                              const load =
                                typeof explicitLoad === 'number'
                                  ? explicitLoad
                                  : typeof computedLoad === 'number'
                                    ? computedLoad
                                    : 'N/A';
                              return (
                                <span className="text-muted" style={{ width: '100%' }}>
                                  Worker ID: {getWorkerDisplayId(selected)} | Name: {selected?.name || '-'} | Department:{' '}
                                  {getDepartmentName(selected) || '-'} | Active Tasks: {load}
                                </span>
                              );
                            })()
                          ) : null}
                          <select
                            defaultValue={issueStatus || 'reported'}
                            disabled={workingId === issueId}
                            onChange={(e) =>
                              runAction(issueId, () => updateOfficerIssueStatus(issueId, e.target.value))
                            }
                          >
                            {officerStatuses
                              .filter((status) => status === issueStatus || canTransition(issueStatus, status))
                              .map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default OfficerDashboard;
