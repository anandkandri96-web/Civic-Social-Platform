/**
 * CENTRALIZED PERMISSION CONFIGURATION
 * 
 * Source of truth for all roles, permissions, and role-to-permission mappings.
 * Used by both frontend and backend.
 * 
 * Add new permissions here and update corresponding role permissions below.
 */

const ROLES = Object.freeze({
  CITIZEN: 'citizen',
  VOLUNTEER: 'volunteer',
  OFFICER: 'officer',
  WORKER: 'worker',
  ADMIN: 'admin',
});

/**
 * PERMISSIONS: All possible actions in the system
 * Naming convention: resource:action
 */
const PERMISSIONS = Object.freeze({
  // Issue actions
  ISSUE_CREATE: 'issue:create',
  ISSUE_READ: 'issue:read',
  ISSUE_UPDATE: 'issue:update',
  ISSUE_DELETE: 'issue:delete',
  ISSUE_VERIFY: 'issue:verify',
  ISSUE_CLOSE: 'issue:close',
  ISSUE_REOPEN: 'issue:reopen',
  ISSUE_VIEW_ANALYTICS: 'issue:view_analytics',

  // Comment actions
  COMMENT_CREATE: 'comment:create',
  COMMENT_DELETE: 'comment:delete',
  COMMENT_EDIT: 'comment:edit',

  // Vote actions
  VOTE_CREATE: 'vote:create',
  VOTE_DELETE: 'vote:delete',

  // Volunteer actions
  VOLUNTEER_ACCESS: 'volunteer:access',
  VOLUNTEER_CLAIM_ISSUE: 'volunteer:claim_issue',
  VOLUNTEER_SUBMIT_RESOLUTION: 'volunteer:submit_resolution',
  VOLUNTEER_UPDATE_PROGRESS: 'volunteer:update_progress',

  // Officer actions
  OFFICER_ACCESS: 'officer:access',
  OFFICER_REVIEW_ISSUE: 'officer:review_issue',
  OFFICER_REVIEW_ISSUES: 'officer:review_issues',
  OFFICER_ASSIGN_WORKER: 'officer:assign_worker',
  OFFICER_UPDATE_STATUS: 'officer:update_status',
  OFFICER_UPDATE_ISSUE_STATUS: 'issue:update',
  OFFICER_CLOSE_ISSUE: 'issue:close', // Backward compatibility

  // Admin actions
  ADMIN_UPDATE_ISSUE_STATUS: 'issue:update',
  ADMIN_CLOSE_ISSUE: 'issue:close', // Backward compatibility
  ADMIN_REVIEW_ISSUE: 'officer:review_issue',
  ADMIN_ASSIGN_WORKER: 'officer:assign_worker',
  ADMIN_VIEW_ALL_ISSUES: 'admin:view_all_issues',

  // Worker/Task actions
  WORKER_ACCEPT_TASK: 'worker:accept_task',
  WORKER_UPDATE_PROGRESS: 'worker:update_progress',
  WORKER_COMPLETE_TASK: 'worker:complete_task',
  WORKER_VIEW_TASKS: 'worker:view_tasks',
  TASK_VIEW_OWN: 'worker:view_tasks', // Backward compatibility
  TASK_CREATE: 'worker:accept_task', // Backward compatibility for task creation (officer assigns)
  TASK_UPDATE_STATUS: 'worker:update_progress', // Backward compatibility
  TASK_ADD_PROGRESS: 'worker:update_progress', // Backward compatibility

  // Admin actions
  ADMIN_MANAGE_USERS: 'admin:manage_users',
  ADMIN_VIEW_ALL_ISSUES: 'admin:view_all_issues',
  ADMIN_VIEW_ISSUES: 'admin:view_all_issues',
  ADMIN_APPROVE_USERS: 'admin:approve_users',
  ADMIN_APPROVE_USER: 'admin:approve_user',
  ADMIN_DISABLE_ACCOUNT: 'admin:disable_account',
  ADMIN_CHANGE_ROLE: 'admin:change_role',
  ADMIN_DELETE_USER: 'admin:delete_user',
  ADMIN_CLOSE_ISSUE: 'issue:close', // Backward compatibility
  ADMIN_MANAGE_DEPARTMENTS: 'admin:manage_departments',
  ADMIN_VIEW_ANALYTICS: 'admin:view_analytics',
});

/**
 * ROLE_PERMISSIONS: Maps each role to their allowed permissions
 * 
 * Design principles:
 * - Citizen: Can report, vote, comment
 * - Volunteer: Citizen permissions + can claim and resolve issues
 * - Officer: Can review issues for department, assign workers
 * - Worker: Can accept and complete tasks
 * - Admin: All permissions
 */
const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.CITIZEN]: new Set([
    PERMISSIONS.ISSUE_CREATE,
    PERMISSIONS.ISSUE_READ,
    PERMISSIONS.ISSUE_VERIFY,
    PERMISSIONS.ISSUE_REOPEN,
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_DELETE,
    PERMISSIONS.VOTE_CREATE,
    PERMISSIONS.VOTE_DELETE,
  ]),

  [ROLES.VOLUNTEER]: new Set([
    // Extends citizen permissions
    PERMISSIONS.ISSUE_CREATE,
    PERMISSIONS.ISSUE_READ,
    PERMISSIONS.ISSUE_VERIFY,
    PERMISSIONS.ISSUE_REOPEN,
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_DELETE,
    PERMISSIONS.VOTE_CREATE,
    PERMISSIONS.VOTE_DELETE,
    PERMISSIONS.VOLUNTEER_ACCESS,
    // Plus volunteer-specific
    PERMISSIONS.VOLUNTEER_CLAIM_ISSUE,
    PERMISSIONS.VOLUNTEER_SUBMIT_RESOLUTION,
    PERMISSIONS.VOLUNTEER_UPDATE_PROGRESS,
  ]),

  [ROLES.OFFICER]: new Set([
    PERMISSIONS.ISSUE_READ,
    PERMISSIONS.OFFICER_ACCESS,
    PERMISSIONS.OFFICER_REVIEW_ISSUES,
    PERMISSIONS.OFFICER_REVIEW_ISSUE,
    PERMISSIONS.OFFICER_ASSIGN_WORKER,
    PERMISSIONS.OFFICER_UPDATE_STATUS,
    PERMISSIONS.OFFICER_UPDATE_ISSUE_STATUS,
    PERMISSIONS.OFFICER_CLOSE_ISSUE,
    PERMISSIONS.OFFICER_VIEW_QUEUE,
    PERMISSIONS.OFFICER_VIEW_DEPARTMENT,
    PERMISSIONS.COMMENT_CREATE,
  ]),

  [ROLES.WORKER]: new Set([
    PERMISSIONS.WORKER_ACCEPT_TASK,
    PERMISSIONS.WORKER_UPDATE_PROGRESS,
    PERMISSIONS.WORKER_COMPLETE_TASK,
    PERMISSIONS.WORKER_VIEW_TASKS,
    PERMISSIONS.ISSUE_READ,
  ]),

  [ROLES.ADMIN]: new Set([
    // Admin has all permissions
    ...Object.values(PERMISSIONS),
  ]),
});

/**
 * RESOURCE_PERMISSIONS: Fine-grained permissions for specific resources
 * Used for resource-level authorization (e.g., "Can this officer delete this issue?")
 * 
 * Each function receives (user, resource) and returns boolean
 */
const RESOURCE_PERMISSIONS = Object.freeze({
  ISSUE: {
    UPDATE: (user, issue) => {
      if (!user || !issue) return false;

      // Citizens can update own issues before assignment; admins can update all.
      if (user.role === ROLES.CITIZEN) {
        const isReporter =
          String(user._id) === String(issue.reportedBy) ||
          String(user._id) === String(issue.reportedBy?._id);
        return isReporter && ['reported', 'under_review'].includes(issue.status);
      }

      if (user.role === ROLES.ADMIN) return true;

      // Officers can update in their department only
      if (user.role === ROLES.OFFICER) {
        const userDeptId = String(user.department || '');
        const issueDeptId = String(issue.assignedDepartment || issue.assignedDepartment?._id || '');
        return userDeptId === issueDeptId;
      }

      // Volunteers can only update issues they claimed via community flow
      if (user.role === ROLES.VOLUNTEER) {
        return String(issue.volunteer) === String(user._id);
      }

      return false;
    },

    DELETE: (user, issue) => {
      if (!user || !issue) return false;

      // Citizen can delete own issue if in 'reported' or 'closed' status
      if (user.role === ROLES.CITIZEN) {
        const isReporter =
          String(user._id) === String(issue.reportedBy) ||
          String(user._id) === String(issue.reportedBy?._id);
        const isDeletableStatus = ['reported', 'closed'].includes(issue.status);
        return isReporter && isDeletableStatus;
      }

      // Admin can delete any issue
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

      if (user.role === ROLES.VOLUNTEER) {
        return String(issue.volunteer) === String(user._id);
      }

      return false;
    },

    REVIEW: (user, issue) => {
      if (!user || !issue) return false;
      if (user.role === ROLES.ADMIN) return true;
      if (user.role === ROLES.OFFICER) {
        const userDeptId = String(user.department || '');
        const issueDeptId = String(issue.assignedDepartment || issue.assignedDepartment?._id || '');
        return userDeptId === issueDeptId;
      }
      return false;
    },

    ASSIGN_WORKER: (user, issue) => {
      if (!user || !issue) return false;
      if (user.role === ROLES.ADMIN) return true;
      if (user.role === ROLES.OFFICER) {
        const userDeptId = String(user.department || '');
        const issueDeptId = String(issue.assignedDepartment || issue.assignedDepartment?._id || '');
        return userDeptId === issueDeptId;
      }
      return false;
    },

    CLOSE: (user, issue) => {
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

    VERIFY_RESOLUTION: (user, issue) => {
      if (!user || !issue) return false;
      if (user.role === ROLES.CITIZEN) {
        return String(user._id) === String(issue.reportedBy || issue.reportedBy?._id);
      }
      if (user.role === ROLES.ADMIN) return true;
      return false;
    },
  },

  COMMENT: {
    DELETE: (user, comment) => {
      if (!user || !comment) return false;

      // User can delete own comment
      if (String(user._id) === String(comment.user || comment.user?._id)) return true;

      // Admin can delete any comment
      if (user.role === ROLES.ADMIN) return true;

      return false;
    },

    EDIT: (user, comment) => {
      if (!user || !comment) return false;

      // User can edit own comment
      if (String(user._id) === String(comment.user || comment.user?._id)) return true;

      // Admin can edit any comment
      if (user.role === ROLES.ADMIN) return true;

      return false;
    },
  },
});

/**
 * Helper functions
 */
const hasPermission = (userRole, permission) => {
  if (typeof userRole !== 'string') return false;
  return ROLE_PERMISSIONS[userRole]?.has(permission) ?? false;
};

const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

const canPerformResourceAction = (user, resourceType, action, resource) => {
  const resourcePermissions = RESOURCE_PERMISSIONS[resourceType]?.[action];
  if (typeof resourcePermissions !== 'function') return false;
  try {
    return resourcePermissions(user, resource);
  } catch (error) {
    console.error(`Error checking resource permission: ${error.message}`);
    return false;
  }
};

/**
 * Exports for Node.js (CommonJS)
 */
module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  RESOURCE_PERMISSIONS,
  hasPermission,
  isValidRole,
  canPerformResourceAction,
};
