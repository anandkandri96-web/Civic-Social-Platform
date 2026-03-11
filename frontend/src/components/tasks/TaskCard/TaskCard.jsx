import { useState } from 'react';
import { updateTaskStatus } from '@api/task.api.js';
import { getErrorMessage } from '@api/utils';
import SafeImage from '../../common/SafeImage/SafeImage';
import './TaskCard.css';

const TaskCard = ({ task, onUpdate, children, workerId }) => {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const updated = await updateTaskStatus(task._id, 'accepted');
      onUpdate?.(updated);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <article className="task-card card">
      <div className="task-header">
        <h3>{task.issue?.title || 'Task'}</h3>
        <span className="task-status">{task.status}</span>
      </div>
      <div className="task-details">
        <p className="task-worker-id">Worker ID: {workerId || 'N/A'}</p>
        <p>Category: {task.issue?.category}</p>
        <p>Location: {task.issue?.locationText}</p>
      </div>
      {Array.isArray(task?.progressImages) && task.progressImages.length > 0 ? (
        <div className="task-progress-gallery" aria-label="Uploaded task progress images">
          {task.progressImages.slice(0, 6).map((src, idx) => (
            <a
              key={`${src}-${idx}`}
              href={String(src)}
              target="_blank"
              rel="noreferrer"
              className="task-progress-thumb"
              onClick={(e) => e.stopPropagation()}
            >
              <SafeImage src={src} alt={`Progress ${idx + 1}`} showSkeleton style={{ width: '100%', height: '100%' }} />
            </a>
          ))}
        </div>
      ) : null}
      {task.status === 'assigned' && (
        <button onClick={handleAccept} disabled={accepting}>
          {accepting ? 'Accepting...' : 'Accept Task'}
        </button>
      )}
      {children}
    </article>
  );
};

export default TaskCard;
