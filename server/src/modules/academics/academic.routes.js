import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission, requireOwnerOrSchoolAdmin } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as academicController from './academic.controller.js';
import {
  createClassSchema,
  updateClassSchema,
  classIdParamSchema,
  bulkDeleteClassesSchema,
  createMediumSchema,
  updateMediumSchema,
  mediumIdParamSchema,
  createSectionSchema,
  updateSectionSchema,
  sectionIdParamSchema,
  createStreamSchema,
  updateStreamSchema,
  streamIdParamSchema,
} from './academic.validation.js';

// ==========================================
// CLASSES ROUTER
// ==========================================
export const classesRouter = Router();
classesRouter.use(authenticate, resolveSchool);

classesRouter.get('/', requirePermission([PERMISSIONS.ACADEMICS_VIEW, PERMISSIONS.ACADEMICS_MANAGE, PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.FEES_VIEW]), academicController.getClasses);
classesRouter.post('/', requirePermission(PERMISSIONS.ACADEMICS_MANAGE), validate(createClassSchema), academicController.addClass);
classesRouter.post('/bulk-delete', requireOwnerOrSchoolAdmin(), validate(bulkDeleteClassesSchema), academicController.bulkDeleteClasses);
classesRouter.patch('/:classId', requirePermission(PERMISSIONS.ACADEMICS_MANAGE), validate(classIdParamSchema), validate(updateClassSchema), academicController.updateClass);
classesRouter.delete('/:classId', requireOwnerOrSchoolAdmin(), validate(classIdParamSchema), academicController.deleteClass);

// ==========================================
// MEDIUMS ROUTER
// ==========================================
export const mediumsRouter = Router();
mediumsRouter.use(authenticate, resolveSchool);

mediumsRouter.get('/', requirePermission([PERMISSIONS.ACADEMICS_VIEW, PERMISSIONS.ACADEMICS_MANAGE, PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.FEES_VIEW]), academicController.getMediums);
mediumsRouter.post('/', requirePermission(PERMISSIONS.ACADEMICS_MANAGE), validate(createMediumSchema), academicController.addMedium);
mediumsRouter.patch('/:mediumId', requirePermission(PERMISSIONS.ACADEMICS_MANAGE), validate(mediumIdParamSchema), validate(updateMediumSchema), academicController.updateMedium);

// ==========================================
// SECTIONS ROUTER
// ==========================================
export const sectionsRouter = Router();
sectionsRouter.use(authenticate, resolveSchool);

sectionsRouter.get('/', requirePermission([PERMISSIONS.ACADEMICS_VIEW, PERMISSIONS.ACADEMICS_MANAGE, PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.FEES_VIEW]), academicController.getSections);
sectionsRouter.post('/', requirePermission(PERMISSIONS.ACADEMICS_MANAGE), validate(createSectionSchema), academicController.addSection);
sectionsRouter.patch('/:sectionId', requirePermission(PERMISSIONS.ACADEMICS_MANAGE), validate(sectionIdParamSchema), validate(updateSectionSchema), academicController.updateSection);

// ==========================================
// STREAMS ROUTER
// ==========================================
export const streamsRouter = Router();
streamsRouter.use(authenticate, resolveSchool);

streamsRouter.get('/', requirePermission([PERMISSIONS.ACADEMICS_VIEW, PERMISSIONS.ACADEMICS_MANAGE, PERMISSIONS.STUDENTS_VIEW, PERMISSIONS.FEES_VIEW]), academicController.getStreams);
streamsRouter.post('/', requirePermission(PERMISSIONS.ACADEMICS_MANAGE), validate(createStreamSchema), academicController.addStream);
streamsRouter.patch('/:streamId', requirePermission(PERMISSIONS.ACADEMICS_MANAGE), validate(streamIdParamSchema), validate(updateStreamSchema), academicController.updateStream);
