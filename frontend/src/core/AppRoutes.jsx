import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout/MainLayout';
import AdminLayout from '../layouts/AdminLayout/AdminLayout';
import ProtectedRoute from '../components/forms/AuthForm/ProtectedRoute';

import Home from '../pages/Home/Home';
import Login from '../pages/Auth/Login/Login';
import Register from '../pages/Auth/Register/Register';

import IssuesList from '../pages/Issues/IssueList/IssueList';
import IssueDetails from '../pages/Issues/IssueDetails/IssueDetails';
import CreateIssue from '../pages/Issues/CreateIssue/CreateIssue';

import UserDashboard from '../pages/Dashboard/UserDashboard/UserDashboard';
import AdminDashboard from '../pages/Dashboard/AdminDashboard/AdminDashboard';
import { useRole } from '../hooks/useRole';

import Loader from '../components/common/Loader/Loader';

const Analytics = lazy(() => import('../pages/Admin/Analytics/Analytics'));
const ManageIssues = lazy(() => import('../pages/Admin/ManageIssues/ManageIssues'));
const CivicWorkflow = lazy(() => import('../pages/CivicWorkflow/CivicWorkflow'));
const VolunteerDashboard = lazy(() => import('../pages/Dashboard/VolunteerDashboard'));
const OfficerDashboard = lazy(() => import('../pages/Dashboard/OfficerDashboard'));
const FieldWorkerDashboard = lazy(() => import('../pages/Dashboard/FieldWorkerDashboard'));

const DashboardEntry = () => {
  const { isAdmin, isOfficer, isFieldWorker, isVolunteer } = useRole();

  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isOfficer) return <Navigate to="/dashboard/officer" replace />;
  if (isFieldWorker) return <Navigate to="/dashboard/field-worker" replace />;
  if (isVolunteer) return <Navigate to="/dashboard/volunteer" replace />;
  return <UserDashboard />;
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
        <Route path="/workflow" element={<CivicWorkflow />} />
      </Route>

      {/* AUTHENTICATED */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardEntry />} />
          <Route
            path="/dashboard/volunteer"
            element={(
              <ProtectedRoute requiredRole="volunteer">
                <VolunteerDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/dashboard/officer"
            element={(
              <ProtectedRoute requiredRole="department_officer">
                <OfficerDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/dashboard/field-worker"
            element={(
              <ProtectedRoute requiredRole="field_worker">
                <FieldWorkerDashboard />
              </ProtectedRoute>
            )}
          />
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
