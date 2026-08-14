import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { dashboardService } from './dashboard.service.js';

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId;
  const summary = await dashboardService.getSummary(schoolId, req.query);

  res.status(200).json(
    new ApiResponse(200, summary, 'Dashboard summary operational metrics fetched successfully')
  );
});
