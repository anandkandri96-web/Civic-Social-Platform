import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminUsers, getAllIssuesAdmin } from '@api/admin.api';
import { getErrorMessage } from '@api/utils';
import Skeleton from '../../components/common/Skeleton/Skeleton';
import DashboardCardSkeleton from '../../components/common/Skeleton/DashboardCardSkeleton';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import { getActiveLabel, getDepartmentName, getOfficerDisplayId, getWorkerDisplayId } from '../../utils/userDisplay';
import './AdminDashboard.css';

const SAFE_ROLE_LIMIT = 100;
const SAFE_MAX_PAGES = 10;

const sortDirFor = (prev, key) => {
  if (prev.key !== key) return { key, dir: 'asc' };
  return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
};

const compareValues = (a, b, dir) => {
  if (a == null && b == null) return 0;
  if (a == null) return dir === 'asc' ? 1 : -1;
  if (b == null) return dir === 'asc' ? -1 : 1;

  if (typeof a === 'number' && typeof b === 'number') return dir === 'asc' ? a - b : b - a;
  const as = String(a).toLowerCase();
  const bs = String(b).toLowerCase();
  return dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
};

const AdminDashboard = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [officers, setOfficers] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [peopleError, setPeopleError] = useState('');

  const [officerQuery, setOfficerQuery] = useState('');
  const [workerQuery, setWorkerQuery] = useState('');
  const [officerSort, setOfficerSort] = useState({ key: 'name', dir: 'asc' });
  const [workerSort, setWorkerSort] = useState({ key: 'name', dir: 'asc' });

  useEffect(() => {
    let mounted = true;

    const fetchIssues = async () => {
      setLoading(true);
      setError('');

      try {
        const payload = await getAllIssuesAdmin({ limit: 200 });
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

  useEffect(() => {
    let mounted = true;

    const fetchAllByRole = async (role) => {
      const first = await getAdminUsers({ role, page: 1, limit: SAFE_ROLE_LIMIT });
      const data = Array.isArray(first?.data) ? first.data : [];
      const pages = Math.min(Number(first?.pagination?.pages || 1), SAFE_MAX_PAGES);
      for (let page = 2; page <= pages; page += 1) {
        const next = await getAdminUsers({ role, page, limit: SAFE_ROLE_LIMIT });
        if (Array.isArray(next?.data)) data.push(...next.data);
      }
      return data;
    };

    const fetchPeople = async () => {
      setPeopleLoading(true);
      setPeopleError('');
      try {
        const [nextOfficers, nextWorkers] = await Promise.all([fetchAllByRole('officer'), fetchAllByRole('worker')]);
        if (!mounted) return;
        setOfficers(nextOfficers);
        setWorkers(nextWorkers);
      } catch (err) {
        if (mounted) setPeopleError(getErrorMessage(err));
      } finally {
        if (mounted) setPeopleLoading(false);
      }
    };

    fetchPeople();
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

  const issueCountsByDepartmentId = useMemo(() => {
    const counts = new Map();
    for (const issue of issues) {
      const deptId = issue?.assignedDepartment?._id ?? issue?.assignedDepartment;
      if (!deptId) continue;
      const key = String(deptId);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [issues]);

  const issueCountsByWorkerId = useMemo(() => {
    const counts = new Map();
    for (const issue of issues) {
      const workerId = issue?.assignedWorker?._id ?? issue?.assignedWorker;
      if (!workerId) continue;
      const key = String(workerId);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [issues]);

  const completedCountsByWorkerId = useMemo(() => {
    const doneStatuses = new Set(['resolved', 'resolved_by_community', 'citizen_verified', 'closed']);
    const counts = new Map();
    for (const issue of issues) {
      if (!doneStatuses.has(String(issue?.status || '').toLowerCase())) continue;
      const workerId = issue?.assignedWorker?._id ?? issue?.assignedWorker;
      if (!workerId) continue;
      const key = String(workerId);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [issues]);

  const officerRows = useMemo(() => {
    return (Array.isArray(officers) ? officers : []).map((officer) => {
      const deptId = officer?.department?._id ?? officer?.department;
      const assigned = deptId ? issueCountsByDepartmentId.get(String(deptId)) || 0 : 0;
      return {
        officer,
        officerId: getOfficerDisplayId(officer),
        name: officer?.name || '-',
        department: getDepartmentName(officer) || '-',
        email: officer?.email || '',
        assignedIssues: assigned,
        status: getActiveLabel(officer?.isActive),
      };
    });
  }, [officers, issueCountsByDepartmentId]);

  const workerRows = useMemo(() => {
    return (Array.isArray(workers) ? workers : []).map((worker) => {
      const id = worker?._id ?? worker?.id;
      const key = id ? String(id) : '';
      return {
        worker,
        workerId: getWorkerDisplayId(worker),
        name: worker?.name || '-',
        department: getDepartmentName(worker) || '-',
        assignedTasks: key ? issueCountsByWorkerId.get(key) || 0 : 0,
        completedTasks: key ? completedCountsByWorkerId.get(key) || 0 : 0,
        status: getActiveLabel(worker?.isActive),
      };
    });
  }, [workers, issueCountsByWorkerId, completedCountsByWorkerId]);

  const filteredOfficerRows = useMemo(() => {
    const q = officerQuery.trim().toLowerCase();
    const rows = q
      ? officerRows.filter((r) => {
          const hay = `${r.officerId} ${r.name} ${r.department} ${r.email} ${r.status}`.toLowerCase();
          return hay.includes(q);
        })
      : officerRows;

    const sortKey = officerSort.key;
    return [...rows].sort((a, b) => compareValues(a[sortKey], b[sortKey], officerSort.dir));
  }, [officerRows, officerQuery, officerSort]);

  const filteredWorkerRows = useMemo(() => {
    const q = workerQuery.trim().toLowerCase();
    const rows = q
      ? workerRows.filter((r) => {
          const hay = `${r.workerId} ${r.name} ${r.department} ${r.status}`.toLowerCase();
          return hay.includes(q);
        })
      : workerRows;

    const sortKey = workerSort.key;
    return [...rows].sort((a, b) => compareValues(a[sortKey], b[sortKey], workerSort.dir));
  }, [workerRows, workerQuery, workerSort]);

  const getBarHeight = (value) => {
    const max = Math.max(stats.pending, stats.assigned, stats.resolved, 1);
    const ratio = value / max;
    return `${Math.max(16, Math.round(ratio * 100))}%`;
  };

  if (loading) {
    return (
      <section className="admin-dashboard page">
        <div className="container">
          <div style={{ marginBottom: 16 }}>
            <Skeleton height={34} width="40%" />
            <Skeleton height={16} width="55%" style={{ marginTop: 10 }} />
          </div>
          <div className="admin-stats-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <DashboardCardSkeleton key={i} />
            ))}
          </div>
          <div className="admin-dashboard-panels" style={{ marginTop: 12 }}>
            <Skeleton height={220} />
            <Skeleton height={220} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="admin-dashboard page">
      <div className="container">
        <PageHeader
          title="Admin Dashboard"
          subtitle="System health and issue trends at a glance."
        />

        {error && <div className="issues-error">{error}</div>}

        <div className="admin-stats-grid">
          <article className="admin-stat-card card">
            <span>Total Issues</span>
            <h2>{stats.total}</h2>
          </article>
          <article className="admin-stat-card card">
            <span>Pending</span>
            <h2>{stats.pending}</h2>
          </article>
          <article className="admin-stat-card card">
            <span>Assigned</span>
            <h2>{stats.assigned}</h2>
          </article>
          <article className="admin-stat-card card">
            <span>Resolved</span>
            <h2>{stats.resolved}</h2>
          </article>
        </div>

        <div className="admin-dashboard-panels">
          <section className="card admin-panel">
            <h3>Issue Status Distribution</h3>
            <div className="admin-chart-wrap">
              <div className="admin-chart">
                <div className="admin-bar-wrapper">
                  <span className="admin-bar-value">{stats.pending}</span>
                  <div className="admin-bar pending" style={{ height: getBarHeight(stats.pending) }} />
                </div>
                <div className="admin-bar-wrapper">
                  <span className="admin-bar-value">{stats.assigned}</span>
                  <div className="admin-bar assigned" style={{ height: getBarHeight(stats.assigned) }} />
                </div>
                <div className="admin-bar-wrapper">
                  <span className="admin-bar-value">{stats.resolved}</span>
                  <div className="admin-bar resolved" style={{ height: getBarHeight(stats.resolved) }} />
                </div>
              </div>
              <div className="admin-chart-baseline" />
              <div className="admin-chart-labels">
                <span>Pending</span>
                <span>Assigned</span>
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
                      {issue.category || 'other'} - {issue.status || 'reported'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="admin-management">
          <header className="admin-management__head">
            <h2>Officer Management</h2>
            <div className="admin-table-toolbar">
              <input
                type="search"
                placeholder="Search officers..."
                value={officerQuery}
                onChange={(e) => setOfficerQuery(e.target.value)}
              />
              <span className="admin-table-count">{filteredOfficerRows.length} results</span>
            </div>
          </header>

          {peopleError ? <div className="issues-error">{peopleError}</div> : null}
          {peopleLoading ? (
            <div className="card admin-panel">
              <p className="admin-note">Loading officers...</p>
            </div>
          ) : (
            <div className="card admin-panel admin-table-wrap table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>
                      <button type="button" className="admin-th-btn" onClick={() => setOfficerSort((p) => sortDirFor(p, 'officerId'))}>
                        Officer ID
                      </button>
                    </th>
                    <th>
                      <button type="button" className="admin-th-btn" onClick={() => setOfficerSort((p) => sortDirFor(p, 'name'))}>
                        Officer Name
                      </button>
                    </th>
                    <th>
                      <button type="button" className="admin-th-btn" onClick={() => setOfficerSort((p) => sortDirFor(p, 'department'))}>
                        Department
                      </button>
                    </th>
                    <th>
                      <button type="button" className="admin-th-btn" onClick={() => setOfficerSort((p) => sortDirFor(p, 'email'))}>
                        Email
                      </button>
                    </th>
                    <th className="admin-num">
                      <button type="button" className="admin-th-btn" onClick={() => setOfficerSort((p) => sortDirFor(p, 'assignedIssues'))}>
                        Assigned Issues
                      </button>
                    </th>
                    <th>
                      <button type="button" className="admin-th-btn" onClick={() => setOfficerSort((p) => sortDirFor(p, 'status'))}>
                        Status
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOfficerRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-empty">No officers found.</td>
                    </tr>
                  ) : (
                    filteredOfficerRows.map((row) => (
                      <tr key={row.officer?._id || row.officerId}>
                        <td className="admin-mono">{row.officerId || 'N/A'}</td>
                        <td>{row.name}</td>
                        <td>{row.department}</td>
                        <td>{row.email || '-'}</td>
                        <td className="admin-num">{row.assignedIssues}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <p className="admin-table-footnote">
                Assigned issues count is calculated from issues currently loaded in this dashboard.
              </p>
            </div>
          )}
        </section>

        <section className="admin-management">
          <header className="admin-management__head">
            <h2>Worker Management</h2>
            <div className="admin-table-toolbar">
              <input
                type="search"
                placeholder="Search workers..."
                value={workerQuery}
                onChange={(e) => setWorkerQuery(e.target.value)}
              />
              <span className="admin-table-count">{filteredWorkerRows.length} results</span>
            </div>
          </header>

          {peopleError ? <div className="issues-error">{peopleError}</div> : null}
          {peopleLoading ? (
            <div className="card admin-panel">
              <p className="admin-note">Loading workers...</p>
            </div>
          ) : (
            <div className="card admin-panel admin-table-wrap table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>
                      <button type="button" className="admin-th-btn" onClick={() => setWorkerSort((p) => sortDirFor(p, 'workerId'))}>
                        Worker ID
                      </button>
                    </th>
                    <th>
                      <button type="button" className="admin-th-btn" onClick={() => setWorkerSort((p) => sortDirFor(p, 'name'))}>
                        Name
                      </button>
                    </th>
                    <th>
                      <button type="button" className="admin-th-btn" onClick={() => setWorkerSort((p) => sortDirFor(p, 'department'))}>
                        Department
                      </button>
                    </th>
                    <th className="admin-num">
                      <button type="button" className="admin-th-btn" onClick={() => setWorkerSort((p) => sortDirFor(p, 'assignedTasks'))}>
                        Assigned Tasks
                      </button>
                    </th>
                    <th className="admin-num">
                      <button type="button" className="admin-th-btn" onClick={() => setWorkerSort((p) => sortDirFor(p, 'completedTasks'))}>
                        Completed Tasks
                      </button>
                    </th>
                    <th>
                      <button type="button" className="admin-th-btn" onClick={() => setWorkerSort((p) => sortDirFor(p, 'status'))}>
                        Status
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWorkerRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-empty">No workers found.</td>
                    </tr>
                  ) : (
                    filteredWorkerRows.map((row) => (
                      <tr key={row.worker?._id || row.workerId}>
                        <td className="admin-mono">{row.workerId || 'N/A'}</td>
                        <td>{row.name}</td>
                        <td>{row.department}</td>
                        <td className="admin-num">{row.assignedTasks}</td>
                        <td className="admin-num">{row.completedTasks}</td>
                        <td>{row.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <p className="admin-table-footnote">
                Task counts are approximated from issues currently loaded in this dashboard (assigned worker and resolved/closed statuses).
              </p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default AdminDashboard;
