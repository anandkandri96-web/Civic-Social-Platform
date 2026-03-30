import { mapBackendStatus, STATUS, statusConfig } from '@/utils/statusConfig';
import './WorkflowTimeline.css';

const BASE_STEP_KEYS = [
  STATUS.REPORTED,
  STATUS.UNDER_REVIEW,
  STATUS.ASSIGNED,
  STATUS.IN_PROGRESS,
  STATUS.RESOLVED,
];

function buildSteps(status, isVerified = false) {
  const normalized = mapBackendStatus(status);
  const stepKeys = [...BASE_STEP_KEYS];

  if (normalized === STATUS.REJECTED) {
    stepKeys[stepKeys.length - 1] = STATUS.REJECTED;
  }

  // Add citizen verification step if resolved and verified
  if (normalized === STATUS.RESOLVED && isVerified) {
    stepKeys.push(STATUS.VERIFIED);
  }

  return stepKeys.map((key) => ({
    key,
    label: statusConfig[key]?.label || key,
  }));
}

function getCurrentIndex(steps, status) {
  const normalized = mapBackendStatus(status);
  const idx = steps.findIndex((step) => step.key === normalized);
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

const WorkflowTimeline = ({ status, isVerified = false, priority = 'medium' }) => {
  const steps = buildSteps(status, isVerified);
  const currentIndex = getCurrentIndex(steps, status);
  const normalized = mapBackendStatus(status);

  return (
    <div className="workflow-timeline" aria-label="Issue workflow timeline">
      <div className="workflow-timeline__header">
        <h4 className="workflow-timeline__title">Workflow Progress</h4>
        <div className={`workflow-timeline__priority priority-${priority}`}>
          {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
        </div>
      </div>

      <ol className="workflow-timeline__list">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex || (isCurrent && normalized === STATUS.RESOLVED && !isVerified) || (isCurrent && normalized === STATUS.VERIFIED);
          const isPending = index > currentIndex;

          return (
            <li
              key={`${step.key}-${index}`}
              className={`workflow-timeline__item${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}${isPending ? ' is-pending' : ''}`}
            >
              <div className="workflow-timeline__marker" aria-hidden="true">
                {isDone ? <CheckIcon /> : <span className="workflow-timeline__dot" />}
              </div>
              <div className="workflow-timeline__content">
                <div className="workflow-timeline__label">{step.label}</div>
                {isCurrent && (
                  <div className="workflow-timeline__status">Current Step</div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {normalized === STATUS.RESOLVED && !isVerified && (
        <div className="workflow-timeline__pending-verification">
          <div className="verification-notice">
            <div className="verification-icon">⏳</div>
            <div className="verification-text">
              <strong>Awaiting Citizen Verification</strong>
              <p>The issue has been resolved and is waiting for community verification.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowTimeline;
