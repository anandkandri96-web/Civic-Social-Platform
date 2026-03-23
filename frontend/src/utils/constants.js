import { ISSUE_STATUSES as ISSUE_STATUS_MAP } from '../constants/issueStatus';
import { ISSUE_CATEGORIES as ISSUE_CATEGORY_OPTIONS } from '../constants/issueOptions';

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export const ROLES = {
  CITIZEN: 'citizen',
  USER: 'user', // legacy alias
  VOLUNTEER: 'volunteer',
  OFFICER: 'officer',
  WORKER: 'worker',
  ADMIN: 'admin',
};

export const ISSUE_STATUSES = Object.values(ISSUE_STATUS_MAP);
export const ISSUE_CATEGORIES = ISSUE_CATEGORY_OPTIONS.map((cat) => cat.value);
