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
import { normalizeRole } from '../utils/roleCheck';

export const usePermission = () => {
  const { user, loading } = useAuth();

  // Memoize user permissions
  const normalizedRole = useMemo(() => normalizeRole(user?.role || null), [user?.role]);

  const permissions = useMemo(() => {
    if (!normalizedRole) return new Set();
    return ROLE_PERMISSIONS[normalizedRole] ?? new Set();
  }, [normalizedRole]);

  /**
   * Check if user can perform a specific permission
   * @param {string} permission - Permission to check (e.g., 'issue:delete')
   * @returns {boolean}
   */
  const can = useCallback((permission) => {
    if (loading || !normalizedRole) return false;
    return hasPermission(normalizedRole, permission);
  }, [loading, normalizedRole]);

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
    if (loading || !normalizedRole) return false;
    const list = Array.isArray(permissions) ? permissions : [permissions];
    return list.some((perm) => hasPermission(normalizedRole, perm));
  }, [loading, normalizedRole]);

  /**
   * Check if user has ALL of the provided permissions
   * @param {string|string[]} permissions - Permission(s) to check
   * @returns {boolean}
   */
  const canPerformAll = useCallback((permissions) => {
    if (loading || !normalizedRole) return false;
    const list = Array.isArray(permissions) ? permissions : [permissions];
    return list.every((perm) => hasPermission(normalizedRole, perm));
  }, [loading, normalizedRole]);

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
    role: normalizedRole || user?.role,

    // Loading state
    loading,

    // Convenience checks for common roles (for backward compatibility)
    isAdmin: normalizedRole === ROLES.ADMIN,
    isOfficer: normalizedRole === ROLES.OFFICER,
    isWorker: normalizedRole === ROLES.WORKER,
    isVolunteer: normalizedRole === ROLES.VOLUNTEER,
    isCitizen: normalizedRole === ROLES.CITIZEN,
  };
};

export default usePermission;
