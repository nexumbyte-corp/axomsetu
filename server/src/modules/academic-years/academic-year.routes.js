import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission, requireOwnerOrSchoolAdmin } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as academicYearController from './academicYear.controller.js';
import { academicYearIdParamSchema } from './academicYear.validation.js';

const router = Router();

// Protect all Academic Year routes with tenant authentication
router.use(authenticate, resolveSchool);

router.get('/', academicYearController.getAcademicYears);
router.get('/current', academicYearController.getCurrentAcademicYear);

router.patch(
  '/:academicYearId/lock',
  requireOwnerOrSchoolAdmin(),
  validate(academicYearIdParamSchema),
  academicYearController.lockAcademicYear
);

router.patch(
  '/:academicYearId/unlock',
  requireOwnerOrSchoolAdmin(),
  validate(academicYearIdParamSchema),
  academicYearController.unlockAcademicYear
);

export default router;
