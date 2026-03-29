import { useEffect, useState } from 'react';
import {
  approveUserAdmin,
  assignUserDepartmentAdmin,
  deleteUserAdmin,
  getAdminUsers,
  getDepartmentsAdmin,
  updateUserRoleAdmin,
  updateUserStatusAdmin,
} from '@api/admin.api';
import { getErrorMessage } from '@api/utils';
import Loader from '../../components/common/Loader/Loader';
import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
import './UserManagement.css';

const ROLE_OPTIONS = ['citizen', 'volunteer', 'officer', 'worker', 'admin'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState('');
  const [drafts, setDrafts] = useState({});
  const { showToast } = useToast();
  const { confirm } = useModal();

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [usersRes, deptsRes] = await Promise.all([
          getAdminUsers({ limit: 200 }),
          getDepartmentsAdmin(),
        ]);
        if (!mounted) return;
        setUsers(Array.isArray(usersRes?.data) ? usersRes.data : []);
        const rawDepts = Array.isArray(deptsRes) ? deptsRes : [];
        const deduped = [];
        const seen = new Set();
        for (const dept of rawDepts) {
          const name = String(dept?.name || '').trim();
          if (!name) continue;
          const key = name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          deduped.push({ ...dept, name });
        }
        setDepartments(deduped.sort((a, b) => String(a.name).localeCompare(String(b.name))));
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => { mounted = false; };
  }, []);

  const patchUser = (nextUser) => {
    setUsers((prev) => prev.map((u) => (u._id === nextUser._id ? { ...u, ...nextUser } : u)));
  };

  const setDraft = (userId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
  };

  const getDraft = (user, field) => {
    return drafts[user._id]?.[field] ?? (
      field === 'role' ? user.role :
      field === 'department' ? (user.department?._id || user.department || '') :
      null
    );
  };

  const hasDraft = (user) => {
    const draft = drafts[user._id];
    if (!draft) return false;
    const roleChanged = draft.role !== undefined && draft.role !== user.role;
    const deptChanged = draft.department !== undefined && draft.department !== (user.department?._id || user.department || '');
    return roleChanged || deptChanged;
  };

  const handleSave = async (user) => {
    if (!hasDraft(user)) return;
    const draft = drafts[user._id];
    setWorking(user._id);
    try {
      const actions = [];
      if (draft.role !== undefined && draft.role !== user.role)
        actions.push(updateUserRoleAdmin(user._id, draft.role));
      if (draft.department !== undefined && draft.department !== (user.department?._id || user.department || ''))
        actions.push(assignUserDepartmentAdmin(user._id, draft.department));
      const results = await Promise.all(actions);
      results.forEach((r) => { if (r?._id) patchUser(r); });
      setDrafts((prev) => { const next = { ...prev }; delete next[user._id]; return next; });
      showToast('User updated', { tone: 'success' });
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
    } finally {
      setWorking('');
    }
  };

  const runUserAction = async (userId, action) => {
    setWorking(userId);
    try {
      const updated = await action();
      if (updated?._id) patchUser(updated);
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
    } finally {
      setWorking('');
    }
  };

  const handleDeleteUser = async (userId) => {
    const approved = await confirm({
      title: 'Delete user',
      message: 'Delete this user?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!approved) return;
    setWorking(userId);
    try {
      await deleteUserAdmin(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
    } finally {
      setWorking('');
    }
  };

  if (loading) return <Loader fullScreen />;

  return (
    <section className="user-management-page page">
      <div className="container">
        <header className="user-management-header">
          <div>
            <h1>User & Department Management</h1>
            <p>Manage roles, approval status, account status, and department assignments.</p>
          </div>
        </header>

        {error && <div className="issues-error">{error}</div>}

        <section className="card user-table-wrap table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Approved</th>
                <th>Active</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      value={getDraft(user, 'role')}
                      disabled={working === user._id}
                      onChange={(e) => setDraft(user._id, 'role', e.target.value)}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={working === user._id}
                      onClick={() => runUserAction(user._id, () => approveUserAdmin(user._id, !user.isApproved))}
                    >
                      {user.isApproved ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      disabled={working === user._id}
                      onClick={() => runUserAction(user._id, () => updateUserStatusAdmin(user._id, !user.isActive))}
                    >
                      {user.isActive ? 'Active' : 'Disabled'}
                    </button>
                  </td>
                  <td>
                    <select
                      value={getDraft(user, 'department')}
                      disabled={working === user._id}
                      onChange={(e) => setDraft(user._id, 'department', e.target.value)}
                    >
                      <option value="" disabled>Select department</option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>{dept.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="user-actions-cell">
                      <button
                        type="button"
                        className="save"
                        disabled={working === user._id || !hasDraft(user)}
                        onClick={() => handleSave(user)}
                      >
                        {working === user._id ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="danger"
                        disabled={working === user._id}
                        onClick={() => handleDeleteUser(user._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </section>
  );
};

export default UserManagement;
