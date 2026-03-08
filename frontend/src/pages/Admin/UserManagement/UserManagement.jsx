import { useEffect, useState } from 'react';
import {
  approveUserAdmin,
  assignUserDepartmentAdmin,
  createDepartmentAdmin,
  deleteUserAdmin,
  getAdminUsers,
  getDepartmentsAdmin,
  updateUserRoleAdmin,
  updateUserStatusAdmin,
} from '@api/admin.api';
import { getErrorMessage } from '@api/utils';
import Loader from '../../../components/common/Loader/Loader';
import './UserManagement.css';

const ROLE_OPTIONS = ['citizen', 'volunteer', 'officer', 'worker', 'admin'];

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState('');
  const [newDepartmentName, setNewDepartmentName] = useState('');

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
        setDepartments(Array.isArray(deptsRes) ? deptsRes : []);
      } catch (err) {
        if (!mounted) return;
        setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
    };
  }, []);

  const patchUser = (nextUser) => {
    setUsers((prev) => prev.map((u) => (u._id === nextUser._id ? { ...u, ...nextUser } : u)));
  };

  const runUserAction = async (userId, action) => {
    setWorking(userId);
    try {
      const updated = await action();
      if (updated?._id) patchUser(updated);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setWorking('');
    }
  };

  const handleCreateDepartment = async () => {
    const name = newDepartmentName.trim();
    if (!name) return;

    setWorking('create-dept');
    try {
      const created = await createDepartmentAdmin({ name });
      setDepartments((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewDepartmentName('');
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setWorking('');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    setWorking(userId);
    try {
      await deleteUserAdmin(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
    } catch (err) {
      alert(getErrorMessage(err));
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
          <div className="dept-create">
            <input
              type="text"
              placeholder="New department name"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
            />
            <button type="button" onClick={handleCreateDepartment} disabled={working === 'create-dept'}>
              Add Department
            </button>
          </div>
        </header>

        {error && <div className="issues-error">{error}</div>}

        <section className="card user-table-wrap">
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
                      value={user.role}
                      disabled={working === user._id}
                      onChange={(e) => runUserAction(user._id, () => updateUserRoleAdmin(user._id, e.target.value))}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
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
                      value={user.department?._id || user.department || ''}
                      disabled={working === user._id}
                      onChange={(e) =>
                        runUserAction(user._id, () => assignUserDepartmentAdmin(user._id, e.target.value))
                      }
                    >
                      <option value="" disabled>
                        Select department
                      </option>
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="danger"
                      disabled={working === user._id}
                      onClick={() => handleDeleteUser(user._id)}
                    >
                      Delete
                    </button>
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

