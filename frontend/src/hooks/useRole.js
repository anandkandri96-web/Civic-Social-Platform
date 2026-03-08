import { useAuth } from './useAuth';
import { ROLES } from '../utils/constants';
import { hasRole, normalizeRole } from '../utils/roleCheck';

export const useRole = () => {
  const { user, loading } = useAuth();

  const role = normalizeRole(user?.role || null);
  const isAdmin = role === 'admin' || user?.role === ROLES.ADMIN;
  const isVolunteer = hasRole(role, ROLES.VOLUNTEER);
  const isCitizen = hasRole(role, [ROLES.CITIZEN, ROLES.USER]);
  const isOfficer = hasRole(role, ROLES.OFFICER);
  const isWorker = hasRole(role, ROLES.WORKER);

  const dashboardPath = isAdmin
    ? '/admin'
    : isOfficer
      ? '/dashboard/officer'
      : isWorker
        ? '/dashboard/worker'
        : isVolunteer
          ? '/dashboard/volunteer'
          : '/dashboard';

  const hasPermission = (requiredRole) => {
    if (loading || !role) return false;
    return hasRole(role, requiredRole);
  };

  return {
    role,
    loading,
    isCitizen,
    isVolunteer,
    isOfficer,
    isWorker,
    isAdmin,
    dashboardPath,
    hasPermission,
  };
};
