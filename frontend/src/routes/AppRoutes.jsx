import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';

import Home from '../pages/Home';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

import IssuesList from '../pages/issues/IssuesList';
import IssueDetails from '../pages/issues/IssueDetails';
import CreateIssue from '../pages/issues/CreateIssue';

import UserDashboard from '../pages/dashboard/UserDashboard';
import AdminDashboard from '../pages/dashboard/AdminDashboard';
import { useRole } from '../hooks/useRole';

import Loader from '../components/common/Loader';

const Analytics = lazy(() => import('../pages/admin/Analytics'));
const ManageIssues = lazy(() => import('../pages/admin/ManageIssues'));

const DashboardEntry = () => {
  const { isAdmin } = useRole();
  return isAdmin ? <Navigate to="/admin" replace /> : <UserDashboard />;
};

const AppRoutes = () => (
  <Suspense fallback={<Loader fullScreen />}>
    <Routes>

      {/* PUBLIC */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<MainLayout />}>
        <Route path="/issues" element={<IssuesList />} />
        <Route path="/issues/:id" element={<IssueDetails />} />
      </Route>

      {/* AUTHENTICATED */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardEntry />} />
          <Route path="/issues/create" element={<CreateIssue />} />
        </Route>
      </Route>

      {/* ADMIN */}
      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/manage-issues" element={<ManageIssues />} />
        </Route>
      </Route>

      {/* FALLBACK */}
      {/* <Route path="*" element={<Navigate to="/" replace />} /> */}

    </Routes>
  </Suspense>
);

export default AppRoutes;
