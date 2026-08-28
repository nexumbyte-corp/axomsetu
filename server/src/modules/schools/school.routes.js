import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as schoolController from './school.controller.js';
import {
  createSchoolSchema,
  updateSchoolSchema,
  schoolIdParamSchema,
  listSchoolsQuerySchema,
  addSchoolAdminSchema,
  hardDeleteSchoolSchema,
} from './school.validation.js';

const router = Router();

// All admin school routes require Super Admin authentication
router.use(authenticate, requireRole('SUPER_ADMIN'));

router.route('/')
  .post(validate(createSchoolSchema), schoolController.createSchool)
  .get(validate(listSchoolsQuerySchema), schoolController.getSchools);

router.route('/:schoolId')
  .get(validate(schoolIdParamSchema), schoolController.getSchoolDetails)
  .patch(validate(schoolIdParamSchema), validate(updateSchoolSchema), schoolController.updateSchool);

router.route('/:schoolId/status')
  .patch(validate(schoolIdParamSchema), schoolController.changeSchoolStatus);

router.route('/:schoolId/delete-captcha')
  .get(validate(schoolIdParamSchema), schoolController.getHardDeleteCaptcha);

router.route('/:schoolId/hard-delete')
  .delete(validate(hardDeleteSchoolSchema), schoolController.hardDeleteSchool);

router.route('/:schoolId/admins')
  .post(validate(addSchoolAdminSchema), schoolController.addSchoolAdmin);


router.route('/:schoolId/admins/:adminId')
  .delete(schoolController.removeSchoolAdmin);

router.route('/:schoolId/owner')
  .patch(validate(schoolIdParamSchema), schoolController.changeSchoolOwner);

router.route('/:schoolId/users')
  .get(validate(schoolIdParamSchema), schoolController.listSchoolUsers)
  .post(validate(schoolIdParamSchema), schoolController.createSchoolUser);

router.route('/:schoolId/users/:adminId/status')
  .patch(validate(schoolIdParamSchema), schoolController.updateSchoolUserStatus);

export default router;

