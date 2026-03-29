import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "../../common/ThemeToggle/ThemeToggle";
import "../../../pages/Home/Home.css";

const HomeHeader = ({ isLoggedIn, isAdmin, dashboardPath, onLogout, showHowItWorks = true }) => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`header${scrolled ? " header--scrolled" : ""}`}>
      <div className="header__inner container">
        <Link to="/" className="header__logo">
          <span className="header__logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </span>
          <span className="header__logo-text">Social Civic Platform</span>
        </Link>

        <nav className="header__nav">
          {!isLoggedIn && (
            <>
              {showHowItWorks && (
                isHome ? (
                  <a href="#how-it-works" className="header__nav-link">
                    How It Works
                  </a>
                ) : (
                  <Link to="/#how-it-works" className="header__nav-link">
                    How It Works
                  </Link>
                )
              )}
              {isHome ? (
                <a href="#issues" className="header__nav-link">
                  Issues
                </a>
              ) : (
                <Link to="/issues" className="header__nav-link">
                  Issues
                </Link>
              )}
              {isHome ? (
                <a href="#map" className="header__nav-link">
                  Map
                </a>
              ) : (
                <Link to="/map" className="header__nav-link">
                  Map
                </Link>
              )}
              <Link to="/workflow" className="header__nav-link">
                Workflow
              </Link>
              <Link to="/login" className="btn btn-ghost">
                Log In
              </Link>
              <Link to="/register" className="btn btn-primary">
                Register
              </Link>
            </>
          )}

          {isLoggedIn && !isAdmin && (
            <>
              <Link to="/issues" className="header__nav-link">
                Browse Issues
              </Link>
              <Link to={dashboardPath} className="header__nav-link">
                Dashboard
              </Link>
              <Link to="/issues/create" className="btn btn-report">
                Report Issue
              </Link>
              <button className="btn btn-ghost header__user-btn" onClick={onLogout}>
                Sign Out
              </button>
            </>
          )}

          {isLoggedIn && isAdmin && (
            <>
              <Link to="/issues" className="header__nav-link">
                Browse Issues
              </Link>
              <Link to={dashboardPath} className="header__nav-link">
                Dashboard
              </Link>
              <Link to="/admin" className="header__nav-link header__nav-link--admin">
                Admin Panel
              </Link>
              <button className="btn btn-ghost header__user-btn" onClick={onLogout}>
                Sign Out
              </button>
            </>
          )}
        </nav>

        <div className="header__actions">
          <ThemeToggle className="theme-toggle--header" />
        </div>
      </div>
    </header>
  );
};

export default HomeHeader;
