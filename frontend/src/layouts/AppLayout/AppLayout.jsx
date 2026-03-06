import { Outlet } from 'react-router-dom';
import Navbar from '../../components/layout/Navbar/Navbar';

const AppLayout = ({ layoutClassName, mainClassName }) => {
  return (
    <div className={layoutClassName}>
      <Navbar />
      <main className={mainClassName}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
