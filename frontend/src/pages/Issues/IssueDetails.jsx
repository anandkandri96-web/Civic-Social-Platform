import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import VoteButton from '../../components/issues/VoteButton/VoteButton';
import StatusBadge from '../../components/issues/StatusBadge/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { createIssueComment, deleteIssueComment, getIssueComments, updateIssueComment } from '@api/comments.api';
import { closeIssue, deleteIssue, getIssueById, reopenIssue, verifyIssue } from '@api/issues.api';
import { getErrorMessage } from '@api/utils';
import { resolveMediaUrl } from '@/utils/mediaUrl';
import { canTransition } from '../../utils/statusFlow';
import VolunteerPanel from '../../components/volunteer/VolunteerPanel/VolunteerPanel';
import WorkflowTimeline from '../../components/issues/WorkflowTimeline/WorkflowTimeline';
import IssueLeafletMap from '../../components/map/IssueLeafletMap';
import Skeleton from '../../components/common/Skeleton/Skeleton';
import SafeImage from '../../components/common/SafeImage/SafeImage';
import { useToast } from '../../contexts/ToastContext';
import { useModal } from '../../contexts/ModalContext';
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
  const { user, isAuthenticated } = useAuth();
  const { can, isAdmin, isOfficer, isVolunteer } = usePermission();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [liked, setLiked] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const { showToast } = useToast();
  const { confirm } = useModal();

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
  const status = String(issue?.status || '').trim().toLowerCase();
  // ✅ Use permissions instead of role checks
  // issue:delete allows: admins (always), citizens (if reporter + deletable status)
  const canDelete = can('issue:delete') && (user?.role === 'admin' || (isReporter && (status === 'reported' || status === 'closed')));
  // issue:close allows: admins and officers (with transition check)
  const canClose = can('issue:close') && canTransition(issue?.status, 'closed');
  const canVerify = isReporter && canTransition(issue?.status, 'citizen_verified');
  const REOPENABLE = ['resolved', 'resolved_by_community', 'closed'];
  const canReopen = isReporter && REOPENABLE.includes(issue?.status);

  const backPath = can('admin:view_analytics') ? '/admin' : '/issues';
  const backLabel = can('admin:view_analytics') ? 'Admin Dashboard' : 'Issues';
  const submittedImages = normalizeImages(issue?.images);
  const volunteerAfterImages = normalizeImages(issue?.communityProof);
  const workerAfterImages = normalizeImages(issue?.workerProgressImages);
  const afterImages = [...new Set([...volunteerAfterImages, ...workerAfterImages])];
  const isResolvedFlow = ['resolved', 'resolved_by_community', 'citizen_verified', 'closed'].includes(issue?.status);
  const coverImage = isResolvedFlow && afterImages[0] ? afterImages[0] : submittedImages[0];
  const isVerified =
    issue?.verified === true ||
    issue?.verifiedByCitizen === true ||
    String(issue?.status || '').toLowerCase() === 'citizen_verified';
  const isCommunityFlow = Boolean(
    issue?.volunteer ||
      (Array.isArray(issue?.communityProof) && issue.communityProof.length > 0) ||
      issue?.communityResolutionReport?.submittedAt
  );
  const coords = Array.isArray(issue?.location?.coordinates) ? issue.location.coordinates : null;
  const mapPoints = coords && coords.length >= 2
    ? [{
        id: issue._id,
        title: issue.title,
        locationText: issue.locationText,
        category: issue.category,
        status: issue.status,
        priority: Number(issue.severity || 3),
        lat: Number(coords[1]),
        lng: Number(coords[0]),
      }]
    : [];
  const assignedDepartmentName = issue?.assignedDepartment?.name ?? '';
  const assignedWorkerName = issue?.assignedWorker?.name ?? '';
  const volunteerName = issue?.volunteer?.name ?? '';
  const departmentName =
    issue?.assignedDepartment?.name ??
    (typeof issue?.assignedDepartment === 'string' ? issue.assignedDepartment : issue?.department);

  const handleDelete = async () => {
    if (!canDelete || !issue?._id) return;
    const approved = await confirm({
      title: 'Delete issue',
      message: 'Are you sure you want to delete this issue? This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!approved) return;
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
      showToast(getErrorMessage(err), { tone: 'error' });
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
      const composed = replyTo?.name ? `@${replyTo.name} ${message}` : message;
      const created = await createIssueComment(id, { message: composed });
      setComments((prev) => [created, ...prev]);
      setCommentText('');
      setReplyTo(null);
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
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
      showToast(getErrorMessage(err), { tone: 'error' });
    }
  };

  const handleDeleteComment = async (commentId) => {
    const approved = await confirm({
      title: 'Delete comment',
      message: 'Delete this comment?',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!approved) return;
    try {
      await deleteIssueComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="issue-details-page">
        <div className="issue-details-grid">
          <div className="issue-details-left card">
            <Skeleton height={260} radius={16} />
            <div className="issue-details-body">
              <Skeleton height={28} width="70%" radius={12} />
              <Skeleton height={16} width="40%" radius={12} style={{ marginTop: 10 }} />
              <Skeleton height={120} radius={16} style={{ marginTop: 14 }} />
              <Skeleton height={180} radius={16} style={{ marginTop: 14 }} />
            </div>
          </div>
          <div className="issue-details-right">
            <Skeleton height={260} radius={16} />
            <Skeleton height={220} radius={16} style={{ marginTop: 14 }} />
          </div>
        </div>
      </div>
    );
  }
  if (!issue) return <p className="error-text">Issue not found.</p>;

  return (
    <div className="issue-details-page">
      <Link to={backPath} className="back-link">
        Back to {backLabel}
      </Link>

      <div className="issue-details-grid">
        <div className="issue-cards-container">
          {/* Issue Details Card */}
          <div className="issue-details-card">
            <div className="issue-details-image">
              <SafeImage
                src={coverImage}
                alt={issue.title}
                showSkeleton
                style={{ width: '100%', height: '400px', objectFit: 'cover' }}
              />
              <StatusBadge status={issue.status} className="status-badge" />
            </div>
            
            <div className="issue-details-body">
              <div className="issue-tags">
                <span className="tag">{issue.category}</span>
                <span className="tag secondary">
                  Priority:{' '}
                  {typeof issue.severity === 'number'
                    ? ['Low', 'Medium', 'High', 'Critical', 'Urgent'][issue.severity - 1] || issue.severity
                    : issue.severity}
                </span>
                {isVerified ? (
                  <span className="tag verified" aria-label="Verified by citizen">
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
              </div>

              <div className="issue-header">
                <h1>{issue.title}</h1>
                {/* ✅ Show vote button only if user doesn't have admin permissions */}
                {!can('admin:view_analytics') && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <VoteButton
                      issueId={issue._id}
                      voteCount={issue.voteCount ?? issue.votes ?? 0}
                      userVoted={issue.userVoted}
                      onVote={(result) => setIssue((prev) => ({ ...prev, voteCount: result.voteCount, userVoted: result.voted }))}
                    />
                  </div>
                )}
              </div>

              <div className="issue-meta">
                <span>
                  Location:{' '}
                  {issue.locationText && String(issue.locationText).trim()
                    ? `${String(issue.locationText).trim()}${issue.location?.coordinates ? ` (${issue.location.coordinates[1]}, ${issue.location.coordinates[0]})` : ''}`
                    : issue.location?.coordinates
                      ? `${issue.location.coordinates[1]}, ${issue.location.coordinates[0]}`
                      : issue.location || '-'}
                </span>
                <span>Reported: {new Date(issue.createdAt).toLocaleString()}</span>
                <span>By: {issue.reportedBy?.name ?? 'Unknown'}</span>
                {departmentName ? <span>Department: {departmentName}</span> : null}
              </div>

              <div className="issue-description">
                <h3>Description</h3>
                <p>{issue.description || 'No description provided.'}</p>
              </div>

              {mapPoints.length > 0 && (
                <div className="issue-map-preview">
                  <h3>Location Map</h3>
                  <div className="issue-map-preview__canvas" aria-label="Issue location map">
                    <IssueLeafletMap issues={mapPoints} activeId={issue._id} zoom={14} scrollWheelZoom={false} className="issue-map-preview__leaflet" />
                  </div>
                </div>
              )}

              {(canVerify || canReopen || canClose || canDelete) && (
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
                  {canDelete && (
                    <button type="button" className="issue-delete-btn" onClick={handleDelete} disabled={deleteLoading}>
                      {deleteLoading ? 'Deleting...' : 'Delete'}
                    </button>
                  )}
                </div>
              )}
              {deleteError && <p className="issue-delete-error">{deleteError}</p>}
            </div>
          </div>

          {/* Issue Resolution Card */}
          <div className="issue-resolution-card">
            <div className="resolution-image">
              <SafeImage
                src={afterImages[0] || submittedImages[0]}
                alt="Resolution progress"
                showSkeleton
                style={{ width: '100%', height: '400px', objectFit: 'cover' }}
              />
            </div>
            
            <div className="resolution-body">
              <h2>Issue Resolution</h2>
              
              <div className="resolution-status">
                <h3>Current Status</h3>
                <StatusBadge status={issue.status} />
              </div>

              <div className="assignments-section">
                <h3>Assignments</h3>
                <div className="assignment-item">
                  <span>Department:</span>
                  <strong>{assignedDepartmentName || departmentName || '-'}</strong>
                </div>
                <div className="assignment-item">
                  <span>Worker:</span>
                  <strong>{assignedWorkerName || '-'}</strong>
                </div>
                <div className="assignment-item">
                  <span>Volunteer:</span>
                  <strong>{volunteerName || '-'}</strong>
                </div>
              </div>

              {issue?.communityResolutionReport?.text && (
                <div className="resolution-report">
                  <h3>Resolution Report</h3>
                  <p>{issue.communityResolutionReport.text}</p>
                </div>
              )}

              <div className="resolution-comments">
                <h3>Comments ({comments.length})</h3>
                
                {isAuthenticated && (
                  <form onSubmit={handleCreateComment} className="issue-comment-form">
                    {replyTo && (
                      <div className="issue-replying">
                        Replying to <strong>{replyTo.name}</strong>
                        <button type="button" onClick={() => setReplyTo(null)}>Cancel</button>
                      </div>
                    )}
                    <textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Write a comment"
                      maxLength={1000}
                    />
                    <div className="issue-comment-footer">
                      <small>{commentText.length}/1000</small>
                      <button type="submit" disabled={commentLoading || commentText.trim().length === 0}>
                        {commentLoading ? 'Posting...' : 'Post'}
                      </button>
                    </div>
                  </form>
                )}

                {comments.length === 0 ? (
                  <p className="text-muted">No comments yet.</p>
                ) : (
                  <ul className="issue-comment-list">
                    {comments.slice(0, 3).map((comment) => {
                      const commentUserId = comment?.user?._id ?? comment?.user;
                      // ✅ Use comment:delete permission (admin or comment author)
                      const canModifyComment = can('comment:delete') && (user?.role === 'admin' || (user?.id && String(commentUserId) === String(user.id)));
                      const name = comment?.user?.name || 'User';
                      const avatar = String(name).charAt(0).toUpperCase();
                      const isLiked = liked.has(comment._id);

                      return (
                        <li key={comment._id} className="issue-comment-item">
                          <div className="issue-comment-avatar" aria-hidden="true">{avatar}</div>
                          <div className="issue-comment-main">
                            <div className="issue-comment-head">
                              <strong>{name}</strong>
                              <small>{new Date(comment.createdAt).toLocaleString()}</small>
                            </div>
                            <p className="issue-comment-text">{comment.message}</p>
                            <div className="issue-comment-actions">
                              <button
                                type="button"
                                className={isLiked ? 'is-liked' : ''}
                                onClick={() =>
                                  setLiked((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(comment._id)) next.delete(comment._id);
                                    else next.add(comment._id);
                                    return next;
                                  })
                                }
                              >
                                {isLiked ? 'Liked' : 'Like'}
                              </button>
                              {isAuthenticated && (
                                <button
                                  type="button"
                                  onClick={() => setReplyTo({ id: comment._id, name })}
                                >
                                  Reply
                                </button>
                              )}
                              {canModifyComment && (
                                <>
                                  <button type="button" onClick={() => handleEditComment(comment._id, comment.message)}>
                                    Edit
                                  </button>
                                  <button type="button" onClick={() => handleDeleteComment(comment._id)}>
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                
                {comments.length > 3 && (
                  <p className="text-muted">+ {comments.length - 3} more comments</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="issue-details-right">
          <div className="workflow-timeline-container">
            <WorkflowTimeline status={issue.status} isCommunityFlow={isCommunityFlow} />
          </div>

          {submittedImages.length > 1 && (
            <div className="issue-side-card card">
              <h3>All Photos</h3>
              <div className="issue-image-grid">
                {submittedImages.map((img, idx) => (
                  <a key={`before-${img}-${idx}`} href={resolveMediaUrl(img)} target="_blank" rel="noreferrer">
                    <SafeImage src={img} alt={`Issue photo ${idx + 1}`} showSkeleton style={{ width: '100%', height: 80 }} />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ✅ Show volunteer panel to volunteers */}
          {can('volunteer:claim_issue') && (
            <div className="issue-side-card card">
              <VolunteerPanel issue={issue} onIssueUpdate={setIssue} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default IssueDetails;
