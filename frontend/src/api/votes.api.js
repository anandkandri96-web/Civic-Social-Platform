import api from "./axios.js";
import { getResponseData } from './utils';

/**
 * Add vote for an issue (requires auth)
 * @returns {{ voteCount: number, voted: boolean }}
 */
export const upvote = async (issueId) => {
  const res = await api.post(`/votes/${issueId}`);
  const body = getResponseData(res) ?? {};
  return { voteCount: body.voteCount ?? 0, voted: true };
};

/**
 * Remove vote (requires auth)
 */
export const removeVote = async (issueId) => {
  const res = await api.delete(`/votes/${issueId}`);
  const body = getResponseData(res) ?? {};
  return { voteCount: body.voteCount ?? 0, voted: false };
};

/**
 * Get current user's vote status for an issue
 */
export const getVoteStatus = async (issueId) => {
  const res = await api.get(`/votes/${issueId}`);
  const body = getResponseData(res) ?? {};
  return { voted: !!body.voted };
};
