import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import VoteButton from '../VoteButton/VoteButton';
import { useAuth } from '../../../hooks/useAuth';
import { usePermission } from '../../../hooks/usePermission';
import { deleteIssue } from '@api/issues.api.js';
import { getErrorMessage } from '@api/utils';
import { mapBackendStatus, statusConfig } from '@/utils/statusConfig';
import SafeImage from '../../common/SafeImage/SafeImage';
import { useToast } from '../../../contexts/ToastContext';
import { useModal } from '../../../contexts/ModalContext';
import { ISSUE_CATEGORY_LABELS, ISSUE_SEVERITY_LABELS } from '../../../constants/issueOptions';
import { ISSUE_STATUS_LABELS } from '../../../constants/issueStatus';
import './IssueCard.css';

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
  const { can } = usePermission();
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { confirm } = useModal();

  if (!issue) return null;

  const submittedImages = Array.isArray(issue?.images) ? issue.images.map(String).filter(Boolean) : [];
  const volunteerAfterImages = Array.isArray(issue?.communityProof) ? issue.communityProof.map(String).filter(Boolean) : [];
  const workerAfterImages = Array.isArray(issue?.workerProgressImages)
    ? issue.workerProgressImages.map(String).filter(Boolean)
    : [];
  const afterImages = Array.from(new Set([...volunteerAfterImages, ...workerAfterImages]));
  const isResolvedFlow = ['resolved', 'resolved_by_community', 'citizen_verified', 'closed'].includes(issue?.status);
  const coverImage = isResolvedFlow && afterImages[0] ? afterImages[0] : submittedImages[0];

  const rep = issue.reportedBy;
  const reporterId = rep && typeof rep === 'object' ? rep._id : rep;
  const isReporter = !!user?.id && String(reporterId) === String(user.id);
  const status = String(issue?.status || '').trim().toLowerCase();
  
  // ✅ Use permissions instead of role checks
  // Can delete if: admin OR (reporter AND in deletable status)
  const canDelete = can('issue:delete') && (user?.role === 'admin' || (isReporter && ['reported', 'under_review', 'closed'].includes(status)));
  
  const departmentName =
    issue?.assignedDepartment?.name ??
    (typeof issue?.assignedDepartment === 'string' ? issue.assignedDepartment : issue?.department);

  const rawSeverity = typeof issue.severity === 'number' ? issue.severity : Number(issue.severity || 0);
  const severity = Math.min(4, Math.max(1, Number.isFinite(rawSeverity) ? rawSeverity : 1));
  const priorityLabel = ISSUE_SEVERITY_LABELS[severity] || 'Low';
  const commentCount =
    typeof issue.commentCount === 'number'
      ? issue.commentCount
      : typeof issue.commentsCount === 'number'
        ? issue.commentsCount
        : Array.isArray(issue.comments)
          ? issue.comments.length
          : null;

  const handleDelete = async () => {
    if (!canDelete || deleting) return;
    const approved = await confirm({
      title: 'Delete issue',
      message: 'Delete this issue? This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!approved) return;
    setDeleting(true);
    try {
      await deleteIssue(issue._id);
      onDeleted?.(issue._id);
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const normalizedStatus = mapBackendStatus(issue?.status);
  const config = statusConfig[normalizedStatus] || {};
  const badgeClass = config.color ? `status-${config.color}` : 'status-warning';
  const statusLabel =
    ISSUE_STATUS_LABELS[String(issue?.status || '').toLowerCase()] ||
    ISSUE_STATUS_LABELS[normalizedStatus] ||
    config.label ||
    issue.status;
  const isVerified =
    issue?.verified === true ||
    issue?.verifiedByCitizen === true ||
    String(issue?.status || '').toLowerCase() === 'citizen_verified';

  // Category color mapping for glow effect
  const categoryColors = {
    roads: '#F2B933',
    electricity: '#2F8398',
    garbage: '#87A83F',
    drainage: '#C0C91E',
    water: '#2F8398',
    other: '#F27C54',
  };
  const categoryColor = categoryColors[String(issue.category || '').toLowerCase()] || categoryColors.other;

  return (
    <article
      className="issue-card is-hoverable"
      role="link"
      tabIndex={0}
      aria-label={`Open issue: ${issue.title}`}
      style={{ '--cat-color': categoryColor }}
      onClick={() => navigate(`/issues/${issue._id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/issues/${issue._id}`);
        if (e.key === ' ') {
          e.preventDefault();
          navigate(`/issues/${issue._id}`);
        }
      }}
    >
      <div className="issue-card__media" aria-label="Issue photo">
        <SafeImage src={coverImage} alt={issue.title} showSkeleton style={{ width: '100%', height: '100%' }} />
      </div>

      <div className="issue-card__top">
        <span className="issue-card__category">
          <span className="issue-card__category-icon" aria-hidden="true">
            {String(ISSUE_CATEGORY_LABELS[String(issue.category || '').toLowerCase()] || issue.category || '')
              .slice(0, 1)
              .toUpperCase() || 'O'}
          </span>
          <span className="issue-card__category-text">
            {ISSUE_CATEGORY_LABELS[String(issue.category || '').toLowerCase()] || issue.category || 'Other'}
          </span>
        </span>
        <div className="issue-card__badges">
          <span className={`badge-pill ${badgeClass}`}>
            {statusLabel}
          </span>
          {isVerified ? (
            <span className="badge-pill badge-pill--success" aria-label="Verified by citizen">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Verified
            </span>
          ) : null}
          {severity ? (
            <span className={`badge-pill ${severity >= 4 ? 'badge-pill--danger' : severity === 3 ? 'badge-pill--warning' : ''}`}>
              Priority: {priorityLabel}
            </span>
          ) : null}
        </div>
      </div>

      <h3 className="issue-card__title">{issue.title}</h3>

      <div className="issue-card__meta">
        <span className="issue-card__location">Location: {formatLocation(issue.location, issue.locationText)}</span>
        <span className="issue-card__time">{formatTimeAgo(issue.createdAt)}</span>
        {departmentName ? <span className="issue-card__department">Dept: {departmentName}</span> : null}
      </div>

      <p className="issue-card__desc">{issue.description || 'No description provided.'}</p>

      <div className="issue-card__footer">
        {/* ✅ Show vote button only if user doesn't have admin permissions */}
        {!can('admin:view_analytics') && (
          <div className="issue-card__vote" onClick={(e) => e.stopPropagation()}>
            <VoteButton
              issueId={issue._id}
              voteCount={issue.voteCount ?? issue.votes ?? 0}
              userVoted={issue.userVoted}
              onVote={onVote}
            />
          </div>
        )}
        {commentCount != null ? <span className="issue-card__comments">{commentCount} comments</span> : null}
        <div className="issue-card__actions">
          {canDelete && (
            <button
              type="button"
              className="issue-card-delete"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={deleting}
            >
              {deleting ? '...' : 'Delete'}
            </button>
          )}
          <Link to={`/issues/${issue._id}`} className="details-link" onClick={(e) => e.stopPropagation()}>
            View details
          </Link>
        </div>
      </div>
    </article>
  );
};

export default IssueCard;
