import { salarySetupService } from './salary-setup.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export const salarySetupController = {
  /**
   * GET /api/staff/salary-setup?academicYearId=...
   */
  async getSalarySetup(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const { academicYearId } = req.query;

      if (!academicYearId) {
        return res.status(400).json({
          success: false,
          message: 'Academic Year ID parameter is required.',
        });
      }

      const result = await salarySetupService.getSalarySetup(schoolId, academicYearId);
      return ApiResponse.success(res, result, 'Salary setup configuration loaded.');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/staff/salary-setup/copy-previous
   */
  async copyPreviousYearSalary(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const userId = req.user?.id;
      const { academicYearId } = req.body;

      if (!academicYearId) {
        return res.status(400).json({
          success: false,
          message: 'Target academicYearId is required.',
        });
      }

      const result = await salarySetupService.copyPreviousYearSalary(schoolId, academicYearId, userId);
      return ApiResponse.success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/staff/salary-setup/save
   */
  async saveSalarySetup(req, res, next) {
    try {
      const schoolId = req.schoolId || req.user?.schoolId;
      const userId = req.user?.id;
      const { academicYearId, rows, effectiveFrom } = req.body;

      if (!academicYearId) {
        return res.status(400).json({
          success: false,
          message: 'Academic Year ID is required.',
        });
      }

      const result = await salarySetupService.saveSalarySetup(
        schoolId,
        academicYearId,
        { rows, effectiveFrom },
        userId
      );
      return ApiResponse.success(res, result, result.message);
    } catch (err) {
      next(err);
    }
  },
};
