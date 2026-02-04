import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import IssueStatusBadge from '../../components/issues/IssueStatusBadge';
import VoteButton from '../../components/issues/VoteButton';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../hooks/useAuth';
import { useRole } from '../../hooks/useRole';
import { getIssueById, deleteIssue } from '../../api/issues.api';
import './IssueList.css';

const IssueDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useRole();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const fetchIssue = async () => {
      try {
        const data = await getIssueById(id);
        setIssue(data);
      } catch (err) {
        console.error('Failed to load issue', err);
      } finally {
        setLoading(false);
      }
    };

    fetchIssue();
  }, [id]);

  const reporterId = issue?.reportedBy?._id ?? issue?.reportedBy;
  const isReporter = user?.id && (String(reporterId) === String(user.id));
  const canDelete = isAdmin || isReporter;
  const backPath = isAdmin ? '/admin' : '/issues';
  const backLabel = isAdmin ? 'Back to Admin Dashboard' : 'Back to Issues';

  const handleDelete = async () => {
    if (!canDelete || !issue?._id) return;
    if (!window.confirm('Are you sure you want to delete this issue? This cannot be undone.')) return;
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteIssue(issue._id);
      navigate(backPath, { replace: true });
    } catch (err) {
      setDeleteError(err?.response?.data?.message || err?.message || 'Failed to delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!issue) return <p className="error-text">Issue not found.</p>;

  return (
    <div className="issue-details-page">
      <Link to={backPath} className="back-link">← {backLabel}</Link>

      <div className="issue-details-card">
        {/* Image */}
        <div className="issue-image-wrapper">
          {Array.isArray(issue.images) && issue.images[0] ? (
            <img src={issue.images[0]} alt={issue.title} />
          ) : (
            <div className="image-placeholder">📷</div>
          )}

          <div className="status-badge">
            <IssueStatusBadge status={issue.status} />
          </div>
        </div>

        {/* Content */}
        <div className="issue-content">
          <div className="issue-tags">
            <span className="tag">{issue.category}</span>
            <span className="tag secondary">
              Severity: {typeof issue.severity === 'number' ? ['Low', 'Medium', 'High', 'Critical', 'Urgent'][issue.severity - 1] || issue.severity : issue.severity}
            </span>
          </div>

          <div className="issue-header">
            <h1>{issue.title}</h1>
            <VoteButton
              issueId={issue._id}
              voteCount={issue.voteCount ?? issue.votes ?? 0}
              userVoted={issue.userVoted}
              onVote={(result) => setIssue((prev) => ({ ...prev, voteCount: result.voteCount, userVoted: result.voted }))}
            />
          </div>

          <div className="issue-meta">
            <span>
              📍 {issue.locationText && String(issue.locationText).trim()
                ? `${String(issue.locationText).trim()}${issue.location?.coordinates ? ` (${issue.location.coordinates[1]}, ${issue.location.coordinates[0]})` : ''}`
                : (issue.location?.coordinates
                  ? `${issue.location.coordinates[1]}, ${issue.location.coordinates[0]}`
                  : issue.location || '—')}
            </span>
            <span>📅 {new Date(issue.createdAt).toDateString()}</span>
            <span>👤 Reported by {issue.reportedBy?.name ?? 'Unknown'}</span>
          </div>

          {canDelete && (
            <div className="issue-details-actions">
              {deleteError && <p className="issue-delete-error">{deleteError}</p>}
              <button
                type="button"
                className="issue-delete-btn"
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete issue'}
              </button>
            </div>
          )}

          <div className="issue-description">
            <h3>Description</h3>
            <p>{issue.description || 'No description provided.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetails;
