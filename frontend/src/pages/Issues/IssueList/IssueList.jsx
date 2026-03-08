import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getIssues } from '../../../api/issues.api';
import { useRole } from '../../../hooks/useRole';
import IssueCard from '../../../components/ui/IssueCard';
import Loader from '../../../components/common/Loader/Loader';
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
  { value: 'reported', label: 'Reported' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'assigned_to_department', label: 'Assigned to Department' },
  { value: 'work_in_progress', label: 'Work In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'resolved_by_community', label: 'Resolved by Community' },
  { value: 'closed', label: 'Closed' },
];

const IssueList = () => {
  const { isAdmin, loading: roleLoading } = useRole();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isAdmin) return () => {};
    let mounted = true;
    const params = {};
    if (category) params.category = category;
    if (status) params.status = status;

    const fetchIssues = async () => {
      try {
        const data = await getIssues(params);
        if (mounted) setIssues(Array.isArray(data) ? data : []);
        if (mounted) setError('');
      } catch (err) {
        if (mounted) {
          setError(err?.response?.data?.message || err?.message || 'Failed to load issues');
          setIssues([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    setLoading(true);
    fetchIssues();
    return () => { mounted = false; };
  }, [category, status, isAdmin]);

  if (roleLoading) return <Loader fullScreen />;
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
          </div>
          {!isAdmin && (
            <Link to="/issues/create" className="issues-create-link">
              + Report an Issue
            </Link>
          )}
        </div>

        {error && (
          <div className="issues-error">
            <span className="issues-error-icon">!</span>
            {error}
          </div>
        )}

        {loading ? (
          <Loader fullScreen />
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
