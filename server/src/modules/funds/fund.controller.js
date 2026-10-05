import { fundService } from './fund.service.js';
import { fundSourceService } from './fundSource.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  addFundSchema,
  cancelFundSchema,
  createFundSourceSchema,
  updateFundSourceSchema,
} from './fund.validation.js';

// Fund Handlers
export const addFund = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const userId = req.user?.id;
  const validatedBody = addFundSchema.parse(req.body);
  const result = await fundService.addFund(schoolId, validatedBody, userId);
  return ApiResponse.success(res, result, 'Fund added successfully', 201);
});

export const getFunds = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const result = await fundService.getFunds(schoolId, req.query);
  return ApiResponse.success(res, result, 'Funds retrieved successfully');
});

export const getFundById = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const fund = await fundService.getFundById(schoolId, id);
  return ApiResponse.success(res, fund, 'Fund details retrieved successfully');
});

export const cancelFund = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const userId = req.user?.id;
  const { reason } = cancelFundSchema.parse(req.body || {});
  const result = await fundService.cancelFund(schoolId, id, reason, userId);
  return ApiResponse.success(res, result, 'Fund transaction cancelled successfully');
});

// Fund Source Handlers
export const createFundSource = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const validatedBody = createFundSourceSchema.parse(req.body);
  const source = await fundSourceService.createFundSource(schoolId, validatedBody);
  return ApiResponse.success(res, source, 'Fund source created successfully', 201);
});

export const getFundSources = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const sources = await fundSourceService.getFundSources(schoolId, req.query);
  return ApiResponse.success(res, sources, 'Fund sources retrieved successfully');
});

export const updateFundSource = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const validatedBody = updateFundSourceSchema.parse(req.body);
  const source = await fundSourceService.updateFundSource(schoolId, id, validatedBody);
  return ApiResponse.success(res, source, 'Fund source updated successfully');
});

export const toggleFundSourceStatus = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    throw ApiError.badRequest('isActive must be a boolean');
  }
  const source = await fundSourceService.toggleFundSourceStatus(schoolId, id, isActive);
  return ApiResponse.success(res, source, 'Fund source status updated successfully');
});

export const deleteFundSource = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const result = await fundSourceService.deleteFundSource(schoolId, id);
  return ApiResponse.success(res, result, 'Fund source action processed successfully');
});
