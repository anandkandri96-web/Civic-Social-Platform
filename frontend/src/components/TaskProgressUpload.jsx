import { useState } from 'react';
import { updateWorkerTaskProgress } from '@api/worker.api.js';
import { getErrorMessage } from '@api/utils';
import './TaskProgressUpload.css';

const TaskProgressUpload = ({ task, onUpdate }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleUploadProgress = async () => {
    if (images.length === 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      images.forEach(file => formData.append('progressImages', file));
      const updated = await updateWorkerTaskProgress(task._id, formData);
      onUpdate(updated);
      setImages([]);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const updated = await updateWorkerTaskProgress(task._id, { status: 'completed' });
      onUpdate(updated);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="task-progress-upload">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => setImages(Array.from(e.target.files))}
      />
      <button onClick={handleUploadProgress} disabled={loading || images.length === 0}>
        Upload Progress Images
      </button>
      <button onClick={handleComplete} disabled={loading}>
        Mark Task Completed
      </button>
    </div>
  );
};

export default TaskProgressUpload;