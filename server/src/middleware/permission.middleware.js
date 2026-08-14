import { ApiError } from '../utils/ApiError.js';
import { ASSIGNABLE_PERMISSIONS, SYSTEM_RESTRICTED_PERMISSIONS } from '../config/permissions.js';

/**
 * Authorization Engine Middleware
 *
 * Evaluation order for school-scoped resources:
 *   1. OWNER → always allowed
 *   2. SCHOOL_ADMIN → always allowed
 *   3. STAFF → check assigned permissions
 *
 * Must be used AFTER authenticate + resolveSchool.
 */

/**
 * Requires the authenticated school user to have a specific permission.
 * OWNER and SCHOOL_ADMIN bypass the permission check automatically.
 *
 * @param {string} permission - The permission constant from PERMISSIONS
 */
export const requirePermission = (permission) => {
  const permList = Array.isArray(permission) ? permission : [permission];
  return (req, res, next) => {
    if (!req.schoolMembership) {
      return next(ApiError.forbidden('School membership context not resolved'));
    }

    const { schoolRole, permissions } = req.schoolMembership;

    // OWNER and SCHOOL_ADMIN have full access to all school operations
    if (schoolRole === 'OWNER' || schoolRole === 'SCHOOL_ADMIN') {
      return next();
    }

    // STAFF: check granular permissions
    const hasPerm = permList.some((p) => permissions.includes(p));
    if (!hasPerm) {
      return next(
        ApiError.forbidden(
          `You do not have permission to perform this action. Required: ${permList.join(' or ')}`
        )
      );
    }

    next();
  };
};

/**
 * Requires the user to be OWNER or SCHOOL_ADMIN.
 * STAFF users are always blocked, regardless of assigned permissions.
 *
 * @param {string} [message] - Optional custom error message
 */
export const requireOwnerOrSchoolAdmin = (message) => {
  return (req, res, next) => {
    if (!req.schoolMembership) {
      return next(ApiError.forbidden('School membership context not resolved'));
    }

    const { schoolRole } = req.schoolMembership;

    if (schoolRole === 'OWNER' || schoolRole === 'SCHOOL_ADMIN') {
      return next();
    }

    return next(
      ApiError.forbidden(
        message || 'Only the Owner or School Admin can perform this action'
      )
    );
  };
};

/**
 * Requires the user to be strictly the School OWNER.
 * SCHOOL_ADMIN and STAFF users are always blocked.
 *
 * @param {string} [message] - Optional custom error message
 */
export const requireSchoolOwner = (message) => {
  return (req, res, next) => {
    if (!req.schoolMembership) {
      return next(ApiError.forbidden('School membership context not resolved'));
    }

    const { schoolRole, isOwner } = req.schoolMembership;

    if (schoolRole === 'OWNER' || isOwner) {
      return next();
    }

    return next(
      ApiError.forbidden(
        message || 'Only the School Owner can perform this action'
      )
    );
  };
};

/**
 * HARD BUSINESS RULE: Void Receipt access.
 * ONLY OWNER or SCHOOL_ADMIN may void a receipt.
 * This guard is absolute — no permission assignment can override it.
 * No STAFF user may ever void a receipt regardless of their permissions.
 */
export const requireVoidReceiptAccess = () => {
  return (req, res, next) => {
    if (!req.schoolMembership) {
      return next(ApiError.forbidden('School membership context not resolved'));
    }

    const { schoolRole } = req.schoolMembership;

    if (schoolRole === 'OWNER' || schoolRole === 'SCHOOL_ADMIN') {
      return next();
    }

    return next(
      ApiError.forbidden(
        'Only the Owner or School Admin can void a receipt. This action is permanently restricted.'
      )
    );
  };
};

/**
 * Validates a list of permissions before saving to database.
 * Throws if any permission is system-restricted (e.g. FEES_VOID_RECEIPT).
 * Throws if any permission is unrecognized.
 *
 * @param {string[]} permissions
 * @throws {ApiError} if any permission is invalid or restricted
 */
export const validateAssignablePermissions = (permissions) => {
  if (!Array.isArray(permissions)) {
    throw ApiError.badRequest('Permissions must be an array');
  }

  for (const perm of permissions) {
    if (SYSTEM_RESTRICTED_PERMISSIONS.includes(perm)) {
      throw ApiError.forbidden(
        `Permission "${perm}" is system-restricted and cannot be assigned to staff users. ` +
        `Only Owner and School Admin can perform this action.`
      );
    }

    if (!ASSIGNABLE_PERMISSIONS.has(perm)) {
      throw ApiError.badRequest(`Unknown permission: "${perm}"`);
    }
  }
};
