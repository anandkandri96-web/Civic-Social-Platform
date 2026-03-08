import './StatusBadge.css';

const STATUS_CONFIG = {
  reported: { label: 'REPORTED', className: 'status-pending' },
  under_review: { label: 'UNDER REVIEW', className: 'status-progress' },
  assigned_to_department: { label: 'ASSIGNED', className: 'status-progress' },
  work_in_progress: { label: 'IN PROGRESS', className: 'status-progress' },
  volunteer_claimed: { label: 'VOLUNTEER CLAIMED', className: 'status-progress' },
  community_fix_in_progress: { label: 'COMMUNITY FIX', className: 'status-progress' },
  resolved: { label: 'RESOLVED', className: 'status-resolved' },
  resolved_by_community: { label: 'COMMUNITY RESOLVED', className: 'status-resolved' },
  citizen_verified: { label: 'CITIZEN VERIFIED', className: 'status-resolved' },
  closed: { label: 'CLOSED', className: 'status-resolved' },
  rejected: { label: 'REJECTED', className: 'status-pending' },
};

const StatusBadge = ({ status }) => {
  const key = String(status || 'reported').toLowerCase();
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.reported;

  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
