import { asyncHandler } from '../../utils/asyncHandler.js';
import { adminDashboardService } from './adminDashboard.service.js';

export const adminDashboardController = {
  getSummary: asyncHandler(async (req, res) => {
    const summary = await adminDashboardService.getDashboardSummary();
    res.status(200).json({
      success: true,
      message: 'Super Admin dashboard metrics retrieved successfully',
      data: summary,
    });
  }),
};
