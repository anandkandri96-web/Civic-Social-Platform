import api from './axios';

export const getAvailableVolunteerIssues = async () => {
  const res = await api.get('/volunteer/issues/available');
  return res.data?.data ?? [];
};

export const claimVolunteerIssue = async (issueId) => {
  const res = await api.post(`/volunteer/issues/${issueId}/claim`);
  return res.data?.data ?? res.data;
};

export const updateVolunteerProgress = async (issueId) => {
  const res = await api.patch(`/volunteer/issues/${issueId}/progress`);
  return res.data?.data ?? res.data;
};

export const resolveVolunteerIssue = async (issueId, payload = []) => {
  if (Array.isArray(payload)) {
    const res = await api.patch(`/volunteer/issues/${issueId}/resolve`, { proof: payload });
    return res.data?.data ?? res.data;
  }

  const proof = Array.isArray(payload?.proof) ? payload.proof : [];
  const proofFiles = Array.isArray(payload?.proofFiles) ? payload.proofFiles : [];

  if (proofFiles.length > 0) {
    const formData = new FormData();
    proofFiles.forEach((file) => formData.append("proofImages", file));
    if (proof.length > 0) {
      formData.append("proof", JSON.stringify(proof));
    }
    const res = await api.patch(`/volunteer/issues/${issueId}/resolve`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data ?? res.data;
  }

  const res = await api.patch(`/volunteer/issues/${issueId}/resolve`, { proof });
  return res.data?.data ?? res.data;
};
