export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const ROLES = {
  CITIZEN: 'citizen',
  USER: 'user', // legacy alias
  VOLUNTEER: 'volunteer',
  OFFICER: 'officer',
  WORKER: 'worker',
  ADMIN: 'admin',
};

export const ISSUE_STATUSES = [
  'reported',
  'under_review',
  'assigned_to_department',
  'work_in_progress',
  'resolved',
  'citizen_verified',
  'closed',
  'volunteer_claimed',
  'community_fix_in_progress',
  'resolved_by_community',
  'rejected',
];

export const ISSUE_CATEGORIES = ['roads', 'electricity', 'garbage', 'drainage', 'water', 'other'];
