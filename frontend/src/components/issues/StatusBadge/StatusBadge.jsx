import { ISSUE_STATUS_LABELS } from '../../../constants/issueStatus';
import './StatusBadge.css';

const STATUS_CONFIG = {
  reported: { className: 'status-pending' },
  under_review: { className: 'status-progress' },
  assigned_to_department: { className: 'status-progress' },
  work_in_progress: { className: 'status-progress' },
  volunteer_claimed: { className: 'status-progress' },
  community_fix_in_progress: { className: 'status-progress' },
  resolved: { className: 'status-resolved' },
  resolved_by_community: { className: 'status-resolved' },
  citizen_verified: { className: 'status-resolved' },
  closed: { className: 'status-resolved' },
  rejected: { className: 'status-pending' },
};

const StatusBadge = ({ status }) => {
  const key = String(status || 'reported').toLowerCase();
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.reported;
  const label = ISSUE_STATUS_LABELS[status] || status;

  return (
    <span className={`status-badge ${config.className}`}>
      {label.toUpperCase()}
    </span>
  );
};

export default StatusBadge;
