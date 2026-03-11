import './WorkflowTimeline.css';

const DEFAULT_STEPS = [
  { key: 'reported', label: 'Reported' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'assigned_to_department', label: 'Assigned' },
  { key: 'work_in_progress', label: 'Work In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const ALT_LABELS = {
  volunteer_claimed: 'Volunteer Claimed',
  community_fix_in_progress: 'Community Fix In Progress',
  resolved_by_community: 'Resolved (Community)',
  citizen_verified: 'Citizen Verified',
};

function normalizeKey(status) {
  return String(status || 'reported').trim().toLowerCase();
}

function buildSteps(status, { isCommunityFlow } = {}) {
  const s = normalizeKey(status);

  // Expand to show citizen verification if present in the current flow.
  const base = [...DEFAULT_STEPS];
  const resolvedIdx = base.findIndex((x) => x.key === 'resolved');
  if (resolvedIdx >= 0) {
    base.splice(resolvedIdx + 1, 0, { key: 'citizen_verified', label: 'Citizen Verified' });
  }

  // Display community track labels when relevant, without changing the underlying keys.
  const shouldUseCommunityLabels =
    Boolean(isCommunityFlow) || ['volunteer_claimed', 'community_fix_in_progress', 'resolved_by_community'].includes(s);
  if (shouldUseCommunityLabels) {
    const assigned = base.find((x) => x.key === 'assigned_to_department');
    if (assigned) assigned.label = ALT_LABELS.volunteer_claimed;
    const wip = base.find((x) => x.key === 'work_in_progress');
    if (wip) wip.label = ALT_LABELS.community_fix_in_progress;
    const resolved = base.find((x) => x.key === 'resolved');
    if (resolved) resolved.label = ALT_LABELS.resolved_by_community;
  }

  return base;
}

function getCurrentIndex(steps, status) {
  const s = normalizeKey(status);

  // Map backend status values into the closest visual step.
  const map = {
    reported: 'reported',
    under_review: 'under_review',
    assigned_to_department: 'assigned_to_department',
    work_in_progress: 'work_in_progress',
    resolved: 'resolved',
    resolved_by_community: 'resolved',
    citizen_verified: 'citizen_verified',
    closed: 'closed',
    volunteer_claimed: 'assigned_to_department',
    community_fix_in_progress: 'work_in_progress',
    rejected: 'under_review',
  };

  const k = map[s] || 'reported';
  const idx = steps.findIndex((x) => x.key === k);
  return Math.max(0, idx);
}

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M20 6L9 17l-5-5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const WorkflowTimeline = ({ status, isCommunityFlow = false }) => {
  const steps = buildSteps(status, { isCommunityFlow });
  const currentIndex = getCurrentIndex(steps, status);
  const s = normalizeKey(status);

  return (
    <div className="workflow-timeline" aria-label="Issue workflow timeline">
      <h3 className="workflow-timeline__title">Workflow</h3>
      <ol className="workflow-timeline__list">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex || (isCurrent && s === 'closed');
          return (
            <li
              key={step.key}
              className={`workflow-timeline__item${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
            >
              <div className="workflow-timeline__marker" aria-hidden="true">
                {isDone ? <CheckIcon /> : <span className="workflow-timeline__dot" />}
              </div>
              <div className="workflow-timeline__content">
                <div className="workflow-timeline__label">{step.label}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default WorkflowTimeline;
