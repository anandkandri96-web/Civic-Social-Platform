import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { useRole } from '../../../hooks/useRole';
import { usePermission } from '../../../hooks/usePermission';
import { getNotifications } from '@api/notifications.api.js';
import NotificationPanel from '../../notifications/NotificationPanel/NotificationPanel';
import ThemeToggle from '../../common/ThemeToggle/ThemeToggle';
import './Header.css';

const ICONS = {
  bell: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 01-3.46 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { dashboardPath } = useRole();
  const { can, isAdmin, isCitizen } = usePermission();

  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const headerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isIssuePage = location.pathname.startsWith('/issues') || location.pathname.startsWith('/admin/manage-issues');

  const brandTarget = isAuthenticated ? dashboardPath : '/';
  const avatarLetter = (user?.name || user?.email || 'U').charAt(0).toUpperCase();

  useEffect(() => {
    // Closing transient UI on route change is intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
    setAvatarOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let cancelled = false;

    const fetchUnread = async () => {
      if (!isAuthenticated) {
        if (!cancelled) setUnreadCount(0);
        return;
      }

      try {
        const { items = [] } = await getNotifications({ unreadOnly: true, limit: 50 });
        if (cancelled) return;
        const unread = items.filter((n) => !n.read).length;
        setUnreadCount(unread);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };

    fetchUnread();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const navLinks = useMemo(() => {
    // ✅ Use permissions instead of role checks
    const issuesTarget = can('admin:view_all_issues') ? '/admin/manage-issues' : '/issues';
    const mapTarget = isAuthenticated ? '/dashboard/map' : '/map';
    const dashboardTarget = isAuthenticated ? dashboardPath : '/login';

    return [
      { to: issuesTarget, label: 'Issues' },
      { to: mapTarget, label: 'Map' },
      { to: dashboardTarget, label: 'Dashboard' },
    ];
  }, [dashboardPath, isAuthenticated, can]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchTerm.trim();
    const isAdmin = can('admin:view_all_issues');
    const base = isAdmin ? '/admin/manage-issues' : '/issues';
    navigate(query ? `${base}?search=${encodeURIComponent(query)}` : base);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen && !avatarOpen && !notificationsOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      setAvatarOpen(false);
      setNotificationsOpen(false);
    };

    const onPointerDown = (e) => {
      const root = headerRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setMenuOpen(false);
      setAvatarOpen(false);
      setNotificationsOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen, avatarOpen, notificationsOpen]);

  return (
    <header className="app-header" ref={headerRef}>
      <div className="app-header__left">
        <Link to={brandTarget} className="app-header__brand" aria-label="Social Civic Platform home">
          <span className="app-header__brand-mark">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </span>
          <span className="app-header__brand-text">Social Civic Platform</span>
        </Link>

        {isIssuePage && (
          <form className="app-header__search" onSubmit={handleSearchSubmit} role="search">
            <span className="app-header__search-icon">{ICONS.search}</span>
            <input
              type="search"
              placeholder="Search issues by title, category, or location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search issues by title, category, or location"
              name="issueSearch"
            />
          </form>
        )}
      </div>

      <div className="app-header__center">
        <nav className={`app-header__nav${menuOpen ? ' is-open' : ''}`} aria-label="Primary">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `app-header__nav-link${isActive ? ' is-active' : ''}`}
              end={link.to === '/dashboard' || link.to === '/admin'}
            >
              {link.label}
            </NavLink>
          ))}
          {/* ✅ Use permissions instead of role checks */}
          {can('admin:view_analytics') && (
            <>
              <NavLink to="/admin/analytics" className={({ isActive }) => `app-header__nav-link${isActive ? ' is-active' : ''}`}>
                View Analytics
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => `app-header__nav-link${isActive ? ' is-active' : ''}`}>
                Manage Users
              </NavLink>
            </>
          )}
          {can('admin:manage_role_upgrades') && (
            <NavLink to="/admin/role-upgrades" className={({ isActive }) => `app-header__nav-link${isActive ? ' is-active' : ''}`}>
              Role Requests
            </NavLink>
          )}
        </nav>
      </div>

      <div className="app-header__right">
        <button
          className="app-header__menu-toggle"
          type="button"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          Menu
        </button>

        <div className="notification">
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              setNotificationsOpen((prev) => !prev);
              setUnreadCount(0);
            }}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            {ICONS.bell}
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          <NotificationPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
        </div>

        <ThemeToggle className="theme-toggle--header" />

        {isAuthenticated ? (
          <>
            {/* ✅ Use permissions instead of role checks for Report Issue button */}
            {can('issue:create') && (
              <Link to="/issues/create" className="app-header__report">
                Report Issue
              </Link>
            )}

            <div className="app-header__avatar">
              <button
                type="button"
                className="app-header__avatar-btn"
                onClick={() => setAvatarOpen((prev) => !prev)}
                aria-label="User menu"
                aria-expanded={avatarOpen}
              >
                {avatarLetter}
              </button>
              {avatarOpen && (
                <div className="app-header__avatar-menu" role="menu" aria-label="User menu">
                  <Link to="/profile" className="app-header__avatar-item" role="menuitem">
                    Profile
                  </Link>
                  {can('role:upgrade_request') && !can('admin:view_analytics') && (
                    <Link to="/profile/role-upgrade" className="app-header__avatar-item" role="menuitem">
                      Role Upgrade
                    </Link>
                  )}
                  {/* ✅ Show "My Issues" for citizens/volunteers (anyone without admin/officer/worker dashboards) */}
                  {!can('admin:view_analytics') && !can('officer:review_issues') && !can('worker:view_tasks') && (
                    <Link to="/dashboard" className="app-header__avatar-item" role="menuitem">
                      My Issues
                    </Link>
                  )}
                  <Link to="/notifications" className="app-header__avatar-item" role="menuitem">
                    Notifications
                  </Link>
                  <button
                    type="button"
                    className="app-header__avatar-item"
                    onClick={() => {
                      logout();
                      setAvatarOpen(false);
                    }}
                    role="menuitem"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="app-header__auth">
            <Link to="/login" className="app-header__link">
              Login
            </Link>
            <Link to="/register" className="app-header__report">
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
