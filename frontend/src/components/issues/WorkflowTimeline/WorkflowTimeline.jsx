import { mapBackendStatus, STATUS, statusConfig } from '@/utils/statusConfig';
import './WorkflowTimeline.css';

const BASE_STEP_KEYS = [
  STATUS.REPORTED,
  STATUS.UNDER_REVIEW,
  STATUS.ASSIGNED,
  STATUS.IN_PROGRESS,
  STATUS.RESOLVED,
];

function buildSteps(status) {
  const normalized = mapBackendStatus(status);
  const stepKeys = [...BASE_STEP_KEYS];

  if (normalized === STATUS.REJECTED) {
    stepKeys[stepKeys.length - 1] = STATUS.REJECTED;
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

const WorkflowTimeline = ({ status }) => {
  const steps = buildSteps(status);
  const currentIndex = getCurrentIndex(steps, status);
  const normalized = mapBackendStatus(status);

  return (
    <div className="workflow-timeline" aria-label="Issue workflow timeline">
      <h3 className="workflow-timeline__title">Workflow</h3>
      <ol className="workflow-timeline__list">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex || (isCurrent && normalized === STATUS.RESOLVED);
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
