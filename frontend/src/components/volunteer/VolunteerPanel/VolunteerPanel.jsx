import { useState } from 'react';
import { Link } from 'react-router-dom';
import { claimVolunteerIssue, updateVolunteerProgress } from '@api/volunteer.api.js';
import { getErrorMessage } from '@api/utils';
import { useRole } from '../../../hooks/useRole';
import './VolunteerPanel.css';

const VolunteerPanel = ({ issue, onIssueUpdate }) => {
  const { isVolunteer } = useRole();
  const [loading, setLoading] = useState(false);

  if (!isVolunteer) return null;
  if (!issue?._id) return null;

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
    setLoading(true);
    try {
      const updated = await updateVolunteerProgress(issue._id);
      onIssueUpdate(updated);
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
        <button onClick={handleProgress} disabled={loading}>
          {issue.status === 'volunteer_claimed' ? 'Start Fix' : 'Confirm In Progress'}
        </button>
      )}
      {canComplete && (
        <div>
          <Link to={`/dashboard/volunteer/submit/${issue._id}`} className="volunteer-panel__link">
            Submit Resolution Report
          </Link>
        </div>
      )}
    </div>
  );
};

export default VolunteerPanel;
