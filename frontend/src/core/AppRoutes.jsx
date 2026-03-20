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
import { usePermission } from '../hooks/usePermission';

import NotFound from '../pages/NotFound/NotFound';
import Unauthorized from '../pages/Unauthorized/Unauthorized';
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
  // ✅ Use permissions instead of role checks
  const { can } = usePermission();

  if (can('admin:view_analytics')) return <Navigate to="/admin" replace />;
  if (can('officer:review_issues') || can('officer:view_queue')) return <Navigate to="/dashboard/officer" replace />;
  if (can('worker:view_tasks')) return <Navigate to="/dashboard/worker" replace />;
  if (can('volunteer:claim_issue')) return <Navigate to="/dashboard/volunteer" replace />;
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
              <ProtectedRoute requiredPermissions={["volunteer:access", "volunteer:claim_issue"]} fallbackRoute="/unauthorized">
                <VolunteerDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/dashboard/volunteer/submit/:id"
            element={(
              <ProtectedRoute requiredPermissions={["volunteer:access", "volunteer:submit_resolution"]} fallbackRoute="/unauthorized">
                <SubmitResolution />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/dashboard/officer"
            element={(
              <ProtectedRoute requiredPermissions={["officer:access", "officer:review_issues"]} fallbackRoute="/unauthorized">
                <OfficerDashboard />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/dashboard/officer/analytics"
            element={(
              <ProtectedRoute requiredPermissions={["officer:access", "admin:view_analytics"]} fallbackRoute="/unauthorized">
                <Analytics />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/dashboard/worker"
            element={(
              <ProtectedRoute requiredPermissions={["worker:view_tasks"]} fallbackRoute="/unauthorized">
                <WorkerDashboard />
              </ProtectedRoute>
            )}
          />
          <Route path="/issues/create" element={
            <ProtectedRoute requiredPermission="issue:create" fallbackRoute="/unauthorized">
              <CreateIssue />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute requiredPermission="issue:read" fallbackRoute="/unauthorized">
              <Notifications />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/map" element={
            <ProtectedRoute requiredPermission="issue:read" fallbackRoute="/unauthorized">
              <IssueMap />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute requiredPermission="issue:read" fallbackRoute="/unauthorized">
              <Profile />
            </ProtectedRoute>
          } />
        </Route>
      </Route>

      {/* ✅ Admin routes protected by permission */}
      <Route element={<ProtectedRoute requiredPermission="admin:view_analytics" />}>
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
