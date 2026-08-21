import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import * as reportController from './report.controller.js';

const router = Router();

// Apply authentication and school tenant resolution
router.use(authenticate, resolveSchool);

// Apply REPORTS_VIEW to all report endpoints
router.use(requirePermission(PERMISSIONS.REPORTS_VIEW));

// Financial Collection & Dues Reports (Legacy / Direct)
router.get('/daily-collection', reportController.getDailyCollection);
router.get('/monthly-collection', reportController.getMonthlyCollection);
router.get('/class-collection', reportController.getClassCollection);
router.get('/dues', reportController.getDuesReport);
router.get('/payments/export', requirePermission(PERMISSIONS.REPORTS_EXPORT), reportController.getExportPayments);

// --- Student Reports ---
router.get('/students/directory', reportController.getStudentDirectory);
router.get('/students/class-wise', reportController.getClassWiseStudents);
router.get('/students/section-wise', reportController.getSectionWiseStudents);
router.get('/students/medium-wise', reportController.getMediumWiseStudents);
router.get('/students/stream-wise', reportController.getStreamWiseStudents);
router.get('/students/status', reportController.getStudentStatusReport);

// --- Academic Reports ---
router.get('/academic/class-strength', reportController.getClassStrengthReport);
router.get('/academic/enrollment', reportController.getEnrollmentReport);

// --- Fee Reports ---
router.get('/fees/collection', reportController.getFeeCollectionReport);
router.get('/fees/outstanding', reportController.getFeeOutstandingReport);
router.get('/fees/student-ledger', reportController.getStudentFeeLedger);
router.get('/fees/class-collection', reportController.getClassFeeCollection);
router.get('/fees/batches', reportController.getFeeGenerationBatches);

// --- Staff Reports ---
router.get('/staff/directory', reportController.getStaffDirectory);
router.get('/staff/department-wise', reportController.getDepartmentWiseStaff);
router.get('/staff/designation-wise', reportController.getDesignationWiseStaff);
router.get('/staff/status', reportController.getStaffStatusReport);

// --- Payroll Reports ---
router.get('/payroll/monthly', reportController.getMonthlySalaryReport);
router.get('/payroll/payments', reportController.getSalaryPaymentReport);
router.get('/payroll/staff-ledger', reportController.getStaffSalaryLedger);
router.get('/payroll/pending', reportController.getPendingSalaryReport);
router.get('/payroll/advances', reportController.getStaffAdvanceReport);
router.get('/payroll/individual-advance', reportController.getIndividualStaffAdvanceLedger);


// --- Finance Reports ---
router.get('/finance/summary', reportController.getFinancialSummaryReport);
router.get('/finance/transactions', reportController.getFinancialTransactionReport);
router.get('/finance/expenses', reportController.getExpenseReport);
router.get('/finance/funds', reportController.getFundReport);
router.get('/finance/payment-modes', reportController.getPaymentModeSummaryReport);

// --- Audit Report ---
router.get('/audit/logs', reportController.getAuditLogsReport);

// --- Hostel Reports ---
router.get('/hostel/:type', reportController.getHostelReport);

export default router;
