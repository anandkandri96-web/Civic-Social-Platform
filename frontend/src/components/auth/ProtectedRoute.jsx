/**
 * ProtectedRoute Component - Route Protection with Role and Permission Checks
 * 
 * Provides multi-layer security:
 * 1. Authentication check (is user logged in?)
 * 2. Role check (does user have required role?)
 * 3. Permission check (does user have required permission?)
 * 
 * Usage with roles (backward compatible):
 *   <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />
 * 
 * Usage with permissions (recommended):
 *   <Route path="/admin" element={<ProtectedRoute requiredPermission="admin:manage_users"><Admin /></ProtectedRoute>} />
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import Loader from '../common/Loader/Loader';

const ProtectedRoute = ({
  requiredRole,        // Single role or array of roles (backward compatibility)
  requiredPermission,  // Single permission or array of permissions (recommended)
  requiredPermissions, // Array of permissions
  fallbackRoute = '/unauthorized',
  children,
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  const { can, canPerformAny, canPerformAll } = usePermission();
  const location = useLocation();

  // Show loader while auth state is being determined
  if (loading) {
    return <Loader fullScreen />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Role check (backward compatibility)
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(user?.role)) {
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  // Permission check (recommended approach)
  if (requiredPermission) {
    const permissions = Array.isArray(requiredPermission) 
      ? requiredPermission 
      : [requiredPermission];

    if (!canPerformAny(permissions)) {
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  if (requiredPermissions) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // If any item in requiredPermissions is string array, treat as OR group
    if (!canPerformAny(permissions)) {
      return <Navigate to={fallbackRoute} replace />;
    }
  }

  // All checks passed - render protected content
  return children ? children : <Outlet />;
};

export default ProtectedRoute;
