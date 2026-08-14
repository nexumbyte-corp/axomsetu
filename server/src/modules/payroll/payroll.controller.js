import { payrollService } from './payroll.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export const payrollController = {
  /**
   * GET /api/payroll/monthly?month=AUGUST&year=2026&academicYearId=...
   */
  async getMonthlyPayroll(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const result = await payrollService.getMonthlyPayroll(schoolId, req.query);
      return ApiResponse.success(res, result, 'Monthly payroll records loaded.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/payroll/prep-review?academicYearId=...&month=AUGUST&year=2026&workingDays=26
   */
  async getSalaryPrepReviewList(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const result = await payrollService.getSalaryPrepReviewList(schoolId, req.query);
      return ApiResponse.success(res, result, 'Salary preparation review list loaded.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/payroll/prepare
   */
  async prepareMonthlyPayroll(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const userId = req.user?.id;
      const result = await payrollService.prepareMonthlyPayroll(schoolId, req.body, userId);
      return ApiResponse.success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/payroll/monthly/:payrollId
   */
  async updateStaffMonthlyPayroll(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const userId = req.user?.id;
      const { payrollId } = req.params;
      const result = await payrollService.updateStaffMonthlyPayroll(schoolId, payrollId, req.body, userId);
      return ApiResponse.success(res, result, 'Staff salary and attendance updated.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/payroll/pending?staffId=...
   */
  async getPendingPayrollsForStaff(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const { staffId } = req.query;

      if (!staffId) {
        return res.status(400).json({
          success: false,
          message: 'Staff ID is required.',
        });
      }

      const result = await payrollService.getPendingPayrollsForStaff(schoolId, staffId);
      return ApiResponse.success(res, result, 'Pending payroll records retrieved.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/payroll/payments
   */
  async recordMultiMonthSalaryPayment(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const userId = req.user?.id;
      const result = await payrollService.recordMultiMonthSalaryPayment(schoolId, req.body, userId);
      return ApiResponse.success(res, result, 'Salary payment recorded successfully.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/payroll/payments/:paymentId/receipt
   */
  async getSalaryPaymentReceiptData(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const { paymentId } = req.params;
      const result = await payrollService.getSalaryPaymentReceiptData(schoolId, paymentId);
      return ApiResponse.success(res, result, 'Payment receipt data retrieved.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/payroll/history
   */
  async getSalaryPaymentHistory(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const result = await payrollService.getSalaryPaymentHistory(schoolId, req.query);
      return ApiResponse.success(res, result, 'Salary payment history retrieved.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/payroll/salary-slip
   */
  async getEmployeeSalarySlipPayload(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const result = await payrollService.getEmployeeSalarySlipPayload(schoolId, req.body);
      return ApiResponse.success(res, result, 'Salary slip payload generated.');
    } catch (err) {
      next(err);
    }
  },
};
