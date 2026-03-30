import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRoleUpgradeRequestsAdmin, reviewRoleUpgradeRequestAdmin } from '@api/roleUpgrade.api';
import { getDepartmentsAdmin } from '@api/admin.api';
import { getErrorMessage } from '@api/utils';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import Loader from '../../components/common/Loader/Loader';
import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
import './RoleUpgradeRequests.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const formatRole = (role) => {
  const v = String(role || '').trim();
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : '-';
};

const DetailRow = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="rr-detail__row">
      <span className="rr-detail__label">{label}</span>
      <span className="rr-detail__value">{value}</span>
    </div>
  );
};

const RecentCard = ({ req, onClick }) => (
  <button type="button" className={`rr-recent__card rr-recent__card--${req.status}`} onClick={() => onClick(req)}>
    <div className="rr-recent__top">
      <strong>{req?.user?.name || 'Unknown'}</strong>
      <span className={`role-requests__status role-requests__status--${req.status}`}>{req.status}</span>
    </div>
    <div className="rr-recent__meta">
      {formatRole(req.currentRole)} → {formatRole(req.requestedRole)}
    </div>
    <div className="rr-recent__meta">{new Date(req.createdAt).toLocaleDateString()}</div>
    {req.adminNotes && <div className="rr-recent__notes">"{req.adminNotes}"</div>}
  </button>
);

const RoleUpgradeRequests = () => {
  const { showToast } = useToast();
  const { confirm } = useModal();

  const [requests, setRequests] = useState([]);
  const [recentReviewed, setRecentReviewed] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');
  const [filters, setFilters] = useState({ status: 'pending', search: '' });
  const [selected, setSelected] = useState(null); // the request being reviewed
  const [deptId, setDeptId] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const payload = await getRoleUpgradeRequestsAdmin({
        status: filters.status || undefined,
        limit: 200,
      });
      const items = Array.isArray(payload?.data) ? payload.data : [];
      setRequests(items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters.status]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Fetch last 5 reviewed (approved/rejected) independently of the filter
  useEffect(() => {
    let mounted = true;
    const fetchRecent = async () => {
      try {
        const [approvedRes, rejectedRes] = await Promise.all([
          getRoleUpgradeRequestsAdmin({ status: 'approved', limit: 5 }),
          getRoleUpgradeRequestsAdmin({ status: 'rejected', limit: 5 }),
        ]);
        if (!mounted) return;
        const approved = Array.isArray(approvedRes?.data) ? approvedRes.data : [];
        const rejected = Array.isArray(rejectedRes?.data) ? rejectedRes.data : [];
        const merged = [...approved, ...rejected]
          .sort((a, b) => new Date(b.reviewedAt || b.updatedAt) - new Date(a.reviewedAt || a.updatedAt))
          .slice(0, 5);
        setRecentReviewed(merged);
      } catch { /* silent */ }
    };
    fetchRecent();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    getDepartmentsAdmin().then((data) => {
      if (!mounted) return;
      const raw = Array.isArray(data) ? data : [];
      const seen = new Set();
      const deduped = raw.filter((d) => {
        const k = String(d?.name || '').toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      setDepartments(deduped.sort((a, b) => String(a.name).localeCompare(String(b.name))));
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  const filteredRequests = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((req) => {
      const u = req?.user || {};
      return `${u.name || ''} ${u.email || ''} ${req.requestedRole || ''}`.toLowerCase().includes(q);
    });
  }, [filters.search, requests]);

  const openDetail = (req) => {
    setSelected(req);
    setDeptId(req?.department?._id || req?.department || '');
    setAdminNotes(req?.adminNotes || '');
  };

  const closeDetail = () => setSelected(null);

  const handleDecision = async (decision) => {
    const req = selected;
    const requiresDept = ['officer', 'worker'].includes(String(req?.requestedRole || ''));

    if (decision === 'approved' && requiresDept && !deptId) {
      showToast('Select a department before approving.', { tone: 'error' });
      return;
    }

    const ok = await confirm({
      title: decision === 'approved' ? 'Approve request' : 'Reject request',
      message: decision === 'approved'
        ? `Approve ${req?.user?.name || 'this user'} as ${formatRole(req?.requestedRole)}?`
        : `Reject this role upgrade request?`,
      confirmLabel: decision === 'approved' ? 'Approve' : 'Reject',
      tone: decision === 'approved' ? 'success' : 'danger',
    });
    if (!ok) return;

    setWorkingId(req._id);
    try {
      const updated = await reviewRoleUpgradeRequestAdmin(req._id, {
        status: decision,
        adminNotes: adminNotes.trim(),
        departmentId: deptId || undefined,
      });
      setRequests((prev) => prev.map((item) => item._id === updated?._id ? updated : item));
      setSelected(updated);
      // Refresh recent reviewed
      if (updated?.status === 'approved' || updated?.status === 'rejected') {
        setRecentReviewed((prev) => {
          const filtered = prev.filter((r) => r._id !== updated._id);
          return [updated, ...filtered].slice(0, 5);
        });
      }
      showToast(`Request ${decision}.`, { tone: 'success' });
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
    } finally {
      setWorkingId('');
    }
  };

  if (loading) return <Loader fullScreen />;

  const isPending = selected?.status === 'pending';
  const requiresDept = ['officer', 'worker'].includes(String(selected?.requestedRole || ''));

  return (
    <section className="role-requests page">
      <div className="container">
        <PageHeader
          title="Role Upgrade Requests"
          subtitle="Review and approve role upgrade applications."
        />

        <div className="role-requests__toolbar">
          <input
            type="search"
            placeholder="Search by name or email"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="button" className="role-requests__refresh" onClick={fetchRequests}>
            Refresh
          </button>
        </div>

        {error && <div className="issues-error">{error}</div>}

        {/* RECENT REQUESTS */}
        {recentReviewed.length > 0 && (
          <div className="rr-recent">
            <h2 className="rr-recent__heading">Recent Activity</h2>
            <div className="rr-recent__list">
              {recentReviewed.map((req) => (
                <RecentCard key={req._id} req={req} onClick={openDetail} />
              ))}
            </div>
          </div>
        )}

        <div className={`rr-layout ${selected ? 'rr-layout--split' : ''}`}>
          {/* LIST */}
          <section className="card role-requests__table table-wrapper">
            <table className="role-requests__grid">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Current</th>
                  <th>Requested</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="role-requests__empty">No requests found.</td>
                  </tr>
                ) : filteredRequests.map((req) => (
                  <tr
                    key={req._id}
                    className={`rr-row ${selected?._id === req._id ? 'rr-row--active' : ''}`}
                    onClick={() => openDetail(req)}
                  >
                    <td>
                      <strong>{req?.user?.name || 'Unknown'}</strong>
                      <div className="role-requests__meta">{req?.user?.email || '-'}</div>
                    </td>
                    <td>{formatRole(req.currentRole)}</td>
                    <td>{formatRole(req.requestedRole)}</td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`role-requests__status role-requests__status--${req.status}`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* DETAIL PANEL */}
          {selected && (
            <aside className="rr-detail card">
              <div className="rr-detail__head">
                <div>
                  <h2 className="rr-detail__title">
                    {selected?.user?.name || 'Unknown'}
                    <span className={`role-requests__status role-requests__status--${selected.status}`}>
                      {selected.status}
                    </span>
                  </h2>
                  <p className="rr-detail__sub">{selected?.user?.email}</p>
                </div>
                <button type="button" className="rr-detail__close" onClick={closeDetail}>✕</button>
              </div>

              <div className="rr-detail__section">
                <h3>Role Request</h3>
                <DetailRow label="Current role" value={formatRole(selected.currentRole)} />
                <DetailRow label="Requested role" value={formatRole(selected.requestedRole)} />
                <DetailRow label="Preferred department" value={selected.preferredDepartment} />
                <DetailRow label="Submitted" value={new Date(selected.createdAt).toLocaleString()} />
              </div>

              <div className="rr-detail__section">
                <h3>Application Details</h3>
                <DetailRow label="Motivation" value={selected.motivation} />
                <DetailRow label="Experience" value={selected.experience} />
                <DetailRow label="Availability" value={selected.availability} />
                <DetailRow label="Skills" value={selected.skills} />
                {Array.isArray(selected.supportingLinks) && selected.supportingLinks.length > 0 && (
                  <div className="rr-detail__row">
                    <span className="rr-detail__label">Supporting links</span>
                    <div className="rr-detail__links">
                      {selected.supportingLinks.map((link, i) => (
                        <a key={i} href={link} target="_blank" rel="noreferrer">{link}</a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {selected.adminNotes && !isPending && (
                <div className="rr-detail__section">
                  <h3>Admin Notes</h3>
                  <p className="rr-detail__notes">{selected.adminNotes}</p>
                </div>
              )}

              {isPending && (
                <div className="rr-detail__section rr-detail__actions">
                  <h3>Review</h3>

                  {requiresDept && (
                    <label className="rr-detail__field">
                      <span>Assign department <span className="rr-required">*</span></span>
                      <select
                        value={deptId}
                        onChange={(e) => setDeptId(e.target.value)}
                        disabled={!!workingId}
                      >
                        <option value="">Select department</option>
                        {departments.map((d) => (
                          <option key={d._id} value={d._id}>{d.name}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  <label className="rr-detail__field">
                    <span>Admin notes (optional)</span>
                    <textarea
                      rows={3}
                      placeholder="Add notes for the applicant..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      disabled={!!workingId}
                    />
                  </label>

                  <div className="rr-detail__buttons">
                    <button
                      type="button"
                      className="rr-btn rr-btn--approve"
                      onClick={() => handleDecision('approved')}
                      disabled={!!workingId}
                    >
                      {workingId === selected._id ? 'Processing…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      className="rr-btn rr-btn--reject"
                      onClick={() => handleDecision('rejected')}
                      disabled={!!workingId}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </aside>
          )}
        </div>
      </div>
    </section>
  );
};

export default RoleUpgradeRequests;
