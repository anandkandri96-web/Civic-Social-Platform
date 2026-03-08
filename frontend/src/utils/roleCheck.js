const ROLE_ALIAS = {
  citizen: 'citizen',
  user: 'citizen',
  volunteer: 'volunteer',
  ngo: 'volunteer',
  department_officer: 'officer',
  officer: 'officer',
  'department officer': 'officer',
  field_worker: 'worker',
  worker: 'worker',
  'field worker': 'worker',
  admin: 'admin',
  system_admin: 'admin',
  'system administrator': 'admin',
};

const ROLE_ACCESS = {
  citizen: new Set(['citizen']),
  volunteer: new Set(['volunteer']),
  officer: new Set(['officer']),
  worker: new Set(['worker']),
  admin: new Set(['citizen', 'volunteer', 'officer', 'worker', 'admin']),
};

export const normalizeRole = (role) => {
  if (!role) return null;
  return ROLE_ALIAS[String(role).trim().toLowerCase()] || null;
};

export const hasRole = (userRole, requiredRole) => {
  if (!requiredRole) return true;

  const normalizedUserRole = normalizeRole(userRole);
  if (!normalizedUserRole) return false;

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  return roles.some((role) => {
    const normalizedRequiredRole = normalizeRole(role);
    if (!normalizedRequiredRole) return false;
    return ROLE_ACCESS[normalizedUserRole]?.has(normalizedRequiredRole) ?? false;
  });
};
