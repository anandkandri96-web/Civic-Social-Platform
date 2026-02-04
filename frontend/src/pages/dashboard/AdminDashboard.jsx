import { useEffect, useState } from "react";
import { getIssues, updateIssueStatus } from "../../api/issues.api";
import IssueCard from "../../components/issues/IssueCard";
import Loader from "../../components/common/Loader";
import "./AdminDashBoard.css";

const AdminDashboard = () => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getIssues();
        if (mounted) setIssues(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || err?.message || "Failed to load issues");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, []);

  const handleStatusChange = async (issueId, status) => {
    setUpdatingId(issueId);
    try {
      const updated = await updateIssueStatus(issueId, status);
      setIssues((prev) => prev.map((i) => (i._id === issueId ? { ...i, status: updated.status } : i)));
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Review and manage community-reported issues.</p>
        </div>

        {/* Admins manage only; no report creation */}
      </div>

      {error && <div className="issues-error">{error}</div>}

      {loading ? (
        <Loader fullScreen />
      ) : issues.length === 0 ? (
        <div className="admin-empty">
          <div className="empty-card">
            <h3>No issues yet</h3>
            <p>Once citizens report issues, they’ll appear here for review.</p>
            <p className="admin-note">Admins can manage issues only.</p>
          </div>
        </div>
      ) : (
        <div className="admin-issues-list">
          {issues.map((issue) => (
            <div key={issue._id} className="admin-issue-row">
              <div className="admin-issue-controls">
                <label>
                  Status{" "}
                  <select
                    value={issue.status || "pending"}
                    onChange={(e) => handleStatusChange(issue._id, e.target.value)}
                    disabled={updatingId === issue._id}
                  >
                    <option value="pending">pending</option>
                    <option value="assigned">assigned</option>
                    <option value="resolved">resolved</option>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
