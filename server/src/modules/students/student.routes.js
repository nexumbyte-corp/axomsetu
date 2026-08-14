import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { uploadSingleImage } from '../../middleware/upload.middleware.js';
import * as studentController from './student.controller.js';
import { getStudentLedger, getStudentPayments, getStudentOutstanding } from '../fees/payment.controller.js';

const router = Router();

// Apply authentication and school tenant resolution
router.use(authenticate, resolveSchool);

// Photo upload (Must be declared BEFORE parametric :studentId routes)
router.post(
  '/upload-photo',
  requirePermission([PERMISSIONS.STUDENTS_CREATE, PERMISSIONS.STUDENTS_EDIT]),
  uploadSingleImage,
  studentController.uploadStudentPhoto
);

// 1. Bulk Promotion (Must be declared BEFORE parametric :studentId routes)
router.post('/promote-bulk', requirePermission(PERMISSIONS.STUDENTS_PROMOTE), studentController.bulkPromoteStudents);

// 2. Student Creation & Listing
router.post('/', requirePermission(PERMISSIONS.STUDENTS_CREATE), studentController.createStudent);
router.get('/', requirePermission(PERMISSIONS.STUDENTS_VIEW), studentController.listStudents);

// 3. Student Ledger & Payments (Must be declared before general :studentId parametric match)
router.get('/:studentId/ledger', requirePermission(PERMISSIONS.FEES_VIEW), getStudentLedger);
router.get('/:studentId/payments', requirePermission(PERMISSIONS.FEES_VIEW), getStudentPayments);
router.get('/:studentId/outstanding', requirePermission(PERMISSIONS.FEES_VIEW), getStudentOutstanding);

// 4. Individual Student Master & Status Operations
router.get('/:studentId', requirePermission(PERMISSIONS.STUDENTS_VIEW), studentController.getStudentDetails);
router.patch('/:studentId', requirePermission(PERMISSIONS.STUDENTS_EDIT), studentController.updateStudentProfile);
router.patch('/:studentId/status', requirePermission(PERMISSIONS.STUDENTS_EDIT), studentController.updateStudentStatus);

// 5. Enrollment Operations
router.patch('/:studentId/enrollments/:enrollmentId', requirePermission(PERMISSIONS.STUDENTS_EDIT), studentController.updateEnrollment);

// 6. Individual Student Promotion / Repeat
router.post('/:studentId/promote', requirePermission(PERMISSIONS.STUDENTS_PROMOTE), studentController.promoteStudent);

export default router;
