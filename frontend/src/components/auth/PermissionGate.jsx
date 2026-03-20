/**
 * PermissionGate Component
 * 
 * Renders children only if user has required permission(s).
 * Replaces scattered conditional rendering logic.
 * 
 * Usage:
 *   <PermissionGate can="issue:delete">
 *     <DeleteButton />
 *   </PermissionGate>
 *   
 *   <PermissionGate canAny={['admin:manage_users', 'officer:approve_user']}>
 *     <ApprovalPanel />
 *   </PermissionGate>
 */

import { usePermission } from '../hooks/usePermission';

export const PermissionGate = ({
  // Single permission check
  can,

  // Check ANY of these permissions (logical OR)
  canAny,

  // Check ALL of these permissions (logical AND)
  canAll,

  // Resource-level checks
  resource,          // The resource object
  resourceAction,    // Action name (e.g., 'DELETE')
  resourceType,      // Resource type (e.g., 'ISSUE')

  // What to render if permission denied
  fallback = null,

  // Component's children
  children,
}) => {
  const {
    can: canCheck,
    canPerformAny,
    canPerformAll,
    canPerformResourceAction,
  } = usePermission();

  let hasPermission = true;

  // Check single permission
  if (can) {
    hasPermission = canCheck(can);
  }

  // Check ANY permissions (if primary check didn't grant)
  if (canAny && !hasPermission) {
    hasPermission = canPerformAny(canAny);
  }

  // Check ALL permissions (if primary check didn't grant)
  if (canAll && !hasPermission) {
    hasPermission = canPerformAll(canAll);
  }

  // Check resource-level permission (if primary check didn't grant)
  if (resource && resourceAction && resourceType && !hasPermission) {
    hasPermission = canPerformResourceAction(resource, resourceAction, resourceType);
  }

  return hasPermission ? children : fallback;
};

export default PermissionGate;
