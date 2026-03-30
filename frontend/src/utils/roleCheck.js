// roleCheck.js (restored)
// Utility for role-based access checks (deprecated in favor of permission-based system)

export const isAdmin = (user) => user && user.role === 'admin';
export const isOfficer = (user) => user && user.role === 'officer';
export const isWorker = (user) => user && user.role === 'worker';
export const isVolunteer = (user) => user && user.role === 'volunteer';
export const isCitizen = (user) => user && user.role === 'citizen';

// Normalizes role string to a standard format (lowercase, trims whitespace)
export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return '';
  return role.trim().toLowerCase();
}

// Generic role checker for backward-compatible route guards
// role: user's role string
// requiredRoles: array (or single string) of allowed roles
export function hasRole(role, requiredRoles) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;
  const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return rolesArray
    .map((r) => normalizeRole(r))
    .filter(Boolean)
    .includes(normalizedRole);
}

export const getDashboardPath = (user) => {
  if (!user) return '/login';
  if (isAdmin(user)) return '/admin';
  if (isOfficer(user)) return '/dashboard/officer';
  if (isWorker(user)) return '/dashboard/worker';
  if (isVolunteer(user)) return '/dashboard/volunteer';
  return '/dashboard';
};
