import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import "./Navbar.css";

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === "admin";
  const dashboardPath = isAdmin ? "/admin" : "/dashboard";
  const dashboardLabel = isAdmin ? "Admin Dashboard" : "My Dashboard";

  return (
    <header className="navbar">
      <div className="nav-left">
        <Link to="/" className="logo">
          Social Civic Platform
        </Link>

        <nav className="nav-links">
          {!isAdmin && <Link to="/issues">Browse Issues</Link>}
          {isAuthenticated && <Link to={dashboardPath}>{dashboardLabel}</Link>}
            {isAdmin && <Link to="/admin/analytics">Admin Panel</Link>}
        </nav>
      </div>

      <div className="nav-right">
        {isAuthenticated ? (
          <>
            <span className="user-text">
              Hi, {user?.name || "user"}
            </span>

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
