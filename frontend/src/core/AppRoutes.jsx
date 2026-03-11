import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import MainLayout from '../layouts/MainLayout/MainLayout';
import DashboardLayout from '../layouts/DashboardLayout/DashboardLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';

import Home from '../pages/Home/Home';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';

import IssuesList from '../pages/Issues/IssueList';
import IssueDetails from '../pages/Issues/IssueDetails';
import CreateIssue from '../pages/Issues/CreateIssue';

import UserDashboard from '../pages/Dashboard/UserDashboard';
import AdminDashboard from '../pages/Dashboard/AdminDashboard';
import { useRole } from '../hooks/useRole';

import Loader from '../components/common/Loader/Loader';

const Analytics = lazy(() => import('../pages/Admin/Analytics'));
const ManageIssues = lazy(() => import('../pages/Admin/ManageIssues'));
const UserManagement = lazy(() => import('../pages/Admin/UserManagement'));
const CivicWorkflow = lazy(() => import('../pages/CivicWorkflow/CivicWorkflow'));
const VolunteerDashboard = lazy(() => import('../pages/Dashboard/VolunteerDashboard'));
const OfficerDashboard = lazy(() => import('../pages/Dashboard/OfficerDashboard'));
const WorkerDashboard = lazy(() => import('../pages/Dashboard/WorkerDashboard'));
const Notifications = lazy(() => import('../pages/Notifications/Notifications'));
const IssueMap = lazy(() => import('../pages/Map/IssueMap'));
const Profile = lazy(() => import('../pages/Profile/Profile'));
const SubmitResolution = lazy(() => import('../pages/Volunteer/SubmitResolution'));

const DashboardEntry = () => {
  const { isAdmin, isOfficer, isWorker, isVolunteer } = useRole();

  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isOfficer) return <Navigate to="/dashboard/officer" replace />;
  if (isWorker) return <Navigate to="/dashboard/worker" replace />;
  if (isVolunteer) return <Navigate to="/dashboard/volunteer" replace />;
  return <UserDashboard />;
};

const AppRoutes = () => (
  <Suspense fallback={<Loader fullScreen />}>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<MainLayout />}>
        <Route path="/issues" element={<IssuesList />} />
        <Route path="/issues/:id" element={<IssueDetails />} />
        <Route path="/workflow" element={<CivicWorkflow />} />
        <Route path="/map" element={<IssueMap />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
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
            path="/dashboard/volunteer/submit/:id"
            element={(
              <ProtectedRoute requiredRole="volunteer">
                <SubmitResolution />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/dashboard/officer"
            element={(
              <ProtectedRoute requiredRole="officer">
                <OfficerDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/dashboard/officer/analytics"
            element={(
              <ProtectedRoute requiredRole="officer">
                <Analytics />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/dashboard/worker"
            element={(
              <ProtectedRoute requiredRole="worker">
                <WorkerDashboard />
              </ProtectedRoute>
            )}
          />
          <Route path="/issues/create" element={<CreateIssue />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/dashboard/map" element={<IssueMap />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute requiredRole="admin" />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/manage-issues" element={<ManageIssues />} />
          <Route path="/admin/users" element={<UserManagement />} />
        </Route>
      </Route>
    </Routes>
  </Suspense>
);

export default AppRoutes;
