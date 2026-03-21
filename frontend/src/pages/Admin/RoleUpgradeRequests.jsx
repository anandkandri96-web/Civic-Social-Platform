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
  const value = String(role || '').trim();
  if (!value) return '-';
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
};

const RoleUpgradeRequests = () => {
  const { showToast } = useToast();
  const { confirm } = useModal();

  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [workingId, setWorkingId] = useState('');
  const [filters, setFilters] = useState({ status: 'pending', search: '' });
  const [notesById, setNotesById] = useState({});
  const [deptById, setDeptById] = useState({});

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

      const nextDeptMap = {};
      items.forEach((req) => {
        const id = req?._id;
        if (!id) return;
        const deptId = req?.department?._id || req?.department;
        if (deptId) nextDeptMap[id] = String(deptId);
      });
      setDeptById((prev) => ({ ...nextDeptMap, ...prev }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters.status]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    let mounted = true;
    const fetchDepts = async () => {
      try {
        const data = await getDepartmentsAdmin();
        if (!mounted) return;
        setDepartments(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) showToast(getErrorMessage(err), { tone: 'error' });
      }
    };
    fetchDepts();
    return () => {
      mounted = false;
    };
  }, [showToast]);

  const filteredRequests = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((req) => {
      const user = req?.user || {};
      const hay = `${user.name || ''} ${user.email || ''} ${req.requestedRole || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [filters.search, requests]);

  const handleDecision = async (request, decision) => {
    const requiresDept = ['officer', 'worker'].includes(String(request?.requestedRole || ''));
    const deptId = deptById[request._id];

    if (decision === 'approved' && requiresDept && !deptId) {
      showToast('Select a department before approving.', { tone: 'error' });
      return;
    }

    const approved = await confirm({
      title: decision === 'approved' ? 'Approve request' : 'Reject request',
      message:
        decision === 'approved'
          ? 'Approve this role upgrade request?'
          : 'Reject this role upgrade request?',
      confirmLabel: decision === 'approved' ? 'Approve' : 'Reject',
      tone: decision === 'approved' ? 'success' : 'danger',
    });

    if (!approved) return;

    setWorkingId(request._id);
    try {
      const payload = {
        decision,
        adminNotes: notesById[request._id] || '',
        departmentId: deptId || undefined,
      };
      const updated = await reviewRoleUpgradeRequestAdmin(request._id, payload);
      setRequests((prev) => prev.map((item) => (item._id === updated?._id ? updated : item)));
      showToast(`Request ${decision}.`, { tone: 'success' });
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
    } finally {
      setWorkingId('');
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <section className="role-requests page">
      <div className="container">
        <PageHeader
          title="Role Upgrade Requests"
          subtitle="Review and approve role upgrade applications from citizens and staff."
        />

        <div className="role-requests__toolbar">
          <input
            type="search"
            placeholder="Search by name or email"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          />
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button type="button" className="role-requests__refresh" onClick={fetchRequests}>
            Refresh
          </button>
        </div>

        {error && <div className="issues-error">{error}</div>}

        <section className="card role-requests__table table-wrapper">
          <table className="role-requests__grid">
            <thead>
              <tr>
                <th>User</th>
                <th>Current Role</th>
                <th>Requested Role</th>
                <th>Preferred Dept</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="role-requests__empty">No role upgrade requests found.</td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const user = req?.user || {};
                  const requiresDept = ['officer', 'worker'].includes(String(req?.requestedRole || ''));
                  const isPending = req.status === 'pending';
                  return (
                    <tr key={req._id}>
                      <td>
                        <strong>{user.name || 'Unknown'}</strong>
                        <div className="role-requests__meta">{user.email || '-'}</div>
                      </td>
                      <td>{formatRole(req.currentRole)}</td>
                      <td>{formatRole(req.requestedRole)}</td>
                      <td>
                        <div className="role-requests__meta">{req.preferredDepartment || '-'}</div>
                        {requiresDept && isPending ? (
                          <select
                            value={deptById[req._id] || ''}
                            onChange={(event) =>
                              setDeptById((prev) => ({ ...prev, [req._id]: event.target.value }))
                            }
                          >
                            <option value="">Select department</option>
                            {departments.map((dept) => (
                              <option key={dept._id} value={dept._id}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                        ) : req.department ? (
                          <div className="role-requests__meta">Assigned: {req.department?.name || req.department}</div>
                        ) : null}
                      </td>
                      <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span className={`role-requests__status role-requests__status--${req.status}`}>
                          {req.status}
                        </span>
                      </td>
                      <td>
                        <div className="role-requests__actions">
                          {isPending ? (
                            <>
                              <input
                                type="text"
                                placeholder="Admin notes"
                                value={notesById[req._id] || ''}
                                onChange={(event) =>
                                  setNotesById((prev) => ({ ...prev, [req._id]: event.target.value }))
                                }
                                disabled={workingId === req._id}
                              />
                              <div className="role-requests__buttons">
                                <button
                                  type="button"
                                  className="approve"
                                  onClick={() => handleDecision(req, 'approved')}
                                  disabled={workingId === req._id}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="reject"
                                  onClick={() => handleDecision(req, 'rejected')}
                                  disabled={workingId === req._id}
                                >
                                  Reject
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="role-requests__meta">
                              {req.adminNotes ? `Notes: ${req.adminNotes}` : 'No admin notes.'}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
};

export default RoleUpgradeRequests;
