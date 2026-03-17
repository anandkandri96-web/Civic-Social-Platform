import { mapBackendStatus, statusConfig } from '@/utils/statusConfig';
import './StatusTimeline.css';

const StatusTimeline = ({ statusHistory }) => {
  if (!statusHistory || statusHistory.length === 0) return null;

  const normalizedHistory = statusHistory.map((entry) => {
    const key = mapBackendStatus(entry.status);
    const config = statusConfig[key] || {};
    return {
      ...entry,
      statusKey: key,
      label: config.label || entry.status,
      color: config.color,
    };
  });

  return (
    <div className="status-timeline">
      <h3>Status Timeline</h3>
      <ul className="timeline-list">
        {normalizedHistory.map((entry, index) => (
          <li key={index} className="timeline-item">
            <div
              className={`timeline-dot ${entry.color ? `status-${entry.color}` : 'status-warning'}`.trim()}
            ></div>
            <div className="timeline-content">
              <strong>{entry.label}</strong>
              <small>{new Date(entry.timestamp).toLocaleString()}</small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StatusTimeline;
