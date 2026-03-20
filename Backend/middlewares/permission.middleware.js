/**
 * PERMISSION-BASED AUTHORIZATION MIDDLEWARE
 * 
 * Alternative to simple role checking.
 * Provides fine-grained, permission-based access control.
 * 
 * Usage:
 *   router.delete('/issues/:id', 
 *     protect,
 *     canPerform('issue:delete'),
 *     deleteIssueController)
 */

const { hasPermission, canPerformResourceAction } = require('../config/permissions.config');
const { apiResponse } = require('../utils/apiResponse');

/**
 * Check if user has a specific permission
 * Returns 403 if permission denied, calls next() if allowed
 * 
 * @param {string} requiredPermission - Permission to check (e.g., 'admin:manage_users')
 * @returns {Function} Express middleware
 */
exports.canPerform = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return apiResponse(res, 401, 'Unauthorized: No user attached to request');
    }

    if (!hasPermission(req.user.role, requiredPermission)) {
      return apiResponse(
        res,
        403,
        `Forbidden: Permission '${requiredPermission}' required`
      );
    }

    next();
  };
};

/**
 * Check if user has ALL of multiple permissions
 * @param {string|string[]} permissions - Permission or array of permissions
 * @returns {Function} Express middleware
 */
exports.canPerformAll = (permissions) => {
  const permissionList = Array.isArray(permissions) ? permissions : [permissions];

  return (req, res, next) => {
    if (!req.user) {
      return apiResponse(res, 401, 'Unauthorized');
    }

    const hasAll = permissionList.every((perm) =>
      hasPermission(req.user.role, perm)
    );

    if (!hasAll) {
      return apiResponse(res, 403, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Check if user has ANY of multiple permissions
 * @param {string|string[]} permissions - Permission or array of permissions
 * @returns {Function} Express middleware
 */
exports.canPerformAny = (permissions) => {
  const permissionList = Array.isArray(permissions) ? permissions : [permissions];

  return (req, res, next) => {
    if (!req.user) {
      return apiResponse(res, 401, 'Unauthorized');
    }

    const hasAny = permissionList.some((perm) =>
      hasPermission(req.user.role, perm)
    );

    if (!hasAny) {
      return apiResponse(res, 403, 'Insufficient permissions');
    }

    next();
  };
};

/**
 * Resource-level permission check
 * 
 * Attaches req.checkResourcePermission(resource) method for use in controllers.
 * Controllers must call this method to verify fine-grained permissions.
 * 
 * Usage in routes:
 *   router.delete('/issues/:id',
 *     protect,
 *     canPerformResourceAction('ISSUE', 'DELETE'),
 *     deleteIssueController)
 * 
 * Usage in controller:
 *   exports.deleteIssueController = async (req, res) => {
 *     const issue = await Issue.findById(req.params.id);
 *     if (!req.checkResourcePermission(issue)) {
 *       return apiResponse(res, 403, 'Forbidden: Cannot delete this resource');
 *     }
 *     // ... proceed with deletion
 *   };
 * 
 * @param {string} resourceType - Type of resource (e.g., 'ISSUE', 'COMMENT')
 * @param {string} action - Action to perform (e.g., 'DELETE', 'UPDATE_STATUS')
 * @returns {Function} Express middleware
 */
exports.canPerformResourceAction = (resourceType, action, fetchResource = null) => {
  return async (req, res, next) => {
    if (!req.user) {
      return apiResponse(res, 401, 'Unauthorized');
    }

    // Resource can be provided by fetcher or existing req.resource
    let resource = req.resource;
    if (!resource && typeof fetchResource === 'function') {
      try {
        resource = await fetchResource(req);
      } catch (err) {
        console.error('Resource fetch error:', err);
        return apiResponse(res, 500, 'Resource retrieval failed');
      }
    }

    if (!resource) {
      return apiResponse(res, 404, `${resourceType} not found`);
    }

    if (!canPerformResourceAction(req.user, resourceType, action, resource)) {
      return apiResponse(res, 403, 'Forbidden: Cannot perform action on this resource');
    }

    // Keep for compatibility with existing controllers.
    req.resource = resource;
    next();
  };
};

/**
 * Deny by default middleware
 * Use as fallback to deny any unauthenticated access
 */
exports.denyUnauthorized = (req, res, next) => {
  if (!req.user) {
    return apiResponse(res, 401, 'Unauthorized');
  }
  next();
};
