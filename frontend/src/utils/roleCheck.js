/**
 * Role hierarchy: user < volunteer < admin
 * Backend and JWT use lowercase; requiredRole may be "ADMIN" from routes.
 */
export const hasRole = (userRole, requiredRole) => {
  if (!requiredRole) return true;
  if (!userRole) return false;

  const u = String(userRole).toLowerCase();
  const r = String(requiredRole).toLowerCase();
  const hierarchy = { user: 1, volunteer: 2, admin: 3 };

  if (!hierarchy[u] || !hierarchy[r]) return false;
  return hierarchy[u] >= hierarchy[r];
};
