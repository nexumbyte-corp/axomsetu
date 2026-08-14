import { asyncHandler } from '../../utils/asyncHandler.js';
import reportService from './report.service.js';
import { studentReportsService } from './studentReports.service.js';
import { academicReportsService } from './academicReports.service.js';
import { feeReportsService } from './feeReports.service.js';
import { staffReportsService } from './staffReports.service.js';
import { payrollReportsService } from './payrollReports.service.js';
import { financeReportsService } from './financeReports.service.js';
import { auditReportsService } from './auditReports.service.js';
import { genericReportQuerySchema } from './report.validation.js';

// --- Legacy / General Collection ---
export const getDailyCollection = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const data = await reportService.getDailyCollection(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Daily collection report generated', data });
});

export const getMonthlyCollection = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const data = await reportService.getMonthlyCollection(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Monthly collection report generated', data });
});

export const getClassCollection = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const data = await reportService.getClassCollection(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Class collection report generated', data });
});

export const getDuesReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const data = await reportService.getDuesReport(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Outstanding dues report generated', ...data });
});

export const getExportPayments = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const data = await reportService.getExportPayments(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Export payment dataset generated', data });
});

// --- Student Reports ---
export const getStudentDirectory = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await studentReportsService.getStudentDirectory(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Student directory report generated', ...result });
});

export const getClassWiseStudents = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await studentReportsService.getClassWiseStudents(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Class-wise student report generated', ...result });
});

export const getSectionWiseStudents = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await studentReportsService.getSectionWiseStudents(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Section-wise student report generated', ...result });
});

export const getMediumWiseStudents = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await studentReportsService.getMediumWiseStudents(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Medium-wise student report generated', ...result });
});

export const getStreamWiseStudents = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await studentReportsService.getStreamWiseStudents(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Stream-wise student report generated', ...result });
});

export const getStudentStatusReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await studentReportsService.getStudentStatusReport(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Student status report generated', ...result });
});

// --- Academic Reports ---
export const getClassStrengthReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await academicReportsService.getClassStrengthReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Class strength report generated', ...result });
});

export const getEnrollmentReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await academicReportsService.getEnrollmentReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Enrollment report generated', ...result });
});

// --- Fee Reports ---
export const getFeeCollectionReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await feeReportsService.getCollectionReport(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Fee collection report generated', ...result });
});

export const getFeeOutstandingReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await feeReportsService.getOutstandingReport(req.schoolId, query, req.user?.id);
  res.status(200).json({ success: true, message: 'Outstanding fee report generated', ...result });
});

export const getStudentFeeLedger = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await feeReportsService.getStudentLedger(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Student fee ledger generated', ...result });
});

export const getClassFeeCollection = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await feeReportsService.getClassFeeCollection(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Class-wise fee collection report generated', ...result });
});

export const getFeeGenerationBatches = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await feeReportsService.getGenerationBatchesReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Fee generation batch report generated', ...result });
});

// --- Staff Reports ---
export const getStaffDirectory = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await staffReportsService.getStaffDirectory(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Staff directory report generated', ...result });
});

export const getDepartmentWiseStaff = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await staffReportsService.getDepartmentWiseStaff(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Department-wise staff report generated', ...result });
});

export const getDesignationWiseStaff = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await staffReportsService.getDesignationWiseStaff(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Designation-wise staff report generated', ...result });
});

export const getStaffStatusReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await staffReportsService.getStaffStatusReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Staff status report generated', ...result });
});

// --- Payroll Reports ---
export const getMonthlySalaryReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await payrollReportsService.getMonthlySalaryReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Monthly salary report generated', ...result });
});

export const getSalaryPaymentReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await payrollReportsService.getSalaryPaymentReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Salary payment report generated', ...result });
});

export const getStaffSalaryLedger = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await payrollReportsService.getStaffSalaryLedger(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Staff salary ledger generated', ...result });
});

export const getPendingSalaryReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await payrollReportsService.getPendingSalaryReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Pending salary report generated', ...result });
});

export const getStaffAdvanceReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await payrollReportsService.getStaffAdvanceReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Staff advance report generated', ...result });
});

export const getIndividualStaffAdvanceLedger = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await payrollReportsService.getIndividualStaffAdvanceLedger(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Individual staff advance ledger generated', ...result });
});


// --- Finance Reports ---
export const getFinancialSummaryReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await financeReportsService.getFinancialSummary(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Financial summary report generated', ...result });
});

export const getFinancialTransactionReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await financeReportsService.getTransactionReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Financial transaction report generated', ...result });
});

export const getExpenseReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await financeReportsService.getExpenseReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Expense report generated', ...result });
});

export const getFundReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await financeReportsService.getFundReport(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Fund contribution report generated', ...result });
});

export const getPaymentModeSummaryReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await financeReportsService.getPaymentModeSummary(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Payment mode summary report generated', ...result });
});

// --- Audit Report ---
export const getAuditLogsReport = asyncHandler(async (req, res) => {
  const query = genericReportQuerySchema.parse(req.query);
  const result = await auditReportsService.getAuditLogs(req.schoolId, query);
  res.status(200).json({ success: true, message: 'Audit logs report generated', ...result });
});
