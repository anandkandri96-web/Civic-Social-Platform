import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import VoteButton from '../../components/issues/VoteButton/VoteButton';
import StatusBadge from '../../components/issues/StatusBadge/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { usePermission } from '../../hooks/usePermission';
import { createIssueComment, deleteIssueComment, getIssueComments, updateIssueComment } from '@api/comments.api';
import { closeIssue, deleteIssue, getIssueById, reopenIssue, verifyIssue, updateIssue } from '@api/issues.api';
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
import { ISSUE_CATEGORIES, ISSUE_SEVERITY_OPTIONS, ISSUE_SEVERITY_LABELS } from '../../constants/issueOptions';
import './IssueDetails.css';

const normalizeImages = (images) =>
  Array.isArray(images)
    ? images
        .map((img) => String(img || '').trim())
        .filter(Boolean)
    : [];

const TITLE_RE = /[a-zA-Z]/;
const TITLE_NUMERIC_ONLY_RE = /^[0-9\s]+$/;

const IssueDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { can, isVolunteer } = usePermission();
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [liked, setLiked] = useState(() => new Set());
  const [editingComment, setEditingComment] = useState(null); // { id, text }
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'roads',
    severity: 3,
    locationText: '',
  });
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

  useEffect(() => {
    if (!issue) return;
    setEditForm({
      title: issue.title || '',
      description: issue.description || '',
      category: issue.category || 'roads',
      severity: typeof issue.severity === 'number' ? issue.severity : Number(issue.severity || 3),
      locationText: issue.locationText || '',
    });
  }, [issue]);

  const reporterId = issue?.reportedBy?._id ?? issue?.reportedBy;
  const isReporter = user?.id && String(reporterId) === String(user.id);
  const status = String(issue?.status || '').trim().toLowerCase();
  // ✅ Use permissions instead of role checks
  // issue:delete allows: admins (always), citizens (if reporter + deletable status)
  const canDelete = can('issue:delete') && (user?.role === 'admin' || (isReporter && ['reported', 'under_review', 'closed'].includes(status)));
  const canEdit = can('issue:update') && isReporter && ['reported', 'under_review'].includes(status);
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
  const coverImage = submittedImages[0];
  const resolutionImage = afterImages[0];
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
  const locationText = issue?.locationText ? String(issue.locationText).trim() : '';
  const coordLat = Number(coords?.[1]);
  const coordLng = Number(coords?.[0]);
  const coordLabel = Number.isFinite(coordLat) && Number.isFinite(coordLng)
    ? `${coordLat.toFixed(5)}, ${coordLng.toFixed(5)}`
    : '';
  const locationLabel = locationText
    ? `${locationText}${coordLabel ? ` (${coordLabel})` : ''}`
    : coordLabel || '-';
  const metaItems = [
    { label: 'Location', value: locationLabel },
    { label: 'Reported', value: issue?.createdAt ? new Date(issue.createdAt).toLocaleString() : '-' },
    { label: 'Reporter', value: issue?.reportedBy?.name ?? 'Unknown' },
    ...(departmentName ? [{ label: 'Department', value: departmentName }] : []),
  ];
  const showResolutionCard = Boolean(issue) && (isResolvedFlow || resolutionImage || issue?.communityResolutionReport?.text);

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

  const handleEditSave = async () => {
    if (!issue?._id) return;
    const title = editForm.title.trim();
    const description = editForm.description.trim();
    const locationText = editForm.locationText.trim();
    const severityNum = Number(editForm.severity);

    if (title.length < 3) {
      setEditError('Title must be at least 3 characters.');
      return;
    }
    if (TITLE_NUMERIC_ONLY_RE.test(title)) {
      setEditError('Title cannot be only numbers.');
      return;
    }
    if (!TITLE_RE.test(title)) {
      setEditError('Title must include at least one letter.');
      return;
    }
    if (description.length < 10) {
      setEditError('Description must be at least 10 characters.');
      return;
    }
    if (!locationText) {
      setEditError('Location text is required.');
      return;
    }
    if (!Number.isFinite(severityNum) || severityNum < 1 || severityNum > 4) {
      setEditError('Please select a valid severity level.');
      return;
    }

    setEditLoading(true);
    setEditError('');
    try {
      const updated = await updateIssue(issue._id, {
        title,
        description,
        category: editForm.category,
        severity: severityNum,
        locationText,
      });
      setIssue(updated);
      setEditing(false);
      showToast('Issue updated successfully.', { tone: 'success' });
    } catch (err) {
      setEditError(getErrorMessage(err));
    } finally {
      setEditLoading(false);
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

  const handleEditComment = (commentId, currentText) => {
    setEditingComment({ id: commentId, text: currentText });
  };

  const handleCommentEditSave = async (commentId) => {
    const editText = editingComment?.text?.trim();
    if (!editText) return;
    try {
      const updated = await updateIssueComment(commentId, { message: editText });
      setComments((prev) => prev.map((c) => (c._id === commentId ? { ...c, ...updated } : c)));
      setEditingComment(null);
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
                <span className="tag">
                  {ISSUE_CATEGORIES.find((cat) => cat.value === issue.category)?.label || issue.category}
                </span>
                <span className="tag secondary">
                  Priority:{' '}
                  {(() => {
                    const raw = typeof issue.severity === 'number'
                      ? issue.severity
                      : Number(issue.severity || 0);
                    const normalized = Math.min(4, Math.max(1, Number.isFinite(raw) ? raw : 1));
                    return ISSUE_SEVERITY_LABELS[normalized] || normalized;
                  })()}
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
                {metaItems.map((item) => (
                  <div key={item.label} className="issue-meta-item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              {canEdit && (
                <div className="issue-edit">
                  <div className="issue-edit__head">
                    <h3>Edit Report</h3>
                    <button
                      type="button"
                      className="issue-edit__toggle"
                      onClick={() => {
                        setEditError('');
                        setEditing((prev) => !prev);
                      }}
                    >
                      {editing ? 'Close' : 'Edit'}
                    </button>
                  </div>

                  {editing && (
                    <div className="issue-edit__form">
                      <label>
                        Title
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                          placeholder="Issue title"
                        />
                      </label>
                      <label>
                        Category
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                        >
                          {ISSUE_CATEGORIES.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Severity
                        <select
                          value={String(editForm.severity)}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, severity: Number(e.target.value) }))}
                        >
                          {ISSUE_SEVERITY_OPTIONS.map((sev) => (
                            <option key={sev.value} value={sev.value}>{sev.label}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Location text
                        <input
                          type="text"
                          value={editForm.locationText}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, locationText: e.target.value }))}
                          placeholder="Area or landmark"
                        />
                      </label>
                      <label>
                        Description
                        <textarea
                          rows={4}
                          value={editForm.description}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="Describe the issue"
                        />
                      </label>
                      {editError && <div className="issue-edit__error">{editError}</div>}
                      <div className="issue-edit__actions">
                        <button type="button" onClick={handleEditSave} disabled={editLoading}>
                          {editLoading ? 'Saving...' : 'Save changes'}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setEditing(false);
                            setEditError('');
                            setEditForm({
                              title: issue.title || '',
                              description: issue.description || '',
                              category: issue.category || 'roads',
                              severity: typeof issue.severity === 'number' ? issue.severity : Number(issue.severity || 3),
                              locationText: issue.locationText || '',
                            });
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="issue-description">
                <h3>Description</h3>
                <p>{issue.description || 'No description provided.'}</p>
              </div>

              {mapPoints.length > 0 && (
                <div className="issue-map-preview">
                  <h3>Location Map</h3>
                  <div className="issue-map-preview__canvas" aria-label="Issue location map">
                    <IssueLeafletMap
                      issues={mapPoints}
                      activeId={issue._id}
                      zoom={16}
                      scrollWheelZoom
                      showZoomControl
                      showAttribution={false}
                      className="issue-map-preview__leaflet"
                      showRecenter
                    />
                  </div>
                </div>
              )}

              {(canVerify || canReopen || canClose || canDelete) && (
                <div className="issue-workflow-actions">
                  {canVerify && (
                    <button
                      type="button"
                      className="issue-action issue-action--verify"
                      disabled={actionLoading}
                      onClick={() => handleIssueAction(verifyIssue)}
                    >
                      Verify Resolution
                    </button>
                  )}
                  {canReopen && (
                    <button
                      type="button"
                      className="issue-action issue-action--reopen"
                      disabled={actionLoading}
                      onClick={() => handleIssueAction(reopenIssue)}
                    >
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
          {showResolutionCard && (
          <div className="issue-resolution-card">
            <div className="resolution-image">
              {resolutionImage ? (
                <SafeImage
                  src={resolutionImage}
                  alt="Resolution progress"
                  showSkeleton
                  style={{ width: '100%', height: '400px', objectFit: 'cover' }}
                />
              ) : (
                <div className="resolution-placeholder">Resolution image will appear after the fix is submitted.</div>
              )}
            </div>
            
            <div className="resolution-body">
              <h2>Issue Resolution</h2>
              
              <div className="resolution-status">
                <h3>Current Status</h3>
                <StatusBadge status={issue.status} />
              </div>

              {afterImages.length > 1 && (
                <div className="issue-images-section">
                  <h3>Resolution Photos</h3>
                  <div className="issue-image-grid">
                    {afterImages.map((img, idx) => (
                      <a key={`after-${img}-${idx}`} href={resolveMediaUrl(img)} target="_blank" rel="noreferrer">
                        <SafeImage src={img} alt={`Resolution photo ${idx + 1}`} showSkeleton style={{ width: '100%', height: 80 }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

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
                            {editingComment?.id === comment._id ? (
                              <div className="comment-edit-field">
                                <textarea
                                  value={editingComment.text}
                                  onChange={(e) => setEditingComment((prev) => ({ ...prev, text: e.target.value }))}
                                  rows={3}
                                  autoFocus
                                />
                                <div className="comment-edit-actions">
                                  <button type="button" className="btn-save" onClick={() => handleCommentEditSave(comment._id)}>Save</button>
                                  <button type="button" className="btn-cancel" onClick={() => setEditingComment(null)}>Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <p className="issue-comment-text">{comment.message}</p>
                            )}
                            {editingComment?.id !== comment._id && (
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
                            )}
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
          )}
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
          {isVolunteer && can('volunteer:claim_issue') && (
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
