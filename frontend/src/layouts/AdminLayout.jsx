import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
// import './AdminLayout.css';

const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <Navbar />
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
