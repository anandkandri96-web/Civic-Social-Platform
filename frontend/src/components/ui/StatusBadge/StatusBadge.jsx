import './StatusBadge.css';

const STATUS_CONFIG = {
  pending: {
    label: 'PENDING',
    className: 'status-pending',
  },
  assigned: {
    label: 'ASSIGNED',
    className: 'status-progress',
  },
  'in-progress': {
    label: 'IN PROGRESS',
    className: 'status-progress',
  },
  resolved: {
    label: 'RESOLVED',
    className: 'status-resolved',
  },
};

const StatusBadge = ({ status }) => {
  const config =
    STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
