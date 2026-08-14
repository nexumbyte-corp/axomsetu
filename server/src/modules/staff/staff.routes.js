import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission, requireOwnerOrSchoolAdmin } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import * as staffController from './staff.controller.js';
import { salarySetupController } from './salary-setup.controller.js';

const router = Router();

// Protect all routes with auth and school tenant isolation
router.use(authenticate, resolveSchool);

// Salary Setup
router.get('/salary-setup', requirePermission(PERMISSIONS.SALARY_VIEW), salarySetupController.getSalarySetup);
router.post('/salary-setup/copy-previous', requireOwnerOrSchoolAdmin(), salarySetupController.copyPreviousYearSalary);
router.post('/salary-setup/save', requirePermission(PERMISSIONS.SALARY_MANAGE), salarySetupController.saveSalarySetup);

// Overview / Stats
router.get('/overview', requirePermission(PERMISSIONS.STAFF_VIEW), staffController.getPayrollOverview);

// Legacy / Direct Salary Payments
router.get('/salary-payments', requirePermission(PERMISSIONS.PAYROLL_VIEW), staffController.listSalaryPayments);
router.get('/salary-payments/:paymentId', requirePermission(PERMISSIONS.PAYROLL_VIEW), staffController.getSalaryPaymentDetails);
router.post('/salary-payments', requirePermission(PERMISSIONS.PAYROLL_PROCESS), staffController.recordSalaryPayment);

// Staff CRUD
router.get('/', requirePermission(PERMISSIONS.STAFF_VIEW), staffController.listStaff);
router.post('/', requirePermission(PERMISSIONS.STAFF_CREATE), staffController.createStaff);
router.get('/:staffId', requirePermission(PERMISSIONS.STAFF_VIEW), staffController.getStaffDetails);
router.get('/:staffId/paid-months', requirePermission(PERMISSIONS.PAYROLL_VIEW), staffController.getStaffPaidMonths);
router.patch('/:staffId', requirePermission(PERMISSIONS.STAFF_EDIT), staffController.updateStaff);
router.delete('/:staffId', requirePermission(PERMISSIONS.STAFF_DELETE), staffController.deleteStaff);

// Staff Advances
router.post('/:staffId/advances', requirePermission(PERMISSIONS.SALARY_MANAGE), staffController.disburseAdvance);

export default router;
