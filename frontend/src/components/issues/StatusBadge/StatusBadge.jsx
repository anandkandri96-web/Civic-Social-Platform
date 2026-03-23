import { mapBackendStatus, statusConfig } from '@/utils/statusConfig';
import { ISSUE_STATUS_LABELS } from '@/constants/issueStatus';

const StatusBadge = ({ status }) => {
  const rawKey = String(status || '').toLowerCase();
  const key = mapBackendStatus(status);
  const config = statusConfig[key] || {};
  const label =
    ISSUE_STATUS_LABELS[rawKey] ||
    ISSUE_STATUS_LABELS[key] ||
    config.label ||
    status;
  const colorClass = config.color ? `status-${config.color}` : '';

  return (
    <span className={`status-badge ${colorClass}`.trim()}>
      {label}
    </span>
  );
};

export default StatusBadge;
