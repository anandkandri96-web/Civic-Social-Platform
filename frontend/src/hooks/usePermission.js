/**
 * usePermission Hook - Permission-Based Authorization
 * 
 * Replaces scattered role checks like: if (isAdmin || isOfficer)
 * 
 * Usage:
 *   const { can, canPerformAny, canPerformAll } = usePermission();
 *   
 *   if (can('issue:delete')) {
 *     return <DeleteButton />;
 *   }
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { 
  ROLE_PERMISSIONS, 
  hasPermission, 
  canPerformResourceAction,
  ROLES 
} from '../utils/permissions.config';

export const usePermission = () => {
  const { user, loading } = useAuth();

  // Memoize user permissions
  const permissions = useMemo(() => {
    if (!user?.role) return new Set();
    return ROLE_PERMISSIONS[user.role] ?? new Set();
  }, [user?.role]);

  /**
   * Check if user can perform a specific permission
   * @param {string} permission - Permission to check (e.g., 'issue:delete')
   * @returns {boolean}
   */
  const can = useCallback((permission) => {
    if (loading || !user?.role) return false;
    return hasPermission(user.role, permission);
  }, [loading, user?.role]);

  /**
   * Alias for 'can' - more intuitive naming
   */
  const canPerform = useCallback((permission) => can(permission), [can]);

  /**
   * Check if user has ANY of the provided permissions
   * @param {string|string[]} permissions - Permission(s) to check
   * @returns {boolean}
   */
  const canPerformAny = useCallback((permissions) => {
    if (loading || !user?.role) return false;
    const list = Array.isArray(permissions) ? permissions : [permissions];
    return list.some((perm) => hasPermission(user.role, perm));
  }, [loading, user?.role]);

  /**
   * Check if user has ALL of the provided permissions
   * @param {string|string[]} permissions - Permission(s) to check
   * @returns {boolean}
   */
  const canPerformAll = useCallback((permissions) => {
    if (loading || !user?.role) return false;
    const list = Array.isArray(permissions) ? permissions : [permissions];
    return list.every((perm) => hasPermission(user.role, perm));
  }, [loading, user?.role]);

  /**
   * Resource-level permission check
   * For fine-grained authorization (e.g., "Can officer delete THIS issue?")
   * 
   * @param {Object} resource - The resource to check (e.g., issue, comment)
   * @param {string} action - Action name (e.g., 'DELETE', 'UPDATE_STATUS')
   * @param {string} resourceType - Type of resource (e.g., 'ISSUE', 'COMMENT')
   * @returns {boolean}
   */
  const canPerformResourceActionSafe = useCallback((resource, action, resourceType) => {
    if (loading || !user || !resource) return false;
    return canPerformResourceAction(user, resourceType, action, resource);
  }, [loading, user]);

  return {
    can,
    canPerform,
    canPerformAny,
    canPerformAll,
    canPerformResourceAction: canPerformResourceActionSafe,

    // Get all permissions for current user
    userPermissions: permissions,

    // Current user role
    role: user?.role,

    // Loading state
    loading,

    // Convenience checks for common roles (for backward compatibility)
    isAdmin: user?.role === ROLES.ADMIN,
    isOfficer: user?.role === ROLES.OFFICER,
    isWorker: user?.role === ROLES.WORKER,
    isVolunteer: user?.role === ROLES.VOLUNTEER,
    isCitizen: user?.role === ROLES.CITIZEN,
  };
};

export default usePermission;
