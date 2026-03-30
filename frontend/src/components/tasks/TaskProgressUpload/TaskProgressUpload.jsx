import { useState } from 'react';
import { uploadTaskProgress, updateTaskStatus } from '@api/task.api.js';
import { getErrorMessage } from '@api/utils';
import { useToast } from '../../../contexts/ToastContext';
import './TaskProgressUpload.css';

const TaskProgressUpload = ({ task, onUpdate }) => {
  const [images, setImages] = useState([]);
  const [reportText, setReportText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const MAX_IMAGES = 5;
  const hasProgressImages = Array.isArray(task?.progressImages) && task.progressImages.length > 0;
  // If task status allows completing, and has images, and the report is >= 10 chars.
  const canComplete = ['accepted', 'in_progress'].includes(String(task?.status || '').toLowerCase()) && hasProgressImages && reportText.trim().length >= 10;
  const { showToast } = useToast();

  const handleUploadProgress = async () => {
    if (images.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const updated = await uploadTaskProgress(task._id, { progressImages: images });
      onUpdate(updated);
      setImages([]);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      showToast(msg, { tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (reportText.trim().length < 10) {
      setError('A completion report of at least 10 characters is required.');
      return;
    }
    setLoading(true);
    try {
      const updated = await updateTaskStatus(task._id, 'completed', reportText.trim());
      onUpdate(updated);
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-progress-upload">
      {error ? <div className="task-progress-upload__error">{error}</div> : null}
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          setError('');
          const files = Array.from(e.target.files || []);
          const imagesOnly = files.filter((f) => String(f?.type || '').startsWith('image/'));
          if (imagesOnly.length !== files.length) {
            setError('Only image files are allowed.');
          }
          if (imagesOnly.length > MAX_IMAGES) {
            setError(`You can upload up to ${MAX_IMAGES} images per update.`);
            setImages(imagesOnly.slice(0, MAX_IMAGES));
            return;
          }
          setImages(imagesOnly);
        }}
      />
      <button onClick={handleUploadProgress} disabled={loading || images.length === 0}>
        Upload Progress Images
      </button>
      <div className="task-progress-upload__report-area">
        <textarea
          value={reportText}
          onChange={(e) => {
            setError('');
            setReportText(e.target.value);
          }}
          placeholder="Enter a final completion report describing the work done (min 10 characters)"
          rows={3}
          disabled={loading}
        />
        <div className="task-progress-upload__char-count">{reportText.length} characters</div>
      </div>
      <button onClick={handleComplete} disabled={loading || !canComplete}>
        Mark Task Completed
      </button>
      {!hasProgressImages && (
        <p className="task-progress-upload__hint">Upload at least one image before completing the task.</p>
      )}
      {hasProgressImages && reportText.trim().length < 10 && (
        <p className="task-progress-upload__hint">A completion report of at least 10 characters is required to finish the task.</p>
      )}
    </div>
  );
};

export default TaskProgressUpload;
