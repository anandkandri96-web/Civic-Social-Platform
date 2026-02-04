import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import IssueStatusBadge from './IssueStatusBadge';
import VoteButton from './VoteButton';
import { useAuth } from '../../hooks/useAuth';
import { useRole } from '../../hooks/useRole';
import { deleteIssue } from '../../api/issues.api';
import './IssuesCard.css';

const SEVERITY_LABELS = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical', 5: 'Urgent' };

function formatLocation(location, locationText) {
  const manual = locationText && String(locationText).trim();
  const coords =
    location?.coordinates && Array.isArray(location.coordinates) && location.coordinates.length >= 2
      ? `${Number(location.coordinates[1]).toFixed(4)}, ${Number(location.coordinates[0]).toFixed(4)}`
      : null;

  if (manual && coords) return `${manual} (${coords})`;
  if (manual) return manual;
  if (coords) return coords;
  return typeof location === 'string' ? location : 'Location not specified';
}

function formatTimeAgo(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  if (sec < 2592000) return `${Math.floor(sec / 86400)} days ago`;
  return d.toLocaleDateString();
}

const IssueCard = ({ issue, onVote, onDeleted }) => {
  const { user } = useAuth();
  const { isAdmin, isVolunteer } = useRole();
  const [deleting, setDeleting] = useState(false);

  if (!issue) return null;

  const reporterId = useMemo(() => {
    const rep = issue?.reportedBy;
    return rep && typeof rep === 'object' ? rep._id : rep;
  }, [issue?.reportedBy]);

  const isReporter = !!user?.id && String(reporterId) === String(user.id);
  const canDelete = isAdmin || isReporter;

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    if (!window.confirm('Delete this issue? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteIssue(issue._id);
      onDeleted?.(issue._id);
    } catch (err) {
      console.error('Delete issue failed:', err);
      alert(err?.response?.data?.message || err?.message || 'Failed to delete issue');
    } finally {
      setDeleting(false);
    }
  };

  const severityLabel = typeof issue.severity === 'number'
    ? (SEVERITY_LABELS[issue.severity] || `Level ${issue.severity}`)
    : (issue.severity || 'Low');
  const severityClass = typeof issue.severity === 'number'
    ? (SEVERITY_LABELS[issue.severity] || 'medium').toLowerCase()
    : String(issue.severity || 'low').toLowerCase();

  return (
    <div className="issue-card">
      <div className="issue-card-image">
        <IssueStatusBadge status={issue.status} />
        <div className="issue-icon">
          🛠️
        </div>
      </div>

      <div className="issue-card-content">
        <div className="issue-tags">
          <span className="category-tag">
            {issue.category || 'Other'}
          </span>
          <span className={`severity-tag ${severityClass}`}>
            {severityLabel}
          </span>
        </div>

        <h3 className="issue-title">
          {issue.title}
        </h3>

        <p className="issue-location">
          📍 {formatLocation(issue.location, issue.locationText)}
        </p>

        <p className="issue-description">
          {issue.description || 'No description provided.'}
        </p>

        <div className="issue-footer">
          <span className="issue-time">
            ⏱ {formatTimeAgo(issue.createdAt)}
          </span>

          <div className="issue-actions">
            <VoteButton
              issueId={issue._id}
              voteCount={issue.voteCount ?? issue.votes ?? 0}
              userVoted={issue.userVoted}
              onVote={onVote}
            />
            <Link
              to={`/issues/${issue._id}`}
              className="details-link"
            >
              View →
            </Link>
            {canDelete && (
              <button
                type="button"
                className="issue-card-delete"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Delete issue"
              >
                {deleting ? '…' : 'Delete'}
              </button>
            )}
          </div>
        </div>

        {(isAdmin || isVolunteer) && (
          <div className="admin-status">
            Status: {issue.status}
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueCard;
