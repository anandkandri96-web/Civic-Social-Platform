import { useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

import citizenIcon from '../../assets/citizen icon.png';
import officerIcon from '../../assets/officer icon.png';
import volunteerIcon from '../../assets/volunteer icon.png';
import workerIcon from '../../assets/worker icon.png';
import './Profile.css';

const ROLE_SUMMARY = {
  citizen: {
    title: 'Citizen Profile',
    badge: 'CT',
    icon: citizenIcon,
    accent: '#2F8398',
    stats: [
      ['Role', 'Citizen'],
      ['Primary Action', 'Report & track issues'],
      ['Access', 'Issue reporting, voting, map'],
    ],
  },
  volunteer: {
    title: 'Volunteer Profile',
    badge: 'VO',
    icon: volunteerIcon,
    accent: '#87A83F',
    stats: [
      ['Role', 'Volunteer'],
      ['Primary Action', 'Community resolution'],
      ['Access', 'Claim, progress, resolve'],
    ],
  },
  officer: {
    title: 'Officer Profile',
    badge: 'OF',
    icon: officerIcon,
    accent: '#C0C91E',
    stats: [
      ['Role', 'Department Officer'],
      ['Primary Action', 'Review & assign'],
      ['Access', 'Department queue, analytics'],
    ],
  },
  worker: {
    title: 'Field Worker Profile',
    badge: 'WK',
    icon: workerIcon,
    accent: '#F27C54',
    stats: [
      ['Role', 'Field Worker'],
      ['Primary Action', 'Execute tasks'],
      ['Access', 'Task acceptance, updates'],
    ],
  },
  admin: {
    title: 'Admin Profile',
    badge: 'AD',
    accent: '#2F8398',
    stats: [
      ['Role', 'Administrator'],
      ['Primary Action', 'Govern platform'],
      ['Access', 'Users, issues, system analytics'],
    ],
  },
};

const Profile = () => {
  const { user } = useAuth();
  // ✅ Get role from user object instead of useRole hook
  const role = user?.role || 'citizen';

  const profileMeta = useMemo(
    () => ROLE_SUMMARY[role] || ROLE_SUMMARY.citizen,
    [role]
  );

  const [form, setForm] = useState({
    current: '',
    newPass: '',
    confirm: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();

    setError('');
    setSuccess('');

    if (!form.current || !form.newPass || !form.confirm) {
      return setError('All fields are required');
    }

    if (form.newPass !== form.confirm) {
      return setError('Passwords do not match');
    }

    if (form.newPass.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    // 🔥 Replace this with API call
    console.log('Password update request:', form);

    setSuccess('Password updated successfully');
    setForm({ current: '', newPass: '', confirm: '' });
  };

  return (
    <section
      className="profile-page"
      style={{ '--profile-accent': profileMeta.accent }}
    >
      {/* HEADER */}
      <div className="profile-header">
        <div className="profile-avatar">
          {profileMeta.icon ? (
            <img
              className="profile-avatar__img"
              src={profileMeta.icon}
              alt="avatar"
            />
          ) : (
            profileMeta.badge
          )}
        </div>

        <div>
          <h1>{profileMeta.title}</h1>
          <p>{user?.name || 'User'}</p>
          <small>{user?.email || 'No email available'}</small>
        </div>
      </div>

      {/* GRID */}
      <div className="profile-grid">
        {/* ROLE */}
        <article className="profile-panel">
          <h2>Role Overview</h2>
          <div className="profile-list">
            {profileMeta.stats.map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </article>

        {/* ACCOUNT */}
        <article className="profile-panel">
          <h2>Account</h2>
          <div className="profile-list">
            <div>
              <span>Name</span>
              <strong>{user?.name || 'User'}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{user?.email || '-'}</strong>
            </div>
            <div>
              <span>Role Key</span>
              <strong>{role || 'citizen'}</strong>
            </div>
          </div>
        </article>

        {/* SECURITY */}
        <article className="profile-panel">
          <h2>Security</h2>

          <form
            className="profile-password-form"
            onSubmit={handlePasswordChange}
          >
            <input
              type="password"
              name="current"
              placeholder="Current Password"
              value={form.current}
              onChange={handleChange}
            />

            <input
              type="password"
              name="newPass"
              placeholder="New Password"
              value={form.newPass}
              onChange={handleChange}
            />

            <input
              type="password"
              name="confirm"
              placeholder="Confirm New Password"
              value={form.confirm}
              onChange={handleChange}
            />

            {error && <div className="profile-error">{error}</div>}
            {success && <div className="profile-success">{success}</div>}

            <button type="submit">Update Password</button>
          </form>
        </article>
      </div>
    </section>
  );
};

export default Profile;