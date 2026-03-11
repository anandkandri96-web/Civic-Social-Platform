import { Outlet } from 'react-router-dom';
import Header from '../../components/layout/Header/Header';

const AppLayout = ({ layoutClassName, mainClassName }) => {
  return (
    <div className={layoutClassName}>
      <Header />
      <main className={mainClassName}>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
