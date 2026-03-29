import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAllIssuesAdmin, updateIssueStatusAdmin } from '@api/admin.api';
import { getErrorMessage } from '@api/utils';
import IssueCard from '../../components/issues/IssueCard/IssueCard';
import Loader from '../../components/common/Loader/Loader';
import PageHeader from '../../components/common/PageHeader/PageHeader';
import { ISSUE_STATUS_OPTIONS } from '../../constants/issueOptions';
import { canTransition } from '../../utils/statusFlow';
import { useToast } from '../../contexts/ToastContext';
import './ManageIssues.css';

const ManageIssues = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = useMemo(() => String(searchParams.get('search') || '').trim(), [searchParams]);

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    let mounted = true;

    const fetchIssues = async () => {
      setLoading(true);
      setError('');
      try {
        const payload = await getAllIssuesAdmin({
          limit: 100,
          search: searchQuery || undefined,
        });
        if (mounted) setIssues(Array.isArray(payload?.data) ? payload.data : []);
      } catch (err) {
        if (mounted) setError(getErrorMessage(err));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchIssues();
    return () => {
      mounted = false;
    };
  }, [searchQuery]);

  const handleStatusChange = async (issueId, status) => {
    setUpdatingId(issueId);
    try {
      const updated = await updateIssueStatusAdmin(issueId, status);
      setIssues((prev) => prev.map((i) => (i._id === issueId ? { ...i, status: updated.status } : i)));
    } catch (err) {
      showToast(getErrorMessage(err), { tone: 'error' });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section className="manage-issues page">
      <div className="container">
        <PageHeader
          title="Admin Panel"
          subtitle="Take actions on issues: update status, review reports, and moderate records."
        />

        {error && <div className="issues-error">{error}</div>}

        <form
          className="manage-issues-search"
          onSubmit={(e) => {
            e.preventDefault();
            const next = new URLSearchParams(searchParams);
            const val = inputValue.trim();
            if (val) next.set('search', val);
            else next.delete('search');
            setSearchParams(next);
          }}
        >
          <input
            type="search"
            placeholder="Search by title, category, status..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit">Search</button>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                const next = new URLSearchParams(searchParams);
                next.delete('search');
                setSearchParams(next);
              }}
            >
              Clear
            </button>
          )}
        </form>

        {loading ? (
          <Loader fullScreen />
        ) : issues.length === 0 ? (
          <div className="manage-empty card">
            <div className="empty-card">
              <h3>No issues to manage</h3>
              <p>New citizen reports will appear here for triage and status updates.</p>
            </div>
          </div>
        ) : (
          <div className="manage-issues-list">
            {issues.map((issue) => (
              <article key={issue._id} className="manage-issue-row card">
                <div className="manage-issue-controls">
                  <label>
                    Status
                    <select
                      value={issue.status || 'reported'}
                      onChange={(e) => handleStatusChange(issue._id, e.target.value)}
                      disabled={updatingId === issue._id}
                    >
                      {ISSUE_STATUS_OPTIONS.filter((opt) => opt.value === issue.status || canTransition(issue.status, opt.value)).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <IssueCard
                  issue={issue}
                  onVote={(result) => {
                    setIssues((prev) =>
                      prev.map((i) =>
                        i._id === issue._id ? { ...i, voteCount: result.voteCount, userVoted: result.voted } : i
                      )
                    );
                  }}
                  onDeleted={(deletedId) => {
                    setIssues((prev) => prev.filter((i) => i._id !== deletedId));
                  }}
                />
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ManageIssues;
