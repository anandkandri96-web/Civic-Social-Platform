import { useState } from 'react';
import { claimVolunteerIssue, updateVolunteerProgress, resolveVolunteerIssue } from '@api/volunteer.api.js';
import { getErrorMessage } from '@api/utils';
import './VolunteerPanel.css';

const VolunteerPanel = ({ issue, onIssueUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [progressImages, setProgressImages] = useState([]);
  const [completionImages, setCompletionImages] = useState([]);

  const handleClaim = async () => {
    setLoading(true);
    try {
      const updated = await claimVolunteerIssue(issue._id);
      onIssueUpdate(updated);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleProgress = async () => {
    if (progressImages.length === 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      progressImages.forEach(file => formData.append('progressImages', file));
      const updated = await updateVolunteerProgress(issue._id, formData);
      onIssueUpdate(updated);
      setProgressImages([]);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      completionImages.forEach(file => formData.append('proofImages', file));
      const updated = await resolveVolunteerIssue(issue._id, formData);
      onIssueUpdate(updated);
      setCompletionImages([]);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const canClaim = issue.status === 'reported' || issue.status === 'under_review';
  const canProgress = issue.status === 'volunteer_claimed' || issue.status === 'community_fix_in_progress';
  const canComplete = issue.status === 'community_fix_in_progress';

  return (
    <div className="volunteer-panel">
      <h3>Volunteer Actions</h3>
      {canClaim && (
        <button onClick={handleClaim} disabled={loading}>
          Claim Issue
        </button>
      )}
      {canProgress && (
        <div>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setProgressImages(Array.from(e.target.files))}
          />
          <button onClick={handleProgress} disabled={loading || progressImages.length === 0}>
            Upload Progress Images
          </button>
        </div>
      )}
      {canComplete && (
        <div>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => setCompletionImages(Array.from(e.target.files))}
          />
          <button onClick={handleComplete} disabled={loading || completionImages.length === 0}>
            Mark Issue Completed
          </button>
        </div>
      )}
    </div>
  );
};

export default VolunteerPanel;