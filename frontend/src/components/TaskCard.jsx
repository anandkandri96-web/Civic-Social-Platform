import { useState } from 'react';
import { acceptWorkerTask } from '@api/worker.api.js';
import { getErrorMessage } from '@api/utils';
import './TaskCard.css';

const TaskCard = ({ task, children }) => {
  const [accepting, setAccepting] = useState(false);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptWorkerTask(task._id);
      // Update will be handled by parent
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
        <p>Category: {task.issue?.category}</p>
        <p>Location: {task.issue?.locationText}</p>
      </div>
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