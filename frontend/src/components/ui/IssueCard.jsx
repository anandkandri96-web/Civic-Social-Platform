import { useState } from 'react';
import { Link } from 'react-router-dom';
import VoteButton from './VoteButton';
import { useAuth } from '../../hooks/useAuth';
import { useRole } from '../../hooks/useRole';
import { deleteIssue } from '../../api/issues.api';
import './IssueCard.css';

const STATUS_CLASS = {
  reported: 'open',
  under_review: 'in-progress',
  assigned_to_department: 'in-progress',
  work_in_progress: 'in-progress',
  resolved: 'resolved',
  resolved_by_community: 'resolved',
  closed: 'resolved',
};

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
  if (!date) return 'Recently';
  const d = new Date(date);
  const now = new Date();
  const sec = Math.floor((now - d) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hr ago`;
  if (sec < 2592000) return `${Math.floor(sec / 86400)} day${Math.floor(sec / 86400) > 1 ? 's' : ''} ago`;
  return d.toLocaleDateString();
}

const IssueCard = ({ issue, onVote, onDeleted }) => {
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [deleting, setDeleting] = useState(false);

  if (!issue) return null;

  const rep = issue.reportedBy;
  const reporterId = rep && typeof rep === 'object' ? rep._id : rep;
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
      alert(err?.response?.data?.message || err?.message || 'Failed to delete issue');
    } finally {
      setDeleting(false);
    }
  };

  const statusKey = STATUS_CLASS[String(issue.status || '').toLowerCase()] || 'open';

  return (
    <article className="issue-card">
      <div className="issue-card__top">
        <span className="issue-card__category">{issue.category || 'Other'}</span>
        <span className={`issue-card__status issue-card__status--${statusKey}`}>{issue.status || 'Reported'}</span>
      </div>

      <Link to={`/issues/${issue._id}`} className="issue-card__title-link">
        <h3 className="issue-card__title">{issue.title}</h3>
      </Link>

      <div className="issue-card__meta">
        <span className="issue-card__location">?? {formatLocation(issue.location, issue.locationText)}</span>
        <span className="issue-card__time">{formatTimeAgo(issue.createdAt)}</span>
      </div>

      <p className="issue-card__desc">{issue.description || 'No description provided.'}</p>

      <div className="issue-card__footer">
        {!isAdmin && (
          <div className="issue-card__vote">
            <VoteButton
              issueId={issue._id}
              voteCount={issue.voteCount ?? issue.votes ?? 0}
              userVoted={issue.userVoted}
              onVote={onVote}
            />
          </div>
        )}
        <div className="issue-card__actions">
          <Link to={`/issues/${issue._id}`} className="details-link">View</Link>
          {canDelete && (
            <button
              type="button"
              className="issue-card-delete"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? '...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default IssueCard;