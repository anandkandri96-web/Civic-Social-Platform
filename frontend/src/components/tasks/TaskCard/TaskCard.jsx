import { useMemo, useState } from 'react';
import { updateTaskStatus } from '@api/task.api.js';
import { getErrorMessage } from '@api/utils';
import SafeImage from '../../common/SafeImage/SafeImage';
import { useToast } from '../../../contexts/ToastContext';
import './TaskCard.css';

const normalizeImageSrc = (input) => {
  if (!input) return '';
  if (typeof input === 'string') return input;
  if (typeof input === 'object') {
    if (input.url) return String(input.url);
    if (input.path) return String(input.path);
    if (input._id) return `/api/images/${input._id}`;
  }
  return '';
};

const TaskCard = ({ task, onUpdate, children, workerId }) => {
  const [accepting, setAccepting] = useState(false);
  const { showToast } = useToast();

  const issueImages = useMemo(() => {
    const raw = Array.isArray(task?.issue?.images) ? task.issue.images : [];
    return raw.map(normalizeImageSrc).filter(Boolean);
  }, [task?.issue?.images]);

  const progressImages = useMemo(() => {
    const raw = Array.isArray(task?.progressImages) ? task.progressImages : [];
    return raw.map(normalizeImageSrc).filter(Boolean);
  }, [task?.progressImages]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const updated = await updateTaskStatus(task._id, 'accepted');
      onUpdate?.(updated);
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
    } finally {
      setAccepting(false);
    }
  };

  return (
    <article className="issue-details-card">
      {/* 1. Images First (Cover + Gallery) */}
      {issueImages.length > 0 ? (
        <div style={{ margin: '-1.5rem -1.5rem 1rem -1.5rem' }}>
          {/* Main Cover Image */}
          <div style={{ height: '450px', width: '100%', overflow: 'hidden' }}>
            <a href={String(issueImages[0])} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ display: 'block', height: '100%' }}>
              <SafeImage src={issueImages[0]} alt="Reported issue cover" showSkeleton style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </a>
          </div>
          {/* Remaining Images in Gallery */}
          {issueImages.length > 1 && (
            <div className="task-progress-gallery" aria-label="Additional issue images" style={{ padding: '0 1.5rem', marginTop: '12px' }}>
              {issueImages.slice(1, 6).map((src, idx) => (
                <a key={`${src}-${idx}`} href={String(src)} target="_blank" rel="noreferrer" className="task-progress-thumb" onClick={(e) => e.stopPropagation()}>
                  <SafeImage src={src} alt={`Additional photo ${idx + 1}`} showSkeleton style={{ width: '100%', height: '100%' }} />
                </a>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* 2. Details */}
      <div className="task-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>{task.issue?.title || 'Task'}</h3>
        <span className="status-badge" style={{ alignSelf: 'center', marginBottom: 0 }}>{task.status}</span>
      </div>
      <div className="task-details" style={{ marginTop: '12px' }}>
        <p className="task-worker-id">Worker ID: {workerId || 'N/A'}</p>
        <p>Category: {task.issue?.category}</p>
        <p>Location: {task.issue?.locationText}</p>
        {task.issue?.description ? <p style={{ marginTop: '8px' }}>Description: {task.issue.description}</p> : null}
      </div>

      {/* 3. Accept Task */}
      {task.status === 'assigned' && (
        <button onClick={handleAccept} disabled={accepting} style={{ width: '100%', margin: '16px 0', padding: '12px' }}>
          {accepting ? 'Accepting...' : 'Accept Task'}
        </button>
      )}

      {/* 4. Other Details (Progress Images & Children) */}
      <div className="task-other-details" style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        {progressImages.length > 0 ? (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ marginBottom: '12px', fontSize: '0.95rem', color: '#555' }}>Your Progress Photos</h4>
            <div className="task-progress-gallery" aria-label="Uploaded task progress images" style={{ marginTop: 0 }}>
              {progressImages.slice(0, 6).map((src, idx) => (
                <a key={`${src}-${idx}`} href={String(src)} target="_blank" rel="noreferrer" className="task-progress-thumb" onClick={(e) => e.stopPropagation()}>
                  <SafeImage src={src} alt={`Progress ${idx + 1}`} showSkeleton style={{ width: '100%', height: '100%' }} />
                </a>
              ))}
            </div>
          </div>
        ) : null}
        {children}
      </div>
    </article>
  );
};

export default TaskCard;
