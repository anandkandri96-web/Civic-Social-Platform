import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useRole } from '../../hooks/useRole';
import './DashboardLayout.css';

const ROLE_META = {
  admin: { label: 'Admin', accent: '#ff4560', icon: 'AD' },
  officer: { label: 'Dept. Officer', accent: '#ffd166', icon: 'OF' },
  worker: { label: 'Field Worker', accent: '#ff7a35', icon: 'WK' },
  volunteer: { label: 'Volunteer', accent: '#00e5a0', icon: 'VO' },
  citizen: { label: 'Citizen', accent: '#00c8f8', icon: 'CT' },
};

const TITLES = {
  '/dashboard': 'Citizen Dashboard',
  '/dashboard/volunteer': 'Volunteer Dashboard',
  '/dashboard/officer': 'Department Dashboard',
  '/dashboard/officer/analytics': 'Department Analytics',
  '/dashboard/worker': 'Worker Dashboard',
  '/dashboard/map': 'Issue Heatmap',
  '/admin': 'Admin Dashboard',
  '/admin/analytics': 'Platform Analytics',
  '/admin/manage-issues': 'Issue Operations',
  '/admin/users': 'User Management',
  '/issues/create': 'Report Issue',
  '/notifications': 'Notifications',
  '/profile': 'My Profile',
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { role, isAdmin, isOfficer, isWorker, isVolunteer } = useRole();
  const location = useLocation();

  const safeRole = role || 'citizen';
  const roleMeta = ROLE_META[safeRole] || ROLE_META.citizen;

  const navItems = useMemo(() => {
    if (isAdmin) {
      return [
        { to: '/admin', label: 'Overview', icon: 'OV' },
        { to: '/admin/manage-issues', label: 'Issues', icon: 'IS' },
        { to: '/admin/users', label: 'Users', icon: 'US' },
        { to: '/admin/analytics', label: 'Analytics', icon: 'AN' },
        { to: '/profile', label: 'Profile', icon: 'PR' },
      ];
    }

    if (isOfficer) {
      return [
        { to: '/dashboard/officer', label: 'Overview', icon: 'OV' },
        { to: '/dashboard/officer/analytics', label: 'Analytics', icon: 'AN' },
        { to: '/dashboard/map', label: 'Issue Map', icon: 'MP' },
        { to: '/notifications', label: 'Notifications', icon: 'NT' },
        { to: '/profile', label: 'Profile', icon: 'PR' },
      ];
    }

    if (isWorker) {
      return [
        { to: '/dashboard/worker', label: 'My Tasks', icon: 'TS' },
        { to: '/dashboard/map', label: 'Issue Map', icon: 'MP' },
        { to: '/notifications', label: 'Notifications', icon: 'NT' },
        { to: '/profile', label: 'Profile', icon: 'PR' },
      ];
    }

    if (isVolunteer) {
      return [
        { to: '/dashboard/volunteer', label: 'Overview', icon: 'OV' },
        { to: '/dashboard/map', label: 'Issue Map', icon: 'MP' },
        { to: '/notifications', label: 'Notifications', icon: 'NT' },
        { to: '/profile', label: 'Profile', icon: 'PR' },
      ];
    }

    return [
      { to: '/dashboard', label: 'Overview', icon: 'OV' },
      { to: '/issues/create', label: 'Report Issue', icon: 'RP' },
      { to: '/dashboard/map', label: 'Issue Map', icon: 'MP' },
      { to: '/notifications', label: 'Notifications', icon: 'NT' },
      { to: '/profile', label: 'Profile', icon: 'PR' },
    ];
  }, [isAdmin, isOfficer, isWorker, isVolunteer]);

  const title = TITLES[location.pathname] || 'Dashboard';

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar" style={{ '--role-accent': roleMeta.accent }}>
        <div className="dashboard-brand-wrap">
          <NavLink to="/" className="dashboard-brand" title="Back to public site">
            <span className="dashboard-brand-logo">CP</span>
            <span>CivicPulse</span>
          </NavLink>
          <div className="dashboard-role-pill">
            <span>{roleMeta.icon}</span>
            <span>{roleMeta.label}</span>
          </div>
        </div>

        <nav className="dashboard-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `dashboard-nav-item${isActive ? ' is-active' : ''}`}
              end={item.to === '/dashboard' || item.to === '/admin'}
            >
              <span className="dashboard-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-sidebar-footer">
          <NavLink to="/" className="dashboard-public-link">Back to Public Site</NavLink>
          <button type="button" className="dashboard-logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <div className="dashboard-main-wrap">
        <header className="dashboard-topbar">
          <h1>{title}</h1>
          <div className="dashboard-user-chip">
            <span>{(user?.name || 'U').charAt(0).toUpperCase()}</span>
            <small>{user?.name || 'User'}</small>
          </div>
        </header>
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
