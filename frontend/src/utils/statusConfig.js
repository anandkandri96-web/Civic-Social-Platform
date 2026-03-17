export const STATUS = {
  REPORTED: "reported",
  UNDER_REVIEW: "under_review",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  RESOLVED: "resolved",
  REJECTED: "rejected"
};

export const statusConfig = {
  reported: {
    label: "Reported",
    color: "warning",
  },
  under_review: {
    label: "Under Review",
    color: "info",
  },
  assigned: {
    label: "Assigned",
    color: "info",
  },
  in_progress: {
    label: "In Progress",
    color: "info",
  },
  resolved: {
    label: "Resolved",
    color: "success",
  },
  rejected: {
    label: "Rejected",
    color: "danger",
  }
};

const BACKEND_STATUS_MAP = {
  assigned_to_department: STATUS.ASSIGNED,
  volunteer_claimed: STATUS.ASSIGNED,
  work_in_progress: STATUS.IN_PROGRESS,
  community_fix_in_progress: STATUS.IN_PROGRESS,
  resolved_by_community: STATUS.RESOLVED,
  citizen_verified: STATUS.RESOLVED,
  closed: STATUS.RESOLVED,
  inprogress: STATUS.IN_PROGRESS,
  "in-progress": STATUS.IN_PROGRESS,
  open: STATUS.REPORTED,
  pending: STATUS.REPORTED,
  critical: STATUS.REPORTED,
};

export const mapBackendStatus = (status) => {
  const key = String(status || STATUS.REPORTED).trim().toLowerCase();
  const mapped = BACKEND_STATUS_MAP[key] || key;
  return statusConfig[mapped] ? mapped : STATUS.REPORTED;
};
