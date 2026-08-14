import { asyncHandler } from '../../utils/asyncHandler.js';
import { adminReportsService } from './adminReports.service.js';

export const adminReportsController = {
  getRevenueReport: asyncHandler(async (req, res) => {
    const report = await adminReportsService.getRevenueReport(req.query);
    res.status(200).json({
      success: true,
      message: 'Platform revenue report retrieved successfully',
      data: report,
    });
  }),

  getGrowthReport: asyncHandler(async (req, res) => {
    const report = await adminReportsService.getGrowthReport();
    res.status(200).json({
      success: true,
      message: 'School growth report retrieved successfully',
      data: report,
    });
  }),
};
