import { mapBackendStatus, statusConfig } from '@/utils/statusConfig';

const StatusBadge = ({ status }) => {
  const key = mapBackendStatus(status);
  const config = statusConfig[key] || {};
  const label = config.label || status;
  const colorClass = config.color ? `status-${config.color}` : '';

  return (
    <span className={`status-badge ${colorClass}`.trim()}>
      {label}
    </span>
  );
};

export default StatusBadge;
