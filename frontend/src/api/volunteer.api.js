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

export const updateVolunteerProgress = async (issueId, payload = {}) => {
  const body = {};
  if (typeof payload?.notes === 'string') {
    body.notes = payload.notes;
  }
  if (Array.isArray(payload?.progressImages) && payload.progressImages.length > 0) {
    body.progressImages = payload.progressImages;
  }
  if (!body.notes && !body.progressImages) {
    body.notes = 'Started community fix';
  }
  const res = await api.patch(`/volunteer/issues/${issueId}/progress`, body);
  return getResponseData(res);
};

export const resolveVolunteerIssue = async (issueId, payload = []) => {
  if (Array.isArray(payload)) {
    const fallbackReport = 'Resolution completed by volunteer team.';
    const res = await api.patch(`/volunteer/issues/${issueId}/resolve`, {
      proof: payload,
      report: fallbackReport,
      reportText: fallbackReport,
    });
    return getResponseData(res);
  }

  const proof = Array.isArray(payload?.proof) ? payload.proof : [];
  const proofFiles = Array.isArray(payload?.proofFiles) ? payload.proofFiles : [];
  const reportText = typeof payload?.reportText === 'string' ? payload.reportText : '';

  if (proofFiles.length > 0) {
    const formData = new FormData();
    proofFiles.forEach((file) => formData.append("proofImages", file));
    if (reportText.trim()) {
      formData.append("report", reportText.trim());
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

  const report = reportText.trim();
  const res = await api.patch(`/volunteer/issues/${issueId}/resolve`, { proof, report, reportText: report });
  return getResponseData(res);
};
