import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { upvote as upvoteApi, removeVote as removeVoteApi } from '@api/votes.api.js';
import './VoteButton.css';

const VoteButton = ({
  issueId,
  voteCount: initialCount = 0,
  userVoted: initialVoted = false,
  onVote,
}) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [voteCount, setVoteCount] = useState(initialCount);
  const [userVoted, setUserVoted] = useState(initialVoted);
  const [loading, setLoading] = useState(false);
  const [bump, setBump] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setVoteCount(initialCount);
    setUserVoted(initialVoted);
  }, [initialCount, initialVoted]);

  useEffect(() => {
    if (voteCount == null) return undefined;
    setBump(true);
    const t = setTimeout(() => setBump(false), 180);
    return () => clearTimeout(t);
  }, [voteCount]);

  const handleVote = async () => {
    if (!isAuthenticated || loading) return;

    setLoading(true);
    try {
      if (userVoted) {
        const result = await removeVoteApi(issueId);
        setVoteCount(result.voteCount);
        setUserVoted(false);
        onVote?.(result);
      } else {
        const result = await upvoteApi(issueId);
        setVoteCount(result.voteCount);
        setUserVoted(true);
        onVote?.(result);
        // Show success animation for new votes
        setSuccess(true);
        setTimeout(() => setSuccess(false), 800);
      }
    } catch (err) {
      console.error('Vote error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="vote-button-wrapper">
        <span className="vote-count">Votes: {voteCount}</span>
        <button
          type="button"
          className="vote-sign-in"
          onClick={() => navigate('/login')}
        >
          Sign in to vote
        </button>
      </div>
    );
  }

  const isStaff = ['admin', 'officer'].includes(String(user?.role || '').toLowerCase());
  if (isStaff) {
    return (
      <div className="vote-button-wrapper">
        <span className="vote-count">Votes: {voteCount}</span>
        <span className="vote-disabled">Voting disabled for staff</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`vote-button ${userVoted ? 'voted' : ''} ${loading ? 'loading' : ''} ${success ? 'vote-success' : ''}`}
      onClick={handleVote}
      disabled={loading}
      aria-pressed={userVoted}
      aria-label={userVoted ? `Remove vote (${voteCount} votes)` : `Vote for this issue (${voteCount} votes)`}
    >
      <span className="vote-icon">
        {userVoted ? 'Voted' : 'Vote'}
      </span>
      <span className={`vote-count-num${bump ? ' is-bump' : ''}`}>
        {voteCount}
      </span>
    </button>
  );
};

export default VoteButton;
