import './StatusTimeline.css';

const StatusTimeline = ({ statusHistory }) => {
  if (!statusHistory || statusHistory.length === 0) return null;

  return (
    <div className="status-timeline">
      <h3>Status Timeline</h3>
      <ul className="timeline-list">
        {statusHistory.map((entry, index) => (
          <li key={index} className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <strong>{entry.status}</strong>
              <small>{new Date(entry.timestamp).toLocaleString()}</small>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default StatusTimeline;