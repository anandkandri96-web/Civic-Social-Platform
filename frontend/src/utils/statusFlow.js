// Frontend mirror of backend status transition rules (issueStatusMachine.js)
// Keep in sync with Backend/config/issueStatusMachine.js STATUS_TRANSITIONS

export const STATUS_TRANSITIONS = {
  reported:                   ['under_review', 'assigned_to_department', 'volunteer_claimed', 'rejected'],
  under_review:               ['assigned_to_department', 'volunteer_claimed', 'rejected'],
  assigned_to_department:     ['work_in_progress'],
  work_in_progress:           ['awaiting_officer_verification', 'under_review'],
  awaiting_officer_verification: ['resolved'],
  volunteer_claimed:          ['community_fix_in_progress', 'reported'],
  community_fix_in_progress:  ['resolved_by_community'],
  resolved:                   ['citizen_verified', 'closed', 'under_review', 'reported'],
  resolved_by_community:      ['citizen_verified', 'closed', 'reported'],
  citizen_verified:           ['closed'],
  rejected:                   [],
  closed:                     ['reported'],
};

export function canTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  const allowed = STATUS_TRANSITIONS[String(fromStatus).toLowerCase()] || [];
  return allowed.includes(String(toStatus).toLowerCase());
}
