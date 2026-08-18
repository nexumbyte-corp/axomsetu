import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import {
  requirePermission,
  requireOwnerOrSchoolAdmin,
} from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { schoolUserController } from './school-user.controller.js';

const router = Router();

// Apply authentication and school tenant resolution
router.use(authenticate, resolveSchool);

// ── Permission Groups reference (used by UI to build permission matrix)
router.get('/permission-groups', requirePermission([PERMISSIONS.USERS_VIEW, PERMISSIONS.USERS_MANAGE_PERMISSIONS]), schoolUserController.getPermissionGroups);

// ── List and create school users
router.get(
  '/',
  requirePermission(PERMISSIONS.USERS_VIEW),
  schoolUserController.listUsers
);

router.post(
  '/',
  requireOwnerOrSchoolAdmin(),
  requirePermission(PERMISSIONS.USERS_CREATE),
  schoolUserController.createUser
);

// ── Single user management
router.get(
  '/:id',
  requirePermission(PERMISSIONS.USERS_VIEW),
  schoolUserController.getUser
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.USERS_EDIT),
  schoolUserController.updateUser
);

router.patch(
  '/:id/status',
  requireOwnerOrSchoolAdmin(),
  requirePermission(PERMISSIONS.USERS_DISABLE),
  schoolUserController.updateUserStatus
);

// ── Permission management
router.get(
  '/:id/permissions',
  requirePermission(PERMISSIONS.USERS_VIEW),
  schoolUserController.getUserPermissions
);

router.put(
  '/:id/permissions',
  requireOwnerOrSchoolAdmin(),
  requirePermission(PERMISSIONS.USERS_MANAGE_PERMISSIONS),
  schoolUserController.setUserPermissions
);

export default router;
