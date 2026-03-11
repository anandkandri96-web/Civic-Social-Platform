import api from './axios';
import { getResponseData } from './utils';

export const getAvailableVolunteerIssues = async () => {
  const res = await api.get('/volunteer/issues/available');
  return getResponseData(res) || [];
};

export const claimVolunteerIssue = async (issueId) => {
  const res = await api.post(`/volunteer/issues/${issueId}/claim`);
  return getResponseData(res);
};

export const updateVolunteerProgress = async (issueId) => {
  const res = await api.patch(`/volunteer/issues/${issueId}/progress`);
  return getResponseData(res);
};

export const resolveVolunteerIssue = async (issueId, payload = []) => {
  if (Array.isArray(payload)) {
    const res = await api.patch(`/volunteer/issues/${issueId}/resolve`, { proof: payload });
    return getResponseData(res);
  }

  const proof = Array.isArray(payload?.proof) ? payload.proof : [];
  const proofFiles = Array.isArray(payload?.proofFiles) ? payload.proofFiles : [];
  const reportText = typeof payload?.reportText === 'string' ? payload.reportText : '';

  if (proofFiles.length > 0) {
    const formData = new FormData();
    proofFiles.forEach((file) => formData.append("proofImages", file));
    if (reportText.trim()) {
      formData.append("reportText", reportText.trim());
    }
    if (proof.length > 0) {
      formData.append("proof", JSON.stringify(proof));
    }
    const res = await api.patch(`/volunteer/issues/${issueId}/resolve`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return getResponseData(res);
  }

  const res = await api.patch(`/volunteer/issues/${issueId}/resolve`, { proof, reportText: reportText.trim() });
  return getResponseData(res);
};
