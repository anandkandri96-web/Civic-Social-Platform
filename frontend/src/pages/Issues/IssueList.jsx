import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getIssues } from '@api/issues.api';
import { getErrorMessage } from '@api/utils';
import { useRole } from '../../hooks/useRole';
import { ISSUE_STATUSES, ISSUE_STATUS_LABELS } from '../../constants/issueStatus';
import IssueCard from '../../components/issues/IssueCard/IssueCard';
import Skeleton from '../../components/common/Skeleton/Skeleton';
import './IssueList.css';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'roads', label: 'Roads' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'garbage', label: 'Garbage' },
  { value: 'drainage', label: 'Drainage' },
  { value: 'water', label: 'Water' },
  { value: 'other', label: 'Other' },
];

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: ISSUE_STATUSES.REPORTED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.REPORTED] },
  { value: ISSUE_STATUSES.UNDER_REVIEW, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.UNDER_REVIEW] },
  { value: ISSUE_STATUSES.ASSIGNED_TO_DEPARTMENT, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.ASSIGNED_TO_DEPARTMENT] },
  { value: ISSUE_STATUSES.WORK_IN_PROGRESS, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.WORK_IN_PROGRESS] },
  { value: ISSUE_STATUSES.RESOLVED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.RESOLVED] },
  { value: ISSUE_STATUSES.CITIZEN_VERIFIED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.CITIZEN_VERIFIED] },
  { value: ISSUE_STATUSES.CLOSED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.CLOSED] },
  { value: ISSUE_STATUSES.VOLUNTEER_CLAIMED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.VOLUNTEER_CLAIMED] },
  { value: ISSUE_STATUSES.COMMUNITY_FIX_IN_PROGRESS, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.COMMUNITY_FIX_IN_PROGRESS] },
  { value: ISSUE_STATUSES.RESOLVED_BY_COMMUNITY, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.RESOLVED_BY_COMMUNITY] },
  { value: ISSUE_STATUSES.REJECTED, label: ISSUE_STATUS_LABELS[ISSUE_STATUSES.REJECTED] },
];

const SORT_OPTIONS = [
  { value: 'priority', label: 'Sort by Priority' },
  { value: 'newest', label: 'Sort by Newest' },
  { value: 'most_supported', label: 'Sort by Most Supported' },
];

const IssueList = () => {
  const { isAdmin, loading: roleLoading } = useRole();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = useMemo(() => String(searchParams.get('search') || '').trim(), [searchParams]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('priority');

  useEffect(() => {
    if (isAdmin) return () => {};
    let mounted = true;
    const params = {};
    if (category) params.category = category;
    if (status) params.status = status;
    if (sort) params.sort = sort;
    if (searchQuery) params.search = searchQuery;

    const fetchIssues = async () => {
      try {
        const data = await getIssues(params);
        if (mounted) setIssues(Array.isArray(data) ? data : []);
        if (mounted) setError('');
      } catch (err) {
        if (mounted) {
          setError(getErrorMessage(err));
          setIssues([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    setLoading(true);
    fetchIssues();
    return () => { mounted = false; };
  }, [category, status, sort, isAdmin, searchQuery]);

  if (roleLoading) {
    return (
      <section className="issues-page page">
        <div className="container">
          <div className="issues-header">
            <Skeleton height={34} width="40%" />
            <Skeleton height={16} width="60%" style={{ marginTop: 10 }} />
          </div>
          <div className="issues-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} height={220} />
            ))}
          </div>
        </div>
      </section>
    );
  }
  if (isAdmin) return <Navigate to="/admin" replace />;

  return (
    <section className="issues-page page">
      <div className="container">
        <div className="issues-header">
          <h1>Community Issues</h1>
          <p>
            Browse, track, and support civic issues reported by your neighbors.
          </p>
        </div>

        <div className="issues-toolbar">
          <div className="issues-filters">
            <select
              className="issues-filter-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="issues-filter-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="issues-filter-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {!isAdmin && (
            <Link to="/issues/create" className="issues-create-link">
              + Report an Issue
            </Link>
          )}
        </div>

        {searchQuery ? (
          <div className="issues-search-pill">
            <span>Search: {searchQuery}</span>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('search');
                setSearchParams(next);
              }}
            >
              Clear
            </button>
          </div>
        ) : null}

        {error && (
          <div className="issues-error">
            <span className="issues-error-icon">!</span>
            {error}
          </div>
        )}

        {loading ? (
          <div className="issues-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} height={220} />
            ))}
          </div>
        ) : (
          <div className="issues-grid">
            {issues.length === 0 && !error ? (
              <div className="issues-empty card">
                <div className="issues-empty-icon">!</div>
                <h3>No issues found</h3>
                <p>
                  {category || status
                    ? 'Try changing filters or report a new issue.'
                    : 'No issues reported yet. Be the first to report one.'}
                </p>
                {!isAdmin && (
                  <Link to="/issues/create" className="issues-empty-cta">
                    Report an Issue
                  </Link>
                )}
              </div>
            ) : (
              issues.map((issue) => (
                <IssueCard
                  key={issue._id}
                  issue={issue}
                  onVote={(result) => {
                    setIssues((prev) =>
                      prev.map((i) =>
                        i._id === issue._id
                          ? { ...i, voteCount: result.voteCount, userVoted: result.voted }
                          : i
                      )
                    );
                  }}
                  onDeleted={(deletedId) => {
                    setIssues((prev) => prev.filter((i) => i._id !== deletedId));
                  }}
                />
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default IssueList;
