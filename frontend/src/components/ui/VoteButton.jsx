import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { upvote as upvoteApi, removeVote as removeVoteApi } from '@api/votes.api.js';
import './VoteButton.css';

const VoteButton = ({
  issueId,
  voteCount: initialCount = 0,
  userVoted: initialVoted = false,
  onVote,
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [voteCount, setVoteCount] = useState(initialCount);
  const [userVoted, setUserVoted] = useState(initialVoted);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setVoteCount(initialCount);
    setUserVoted(initialVoted);
  }, [initialCount, initialVoted]);

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
        <span className="vote-count">+ {voteCount}</span>
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

  return (
    <button
      type="button"
      className={`vote-button ${userVoted ? 'voted' : ''} ${loading ? 'loading' : ''}`}
      onClick={handleVote}
      disabled={loading}
      aria-pressed={userVoted}
    >
      <span className="vote-icon">+</span>
      <span className="vote-count-num">{voteCount}</span>
    </button>
  );
};

export default VoteButton;
