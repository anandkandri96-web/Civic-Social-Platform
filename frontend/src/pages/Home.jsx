import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useRole } from "../hooks/useRole";
import { getIssues } from "../api/issues.api";
import VoteButton from "../components/issues/VoteButton";
import "./Home.css";

const CATEGORY_LABELS = {
  ROADS: "Roads",
  ELECTRICITY: "Electricity",
  GARBAGE: "Garbage",
  DRAINAGE: "Drainage",
  OTHER: "Other",
};

const Home = () => {
  const { user } = useAuth();
  const { isAdmin } = useRole();

  const [topIssues, setTopIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchIssues = async () => {
      try {
        const data = await getIssues();
        if (!mounted || !Array.isArray(data)) return;

        const sorted = [...data].sort(
          (a, b) => (b.voteCount ?? 0) - (a.voteCount ?? 0)
        );
        setTopIssues(sorted.slice(0, 3));
      } catch {
        if (mounted) setTopIssues([]);
      } finally {
        if (mounted) setIssuesLoading(false);
      }
    };

    fetchIssues();
    return () => {
      mounted = false;
    };
  }, []);

  const isLoggedIn = !!user;
  const dashboardPath = isAdmin ? "/admin" : "/dashboard";

  return (
    <div className="home-page">
      {/* HEADER */}
      <header className="header">
        <Link to="/" className="header-left">
          Social Civic Platform
        </Link>

        <div className="header-right">
          {!isAdmin && <Link to="/issues">Browse Issues</Link>}

          {isLoggedIn ? (
            <>
              <Link to={dashboardPath}>Dashboard</Link>
              {!isAdmin && (
                <Link to="/issues/create" className="primary-btn">
                  Report Issue
                </Link>
              )}
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="primary-btn">
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* HERO */}
      <section className="hero-section">
        <div className="hero-text">
          <h1>
            Better Cities,
            <br />
            <span>Together.</span>
          </h1>

          <p>
            Report civic issues, track their resolution, and help prioritize what
            matters most to your community.
          </p>

          <div className="hero-buttons">
            {!isAdmin && (
              <>
                <Link to="/issues/create" className="primary-btn">
                  Report an Issue →
                </Link>
                <Link to="/issues" className="secondary-btn">
                  Browse Issues
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* INFO */}
      <section className="info-section">
        <div className="info-card">
          <h3>Report</h3>
          <p>Easily report local problems with location and photos.</p>
        </div>
        <div className="info-card">
          <h3>Vote</h3>
          <p>Community support helps prioritize urgent issues.</p>
        </div>
        <div className="info-card">
          <h3>Resolve</h3>
          <p>Authorities track and resolve verified complaints.</p>
        </div>
      </section>

      {/* PRIORITY ISSUES */}
      <section className="priority-section">
        <div className="priority-header">
          <div>
            <h2>Top Priority Issues</h2>
            <p>Issues with the most community support right now.</p>
          </div>

          {!isAdmin && (
            <Link to="/issues" className="view-all">
              View All →
            </Link>
          )}
        </div>

        {issuesLoading ? (
          <div className="priority-cards priority-loading">
            <div className="priority-skeleton" />
            <div className="priority-skeleton" />
            <div className="priority-skeleton" />
          </div>
        ) : topIssues.length === 0 ? (
          <div className="priority-empty">
            <p>No issues yet. Be the first to report one.</p>
            {!isAdmin && (
              <Link to="/issues/create" className="primary-btn">
                Report an Issue
              </Link>
            )}
          </div>
        ) : (
          <div className="priority-cards">
            {topIssues.map((issue) => (
              <div key={issue._id} className="home-issue-card">
                <span
                  className={`badge ${(issue.status || "pending").toLowerCase()}`}
                >
                  {(issue.status || "PENDING").toUpperCase()}
                </span>

                {/* ✅ ONLY TITLE IS A LINK */}
                <Link
                  to={`/issues/${issue._id}`}
                  className="home-issue-title"
                >
                  <h4>{issue.title}</h4>
                </Link>

                {/* ✅ DIV instead of P */}
                <div className="home-issue-meta">
                  <span>
                    {CATEGORY_LABELS[issue.category] || issue.category}
                  </span>

                  <VoteButton
                    issueId={issue._id}
                    voteCount={issue.voteCount ?? issue.votes ?? 0}
                    userVoted={issue.userVoted}
                    onVote={(result) => {
                      setTopIssues((prev) =>
                        prev.map((i) =>
                          i._id === issue._id
                            ? {
                                ...i,
                                voteCount: result.voteCount,
                                userVoted: result.voted,
                              }
                            : i
                        )
                      );
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
