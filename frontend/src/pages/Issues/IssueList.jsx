import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { getIssues } from '@api/issues.api';
import { getErrorMessage } from '@api/utils';
import { usePermission } from '../../hooks/usePermission';
import { ISSUE_STATUS_FILTER_OPTIONS, ISSUE_CATEGORY_FILTER_OPTIONS } from '../../constants/issueOptions';
import IssueCard from '../../components/issues/IssueCard/IssueCard';
import Skeleton from '../../components/common/Skeleton/Skeleton';
import IssueCardSkeleton from '../../components/common/Skeleton/IssueCardSkeleton';
import './IssueList.css';

const CATEGORIES = ISSUE_CATEGORY_FILTER_OPTIONS;
const STATUSES = ISSUE_STATUS_FILTER_OPTIONS;

const SORT_OPTIONS = [
  { value: 'priority', label: 'Sort by Priority' },
  { value: 'newest', label: 'Sort by Newest' },
  { value: 'most_supported', label: 'Sort by Most Supported' },
];

const SORT_MAP = {
  priority: 'priority',
  newest: 'newest',
  most_supported: '-voteCount',
};

const IssueList = () => {
  // ✅ Use permissions instead of role checks
  const { can, loading: roleLoading } = usePermission();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = useMemo(() => String(searchParams.get('search') || '').trim(), [searchParams]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('priority');

  useEffect(() => {
    let mounted = true;
    const params = {};
    if (category) params.category = category;
    if (status) params.status = status;
    if (sort) params.sort = SORT_MAP[sort] || sort;
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
  }, [category, status, sort, searchQuery]);

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
              <IssueCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }
  // ✅ Redirect admins to admin dashboard (they have admin:view_all_issues permission, not issue:read)
  if (can('admin:view_all_issues')) return <Navigate to="/admin/manage-issues" replace />;

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
          {/* ✅ Show report button only if user can create issues */}
          {can('issue:create') && (
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
              <IssueCardSkeleton key={i} />
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
                {can('issue:create') && (
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
