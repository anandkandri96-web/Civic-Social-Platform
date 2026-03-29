/**
 * CENTRALIZED PERMISSION CONFIGURATION (Frontend)
 * 
 * This is the same configuration used by the backend.
 * Export CommonJS for Node.js compatibility, but can be used in both contexts.
 */

export const ROLES = Object.freeze({
  CITIZEN: 'citizen',
  VOLUNTEER: 'volunteer',
  OFFICER: 'officer',
  WORKER: 'worker',
  ADMIN: 'admin',
});

export const PERMISSIONS = Object.freeze({
  // Issue actions
  ISSUE_CREATE: 'issue:create',
  ISSUE_READ: 'issue:read',
  ISSUE_UPDATE: 'issue:update',
  ISSUE_DELETE: 'issue:delete',
  ISSUE_VERIFY: 'issue:verify',
  ISSUE_CLOSE: 'issue:close',
  ISSUE_REOPEN: 'issue:reopen',
  ISSUE_VIEW_ANALYTICS: 'issue:view_analytics',

  // Backward-compatible issue actions used in routes/components
  ADMIN_CLOSE_ISSUE: 'issue:close',
  OFFICER_CLOSE_ISSUE: 'issue:close',
  ADMIN_UPDATE_ISSUE_STATUS: 'issue:update',
  OFFICER_UPDATE_ISSUE_STATUS: 'officer:update_status',
  ADMIN_VIEW_ISSUES: 'admin:view_all_issues',
  OFFICER_REVIEW_ISSUES: 'officer:review_issues',

  // Access controls
  VOLUNTEER_ACCESS: 'volunteer:access',
  OFFICER_ACCESS: 'officer:access',

  // Comment actions
  COMMENT_CREATE: 'comment:create',
  COMMENT_DELETE: 'comment:delete',
  COMMENT_EDIT: 'comment:edit',

  // Vote actions
  VOTE_CREATE: 'vote:create',
  VOTE_DELETE: 'vote:delete',

  // Role upgrade requests
  ROLE_UPGRADE_REQUEST: 'role:upgrade_request',

  // Volunteer actions
  VOLUNTEER_CLAIM_ISSUE: 'volunteer:claim_issue',
  VOLUNTEER_SUBMIT_RESOLUTION: 'volunteer:submit_resolution',
  VOLUNTEER_UPDATE_PROGRESS: 'volunteer:update_progress',

  // Officer actions
  OFFICER_REVIEW_ISSUE: 'officer:review_issue',
  OFFICER_ASSIGN_WORKER: 'officer:assign_worker',
  OFFICER_UPDATE_STATUS: 'officer:update_status',
  OFFICER_MANAGE_VOLUNTEERS: 'officer:manage_volunteers',
  OFFICER_VIEW_QUEUE: 'officer:view_queue',
  OFFICER_VIEW_DEPARTMENT: 'officer:view_department',

  // Worker/Task actions
  WORKER_ACCEPT_TASK: 'worker:accept_task',
  WORKER_UPDATE_PROGRESS: 'worker:update_progress',
  WORKER_COMPLETE_TASK: 'worker:complete_task',
  WORKER_VIEW_TASKS: 'worker:view_tasks',
  TASK_VIEW_OWN: 'worker:view_tasks', // Backward compatibility
  TASK_CREATE: 'worker:accept_task', // Backward compatibility
  TASK_UPDATE_STATUS: 'worker:update_progress', // Backward compatibility
  TASK_ADD_PROGRESS: 'worker:update_progress', // Backward compatibility

  // Admin actions
  ADMIN_MANAGE_USERS: 'admin:manage_users',
  ADMIN_VIEW_ALL_ISSUES: 'admin:view_all_issues',
  ADMIN_APPROVE_USER: 'admin:approve_user',
  ADMIN_DISABLE_ACCOUNT: 'admin:disable_account',
  ADMIN_CHANGE_ROLE: 'admin:change_role',
  ADMIN_DELETE_USER: 'admin:delete_user',
  ADMIN_MANAGE_DEPARTMENTS: 'admin:manage_departments',
  ADMIN_VIEW_ANALYTICS: 'admin:view_analytics',
  ADMIN_MANAGE_ROLE_UPGRADES: 'admin:manage_role_upgrades',
});

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.CITIZEN]: new Set([
    PERMISSIONS.ISSUE_CREATE,
    PERMISSIONS.ISSUE_READ,
    PERMISSIONS.ISSUE_UPDATE,
    PERMISSIONS.ISSUE_DELETE,
    PERMISSIONS.ISSUE_VERIFY,
    PERMISSIONS.ISSUE_REOPEN,
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_DELETE,
    PERMISSIONS.VOTE_CREATE,
    PERMISSIONS.VOTE_DELETE,
    PERMISSIONS.ROLE_UPGRADE_REQUEST,
  ]),

  [ROLES.VOLUNTEER]: new Set([
    PERMISSIONS.ISSUE_CREATE,
    PERMISSIONS.ISSUE_READ,
    PERMISSIONS.ISSUE_UPDATE,
    PERMISSIONS.ISSUE_DELETE,
    PERMISSIONS.ISSUE_VERIFY,
    PERMISSIONS.ISSUE_REOPEN,
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_DELETE,
    PERMISSIONS.VOTE_CREATE,
    PERMISSIONS.VOTE_DELETE,
    PERMISSIONS.ROLE_UPGRADE_REQUEST,
    PERMISSIONS.VOLUNTEER_ACCESS,
    PERMISSIONS.VOLUNTEER_CLAIM_ISSUE,
    PERMISSIONS.VOLUNTEER_SUBMIT_RESOLUTION,
    PERMISSIONS.VOLUNTEER_UPDATE_PROGRESS,
  ]),

  [ROLES.OFFICER]: new Set([
    PERMISSIONS.ISSUE_READ,
    PERMISSIONS.OFFICER_ACCESS,
    PERMISSIONS.OFFICER_REVIEW_ISSUES,
    PERMISSIONS.OFFICER_ASSIGN_WORKER,
    PERMISSIONS.OFFICER_UPDATE_STATUS,
    PERMISSIONS.OFFICER_VIEW_QUEUE,
    PERMISSIONS.OFFICER_VIEW_DEPARTMENT,
    PERMISSIONS.COMMENT_CREATE,
  ]),

  [ROLES.WORKER]: new Set([
    PERMISSIONS.ISSUE_CREATE,
    PERMISSIONS.ISSUE_READ,
    PERMISSIONS.ISSUE_UPDATE,
    PERMISSIONS.ISSUE_DELETE,
    PERMISSIONS.ISSUE_VERIFY,
    PERMISSIONS.ISSUE_REOPEN,
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_DELETE,
    PERMISSIONS.VOTE_CREATE,
    PERMISSIONS.VOTE_DELETE,
    PERMISSIONS.ROLE_UPGRADE_REQUEST,
    PERMISSIONS.WORKER_ACCEPT_TASK,
    PERMISSIONS.WORKER_UPDATE_PROGRESS,
    PERMISSIONS.WORKER_COMPLETE_TASK,
    PERMISSIONS.WORKER_VIEW_TASKS,
  ]),

  [ROLES.ADMIN]: new Set(
    Object.values(PERMISSIONS).filter(
      (perm) =>
        ![
          PERMISSIONS.ISSUE_CREATE,
          PERMISSIONS.VOTE_CREATE,
          PERMISSIONS.VOTE_DELETE,
          PERMISSIONS.VOLUNTEER_ACCESS,
          PERMISSIONS.VOLUNTEER_CLAIM_ISSUE,
          PERMISSIONS.VOLUNTEER_SUBMIT_RESOLUTION,
          PERMISSIONS.VOLUNTEER_UPDATE_PROGRESS,
        ].includes(perm)
    )
  ),
});

export const RESOURCE_PERMISSIONS = Object.freeze({
  ISSUE: {
    DELETE: (user, issue) => {
      if (!user || !issue) return false;

      if ([ROLES.CITIZEN, ROLES.VOLUNTEER, ROLES.WORKER].includes(user.role)) {
        const isReporter =
          String(user._id) === String(issue.reportedBy) ||
          String(user._id) === String(issue.reportedBy?._id);
        const isDeletableStatus = ['reported', 'under_review', 'closed'].includes(issue.status);
        return isReporter && isDeletableStatus;
      }

      if (user.role === ROLES.ADMIN) return true;
      return false;
    },

    UPDATE_STATUS: (user, issue) => {
      if (!user || !issue) return false;

      if (user.role === ROLES.OFFICER) {
        const userDeptId = String(user.department || '');
        const issueDeptId = String(issue.assignedDepartment || issue.assignedDepartment?._id || '');
        return userDeptId === issueDeptId;
      }

      if (user.role === ROLES.ADMIN) return true;
      return false;
    },

    CLOSE: (user) => {
      if (!user) return false;
      return [ROLES.OFFICER, ROLES.ADMIN].includes(user.role);
    },

    REOPEN: (user, issue) => {
      if (!user || !issue) return false;

      if (user.role === ROLES.CITIZEN) {
        const isReporter = String(user._id) === String(issue.reportedBy || issue.reportedBy?._id);
        return isReporter;
      }

      if (user.role === ROLES.ADMIN) return true;
      return false;
    },
  },

  COMMENT: {
    DELETE: (user, comment) => {
      if (!user || !comment) return false;

      if (String(user._id) === String(comment.user || comment.user?._id)) return true;
      if (user.role === ROLES.ADMIN) return true;
      return false;
    },

    EDIT: (user, comment) => {
      if (!user || !comment) return false;

      if (String(user._id) === String(comment.user || comment.user?._id)) return true;
      if (user.role === ROLES.ADMIN) return true;
      return false;
    },
  },
});

export const hasPermission = (userRole, permission) => {
  if (typeof userRole !== 'string') return false;
  return ROLE_PERMISSIONS[userRole]?.has(permission) ?? false;
};

export const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

export const canPerformResourceAction = (user, resourceType, action, resource) => {
  const resourcePermissions = RESOURCE_PERMISSIONS[resourceType]?.[action];
  if (typeof resourcePermissions !== 'function') return false;
  try {
    return resourcePermissions(user, resource);
  } catch (error) {
    console.error(`Error checking resource permission: ${error.message}`);
    return false;
  }
};
