import { useAuth } from './useAuth';
import { ROLES } from '../utils/constants';

export const useRole = () => {
  const { user, loading } = useAuth();

  const role = user?.role || null;
  const roleLower = role?.toLowerCase();

  const isAdmin = roleLower === 'admin' || role === ROLES.ADMIN;
  const isVolunteer = roleLower === 'volunteer' || role === ROLES.VOLUNTEER || isAdmin;
  const isUser = roleLower === 'user' || role === ROLES.USER;

  const hasPermission = (requiredRole) => {
    if (loading || !role) return false;
    if (isAdmin) return true;

    const roles = Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole];

    return roles.includes(role);
  };

  return {
    role,
    loading,
    isUser,
    isVolunteer,
    isAdmin,
    hasPermission,
  };
};
