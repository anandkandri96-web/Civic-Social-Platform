export const applyVoteResult = (issues, issueId, result) => {
  return issues.map((issue) =>
    issue._id === issueId
      ? {
          ...issue,
          voteCount: result.voteCount,
          userVoted: result.voted,
        }
      : issue
  );
};

export const removeIssueById = (issues, issueId) => {
  return issues.filter((issue) => issue._id !== issueId);
};
