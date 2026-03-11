import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { normalizeRole } from '../../../utils/roleCheck';
import NotificationPanel from '../../notifications/NotificationPanel/NotificationPanel';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const role = normalizeRole(user?.role);
  const isAdmin = role === 'admin';
  const isOfficer = role === 'officer';
  const isWorker = role === 'worker';
  const isVolunteer = role === 'volunteer';

  const dashboardPath = isAdmin
    ? '/admin'
    : isOfficer
      ? '/dashboard/officer'
      : isWorker
        ? '/dashboard/worker'
        : isVolunteer
          ? '/dashboard/volunteer'
          : '/dashboard';

  const dashboardLabel = isAdmin
    ? 'Admin Dashboard'
    : isOfficer
      ? 'Officer Dashboard'
      : isWorker
        ? 'Worker Dashboard'
        : isVolunteer
          ? 'Volunteer Dashboard'
          : 'My Dashboard';

  const panelPath = '/admin/manage-issues';
  const displayName = user?.name || 'user';
  const greetingText = isAdmin ? `Hi Admin, ${displayName}` : `Hi, ${displayName}`;

  return (
    <header className="navbar">
      <div className="nav-left">
        <Link to="/" className="logo">
          Social Civic Platform
        </Link>

        <nav className="nav-links">
          {!isAdmin && <Link to="/issues">Browse Issues</Link>}
          {!isAdmin && <Link to="/map">Issue Map</Link>}
          {isAuthenticated && <Link to={dashboardPath}>{dashboardLabel}</Link>}
          {isAuthenticated && <Link to="/profile">Profile</Link>}
          {isAuthenticated && <Link to="/notifications">Notifications</Link>}
          {isAdmin && <Link to={panelPath}>Admin Panel</Link>}
          {isAdmin && <Link to="/admin/users">Users</Link>}
        </nav>
      </div>

      <div className="nav-right">
        {isAuthenticated ? (
          <>
            <span className="user-text">{greetingText}</span>

            <button onClick={() => setNotificationsOpen(true)} className="notification-bell">
              🔔
            </button>

            <button onClick={logout} className="logout-btn">
              Logout
            </button>

            {!isAdmin && (
              <Link to="/issues/create" className="report-btn">
                + Report Issue
              </Link>
            )}
          </>
        ) : (
          <>
            <Link to="/login" className="login-link">Login</Link>
            <Link to="/register" className="report-btn">Get Started</Link>
          </>
        )}
      </div>

      <NotificationPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </header>
  );
};

export default Navbar;
