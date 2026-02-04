// src/pages/dashboard/UserDashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getIssues } from "../../api/issues.api";
import IssueCard from "../../components/issues/IssueCard";
import Loader from "../../components/common/Loader";
import "./UserDashboard.css";

const UserDashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getIssues();
        const list = Array.isArray(data) ? data : [];
        const mine = list.filter((i) => {
          const rep = i?.reportedBy;
          const repId = rep && typeof rep === "object" ? rep._id : rep;
          return user?.id && String(repId) === String(user.id);
        });
        if (mounted) setIssues(mine);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || err?.message || "Failed to load your issues");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetch();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  return (
    <div className="dashboard-page">

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>My Dashboard</h1>
          <p>Track the status of issues you've reported.</p>
        </div>

        <Link to="/issues/create" className="new-report-btn">
          + New Report
        </Link>
      </div>

      {error && <div className="issues-error">{error}</div>}

      {loading ? (
        <Loader fullScreen />
      ) : issues.length === 0 ? (
        <div className="issues-empty">
          <p>You haven’t reported any issues yet.</p>
          <Link to="/issues/create" className="issues-empty-cta">
            Report your first issue
          </Link>
        </div>
      ) : null}

      {/* Issue list */}
      <div className="issues-wrapper">
        {issues.map((issue) => (
          <IssueCard
            key={issue._id}
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
        ))}
      </div>

    </div>
  );
};

export default UserDashboard;
