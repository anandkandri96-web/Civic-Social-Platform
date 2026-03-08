import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Loader from '../../../components/common/Loader/Loader';
import VoteButton from '../../../components/ui/VoteButton';
import StatusBadge from '../../../components/ui/StatusBadge/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { useRole } from '../../../hooks/useRole';
import { createIssueComment, deleteIssueComment, getIssueComments, updateIssueComment } from '@api/comments.api';
import { closeIssue, deleteIssue, getIssueById, reopenIssue, verifyIssue } from '@api/issues.api';
import { getErrorMessage } from '@api/utils';
import { canTransition } from '../../../utils/statusFlow';
import VolunteerPanel from '../../../components/VolunteerPanel';
import StatusTimeline from '../../../components/StatusTimeline';
import './IssueDetails.css';

const normalizeImages = (images) =>
  Array.isArray(images)
    ? images
        .map((img) => String(img || '').trim())
        .filter(Boolean)
    : [];

const IssueDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthentica, isVolunteerted } = useAuth();
  const { isAdmin, isOfficer } = useRole();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchIssueAndComments = async () => {
      try {
        const [issueData, commentsData] = await Promise.all([getIssueById(id), getIssueComments(id)]);
        if (!mounted) return;
        setIssue(issueData);
        setComments(Array.isArray(commentsData) ? commentsData : []);
      } catch (err) {
        console.error('Failed to load issue', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchIssueAndComments();
    return () => {
      mounted = false;
    };
  }, [id]);

  const reporterId = issue?.reportedBy?._id ?? issue?.reportedBy;
  const isReporter = user?.id && String(reporterId) === String(user.id);
  const canDelete = isAdmin || isReporter;
  const canClose = (isAdmin || isOfficer) && canTransition(issue?.status, 'closed');
  const canVerify = isReporter && canTransition(issue?.status, 'citizen_verified');
  const REOPENABLE = ['resolved', 'resolved_by_community', 'closed'];
  const canReopen = isReporter && REOPENABLE.includes(issue?.status);

  const backPath = isAdmin ? '/admin' : '/issues';
  const backLabel = isAdmin ? 'Admin Dashboard' : 'Issues';
  const submittedImages = normalizeImages(issue?.images);
  const volunteerAfterImages = normalizeImages(issue?.communityProof);
  const workerAfterImages = normalizeImages(issue?.workerProgressImages);
  const afterImages = [...new Set([...volunteerAfterImages, ...workerAfterImages])];
  const isResolvedFlow = ['resolved', 'resolved_by_community', 'citizen_verified', 'closed'].includes(issue?.status);
  const coverImage = isResolvedFlow && afterImages[0] ? afterImages[0] : submittedImages[0];

  const handleDelete = async () => {
    if (!canDelete || !issue?._id) return;
    if (!window.confirm('Are you sure you want to delete this issue? This cannot be undone.')) return;
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteIssue(issue._id);
      navigate(backPath, { replace: true });
    } catch (err) {
      setDeleteError(getErrorMessage(err));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleIssueAction = async (action) => {
    if (!issue?._id) return;
    setActionLoading(true);
    try {
      const updated = await action(issue._id);
      setIssue(updated);
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateComment = async (e) => {
    e.preventDefault();
    const message = commentText.trim();
    if (!message) return;

    setCommentLoading(true);
    try {
      const created = await createIssueComment(id, { message });
      setComments((prev) => [created, ...prev]);
      setCommentText('');
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setCommentLoading(false);
    }
  };

  const handleEditComment = async (commentId, currentText) => {
    const nextMessage = window.prompt('Edit comment', currentText);
    if (!nextMessage || !nextMessage.trim()) return;
    try {
      const updated = await updateIssueComment(commentId, { message: nextMessage.trim() });
      setComments((prev) => prev.map((c) => (c._id === commentId ? { ...c, ...updated } : c)));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await deleteIssueComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!issue) return <p className="error-text">Issue not found.</p>;

  return (
    <div className="issue-details-page">
      <Link to={backPath} className="back-link">
        Back to {backLabel}
      </Link>

      <div className="issue-details-card card">
        <div className="issue-image-wrapper">
          {coverImage ? (
            <img src={coverImage} alt={issue.title} />
          ) : (
            <div className="image-placeholder">No image</div>
          )}

          <div className="status-badge">
            <StatusBadge status={issue.status} />
          </div>
        </div>

        <div className="issue-content">
          <div className="issue-tags">
            <span className="tag">{issue.category}</span>
            <span className="tag secondary">
              Severity:{' '}
              {typeof issue.severity === 'number'
                ? ['Low', 'Medium', 'High', 'Critical', 'Urgent'][issue.severity - 1] || issue.severity
                : issue.severity}
            </span>
          </div>

          <div className="issue-header">
            <h1>{issue.title}</h1>
            {!isAdmin && (
              <VoteButton
                issueId={issue._id}
                voteCount={issue.voteCount ?? issue.votes ?? 0}
                userVoted={issue.userVoted}
                onVote={(result) => setIssue((prev) => ({ ...prev, voteCount: result.voteCount, userVoted: result.voted }))}
              />
            )}
          </div>

          <div className="issue-meta">
            <span>
              Location:{' '}
              {issue.locationText && String(issue.locationText).trim()
                ? `${String(issue.locationText).trim()}${issue.location?.coordinates ? ` (${issue.location.coordinates[1]}, ${issue.location.coordinates[0]})` : ''}`
                : issue.location?.coordinates
                  ? `${issue.location.coordinates[1]}, ${issue.location.coordinates[0]}`
                  : issue.location || '—'}
            </span>
            <span>Date: {new Date(issue.createdAt).toDateString()}</span>
            <span>Reported by {issue.reportedBy?.name ?? 'Unknown'}</span>
            {issue.department && <span>Department: {issue.department}</span>}
          </div>

          {canDelete && (
            <div className="issue-details-actions">
              {deleteError && <p className="issue-delete-error">{deleteError}</p>}
              <button type="button" className="issue-delete-btn" onClick={handleDelete} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting...' : 'Delete issue'}
              </button>
            </div>
          )}

          {(canVerify || canReopen || canClose) && (
            <div className="issue-workflow-actions">
              {canVerify && (
                <button type="button" disabled={actionLoading} onClick={() => handleIssueAction(verifyIssue)}>
                  Verify Resolution
                </button>
              )}
              {canReopen && (
                <button type="button" disabled={actionLoading} onClick={() => handleIssueAction(reopenIssue)}>
                  Reopen Issue
                </button>
              )}
              {canClose && (
                <button type="button" disabled={actionLoading} onClick={() => handleIssueAction(closeIssue)}>
                  Close Issue
                </button>
              )}
            

          {isVolunteer && (
            <VolunteerPanel issue={issue} onIssueUpdate={setIssue} />
          )}</div>
          )}

          <div className="issue-description">
            <h3>Description</h3>
            <p>{issue.description || 'No description provided.'}</p>
          </div>

          <StatusTimeline statusHistory={issue.statusHistory} />

          {isResolvedFlow && afterImages.length > 0 && (
            <div className="issue-images-section">
              <h3>Final Fixed Images</h3>
              <div className="issue-image-grid">
                {afterImages.map((img, idx) => (
                  <a key={`after-${img}-${idx}`} href={img} target="_blank" rel="noreferrer">
                    <img src={img} alt={`Final fixed image ${idx + 1}`} />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="issue-comments">
            <h3>Comments</h3>

            {isAuthenticated && (
              <form onSubmit={handleCreateComment} className="issue-comment-form">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment"
                />
                <button type="submit" disabled={commentLoading}>
                  {commentLoading ? 'Posting...' : 'Post Comment'}
                </button>
              </form>
            )}

            {comments.length === 0 ? (
              <p className="text-muted">No comments yet.</p>
            ) : (
              <ul className="issue-comment-list">
                {comments.map((comment) => {
                  const commentUserId = comment?.user?._id ?? comment?.user;
                  const canModifyComment = isAdmin || (user?.id && String(commentUserId) === String(user.id));
                  return (
                    <li key={comment._id} className="issue-comment-item">
                      <div className="issue-comment-head">
                        <strong>{comment?.user?.name || 'User'}</strong>
                        <small>{new Date(comment.createdAt).toLocaleString()}</small>
                      </div>
                      <p>{comment.message}</p>
                      {canModifyComment && (
                        <div className="issue-comment-actions">
                          <button type="button" onClick={() => handleEditComment(comment._id, comment.message)}>
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDeleteComment(comment._id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetails;
