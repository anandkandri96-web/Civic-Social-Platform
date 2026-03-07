import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { normalizeRole } from '../../../utils/roleCheck';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const role = normalizeRole(user?.role);
  const isAdmin = role === 'admin';
  const isOfficer = role === 'department_officer';
  const isFieldWorker = role === 'field_worker';
  const isVolunteer = role === 'volunteer';

  const dashboardPath = isAdmin
    ? '/admin'
    : isOfficer
      ? '/dashboard/officer'
      : isFieldWorker
        ? '/dashboard/field-worker'
        : isVolunteer
          ? '/dashboard/volunteer'
          : '/dashboard';

  const dashboardLabel = isAdmin
    ? 'Admin Dashboard'
    : isOfficer
      ? 'Officer Dashboard'
      : isFieldWorker
        ? 'Field Dashboard'
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
          <Link to="/workflow">Workflow</Link>
          {isAuthenticated && <Link to={dashboardPath}>{dashboardLabel}</Link>}
          {isAdmin && <Link to={panelPath}>Admin Panel</Link>}
        </nav>
      </div>

      <div className="nav-right">
        {isAuthenticated ? (
          <>
            <span className="user-text">{greetingText}</span>

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
    </header>
  );
};

export default Navbar;
