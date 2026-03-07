const ROLE_ALIAS = {
  citizen: 'citizen',
  user: 'citizen',
  volunteer: 'volunteer',
  ngo: 'volunteer',
  department_officer: 'department_officer',
  officer: 'department_officer',
  'department officer': 'department_officer',
  field_worker: 'field_worker',
  worker: 'field_worker',
  'field worker': 'field_worker',
  admin: 'admin',
  system_admin: 'admin',
  'system administrator': 'admin',
};

const ROLE_ACCESS = {
  citizen: new Set(['citizen']),
  volunteer: new Set(['volunteer']),
  department_officer: new Set(['department_officer']),
  field_worker: new Set(['field_worker']),
  admin: new Set(['citizen', 'volunteer', 'department_officer', 'field_worker', 'admin']),
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
