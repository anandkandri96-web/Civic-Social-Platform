import { Outlet, useLocation } from 'react-router-dom';
import Header from '../../components/layout/Header/Header';
import HomeHeader from '../../components/layout/HomeHeader/HomeHeader';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { useRole } from '../../hooks/useRole';

const AppLayout = ({ layoutClassName, mainClassName }) => {
  const location = useLocation();
  const isPublicMap = location.pathname === '/map';
  const { user, logout } = useAuth();
  const { can } = usePermission();
  const { dashboardPath } = useRole();

  const isLoggedIn = Boolean(user);
  const isAdmin = can('admin:view_analytics');
  const layoutClasses = [layoutClassName, isPublicMap ? 'home-page home-page--map' : null]
    .filter(Boolean)
    .join(' ');
  const mainClasses = [mainClassName, isPublicMap ? 'main-content--home-map' : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={layoutClasses}>
      {isPublicMap ? (
        <HomeHeader
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          dashboardPath={dashboardPath}
          onLogout={logout}
          showHowItWorks={false}
        />
      ) : (
        <Header />
      )}
      <main className={mainClasses}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
