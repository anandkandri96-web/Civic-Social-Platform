import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRole } from '../../hooks/useRole';
import './Profile.css';

const ROLE_SUMMARY = {
  citizen: {
    title: 'Citizen Profile',
    badge: 'CT',
    accent: '#00c8f8',
    stats: [
      ['Role', 'Citizen'],
      ['Primary Action', 'Report & track issues'],
      ['Access', 'Issue reporting, voting, map'],
    ],
  },
  volunteer: {
    title: 'Volunteer Profile',
    badge: 'VO',
    accent: '#00e5a0',
    stats: [
      ['Role', 'Volunteer'],
      ['Primary Action', 'Community resolution'],
      ['Access', 'Claim, progress, resolve'],
    ],
  },
  officer: {
    title: 'Officer Profile',
    badge: 'OF',
    accent: '#ffd166',
    stats: [
      ['Role', 'Department Officer'],
      ['Primary Action', 'Review & assign'],
      ['Access', 'Department queue, analytics'],
    ],
  },
  worker: {
    title: 'Field Worker Profile',
    badge: 'WK',
    accent: '#ff7a35',
    stats: [
      ['Role', 'Field Worker'],
      ['Primary Action', 'Execute tasks'],
      ['Access', 'Task acceptance, updates'],
    ],
  },
  admin: {
    title: 'Admin Profile',
    badge: 'AD',
    accent: '#ff4560',
    stats: [
      ['Role', 'Administrator'],
      ['Primary Action', 'Govern platform'],
      ['Access', 'Users, issues, system analytics'],
    ],
  },
};

const Profile = () => {
  const { user } = useAuth();
  const { role } = useRole();

  const profileMeta = useMemo(() => ROLE_SUMMARY[role] || ROLE_SUMMARY.citizen, [role]);

  return (
    <section className="profile-page" style={{ '--profile-accent': profileMeta.accent }}>
      <div className="profile-header card">
        <div className="profile-avatar">{profileMeta.badge}</div>
        <div>
          <h1>{profileMeta.title}</h1>
          <p>{user?.name || 'User'}</p>
          <small>{user?.email || 'No email available'}</small>
        </div>
      </div>

      <div className="profile-grid">
        <article className="card profile-panel">
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

        <article className="card profile-panel">
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
      </div>
    </section>
  );
};

export default Profile;
