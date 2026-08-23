import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requireSchoolOwner } from '../../middleware/permission.middleware.js';
import { uploadSingleImage, validateImageMagicBytes } from '../../middleware/upload.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as schoolController from './school.controller.js';
import { updateSchoolSchema } from './school.validation.js';

const router = Router();

router.use(authenticate, resolveSchool);

router.get(
  '/profile',
  requireSchoolOwner('Only the School Owner can access the school profile.'),
  schoolController.getTenantSchoolProfile
);

router.patch(
  '/profile',
  requireSchoolOwner('Only the School Owner can update the school profile.'),
  validate(updateSchoolSchema),
  schoolController.updateTenantSchoolProfile
);

router.post(
  '/logo',
  requireSchoolOwner('Only the School Owner can upload school logo.'),
  uploadSingleImage,
  validateImageMagicBytes,
  schoolController.uploadTenantSchoolLogo
);

router.delete(
  '/logo',
  requireSchoolOwner('Only the School Owner can delete school logo.'),
  schoolController.deleteTenantSchoolLogo
);

export default router;
