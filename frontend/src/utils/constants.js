export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const ROLES = {
  CITIZEN: 'CITIZEN',
  USER: 'USER', // legacy alias
  VOLUNTEER: 'VOLUNTEER',
  OFFICER: 'DEPARTMENT_OFFICER',
  FIELD_WORKER: 'FIELD_WORKER',
  ADMIN: 'ADMIN',
};
