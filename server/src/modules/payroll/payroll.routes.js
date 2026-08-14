import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import { payrollController } from './payroll.controller.js';

const router = Router();

router.use(authenticate, resolveSchool);

router.get('/monthly', requirePermission(PERMISSIONS.PAYROLL_VIEW), payrollController.getMonthlyPayroll);
router.get('/prep-review', requirePermission(PERMISSIONS.PAYROLL_VIEW), payrollController.getSalaryPrepReviewList);
router.post('/prepare', requirePermission(PERMISSIONS.PAYROLL_PROCESS), payrollController.prepareMonthlyPayroll);
router.put('/monthly/:payrollId', requirePermission(PERMISSIONS.PAYROLL_PROCESS), payrollController.updateStaffMonthlyPayroll);

router.get('/pending', requirePermission(PERMISSIONS.PAYROLL_VIEW), payrollController.getPendingPayrollsForStaff);
router.post('/payments', requirePermission(PERMISSIONS.PAYROLL_PROCESS), payrollController.recordMultiMonthSalaryPayment);
router.get('/payments/:paymentId/receipt', requirePermission(PERMISSIONS.PAYROLL_VIEW), payrollController.getSalaryPaymentReceiptData);
router.get('/history', requirePermission(PERMISSIONS.PAYROLL_VIEW), payrollController.getSalaryPaymentHistory);
router.post('/salary-slip', requirePermission(PERMISSIONS.PAYROLL_VIEW), payrollController.getEmployeeSalarySlipPayload);

export default router;
