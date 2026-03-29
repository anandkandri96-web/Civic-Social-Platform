import { ISSUE_STATUSES, ISSUE_STATUS_LABELS } from './issueStatus';

export const ISSUE_CATEGORIES = [
  { value: 'roads', label: 'Roads', icon: '🛣️' },
  { value: 'electricity', label: 'Electricity', icon: '⚡' },
  { value: 'garbage', label: 'Garbage', icon: '🗑️' },
  { value: 'drainage', label: 'Drainage', icon: '🌊' },
  { value: 'water', label: 'Water', icon: '💧' },
  { value: 'other', label: 'Other', icon: '📋' },
];

export const ISSUE_CATEGORY_LABELS = ISSUE_CATEGORIES.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export const ISSUE_CATEGORY_FILTER_OPTIONS = [
  { value: '', label: 'All Categories' },
  ...[...ISSUE_CATEGORIES].sort((a, b) => a.label.localeCompare(b.label)),
];

export const ISSUE_SEVERITY_OPTIONS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Urgent' },
];

export const ISSUE_SEVERITY_LABELS = ISSUE_SEVERITY_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

export const ISSUE_STATUS_OPTIONS = [
  { value: ISSUE_STATUSES.REPORTED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.REPORTED] },
  { value: ISSUE_STATUSES.UNDER_REVIEW, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.UNDER_REVIEW] },
  { value: ISSUE_STATUSES.ASSIGNED_TO_DEPARTMENT, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.ASSIGNED_TO_DEPARTMENT] },
  { value: ISSUE_STATUSES.WORK_IN_PROGRESS, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.WORK_IN_PROGRESS] },
  { value: ISSUE_STATUSES.RESOLVED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.RESOLVED] },
  { value: ISSUE_STATUSES.CITIZEN_VERIFIED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.CITIZEN_VERIFIED] },
  { value: ISSUE_STATUSES.CLOSED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.CLOSED] },
  { value: ISSUE_STATUSES.VOLUNTEER_CLAIMED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.VOLUNTEER_CLAIMED] },
  { value: ISSUE_STATUSES.COMMUNITY_FIX_IN_PROGRESS, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.COMMUNITY_FIX_IN_PROGRESS] },
  { value: ISSUE_STATUSES.RESOLVED_BY_COMMUNITY, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.RESOLVED_BY_COMMUNITY] },
  { value: ISSUE_STATUSES.REJECTED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.REJECTED] },
];

export const ISSUE_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...ISSUE_STATUS_OPTIONS,
];
