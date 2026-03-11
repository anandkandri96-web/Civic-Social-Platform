import { Outlet } from 'react-router-dom';
import Header from '../../components/layout/Header/Header';
import './DashboardLayout.css';

const DashboardLayout = () => {
  return (
    <div className="dashboard-layout">
      <Header />
      <div className="dashboard-content">
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
