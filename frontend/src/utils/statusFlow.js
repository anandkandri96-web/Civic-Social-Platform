// Frontend mirror of backend status transition rules
// Used to disable invalid status options in the UI and guard actions.

export const STATUS_TRANSITIONS = {
  reported: ['under_review', 'volunteer_claimed', 'rejected'],
  under_review: ['assigned_to_department', 'volunteer_claimed', 'rejected'],
  assigned_to_department: ['work_in_progress'],
  work_in_progress: ['resolved'],
  volunteer_claimed: ['community_fix_in_progress'],
  community_fix_in_progress: ['resolved_by_community'],
  resolved: ['citizen_verified'],
  resolved_by_community: ['citizen_verified'],
  citizen_verified: ['closed'],
  rejected: [],
  closed: [],
};

/**
 * Returns true if a transition from one status to another is allowed.
 */
export function canTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  const allowed = STATUS_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}
