import { asyncHandler } from '../../utils/asyncHandler.js';
import * as feeTypeService from './fee-type.service.js';
import { createFeeTypeSchema, updateFeeTypeSchema, queryFeeTypeSchema } from './fee-type.validation.js';

export const getFeeTypes = asyncHandler(async (req, res) => {
  const query = queryFeeTypeSchema.parse(req.query);
  const data = await feeTypeService.listFeeTypes(req.schoolId, query);

  res.status(200).json({
    success: true,
    message: 'Fee types retrieved successfully',
    data,
  });
});

export const getFeeType = asyncHandler(async (req, res) => {
  const data = await feeTypeService.getFeeTypeById(req.schoolId, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Fee type retrieved successfully',
    data,
  });
});

export const createFeeType = asyncHandler(async (req, res) => {
  const body = createFeeTypeSchema.parse(req.body);
  const data = await feeTypeService.createFeeType(req.schoolId, body, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Fee type created successfully',
    data,
  });
});

export const updateFeeType = asyncHandler(async (req, res) => {
  const body = updateFeeTypeSchema.parse(req.body);
  const data = await feeTypeService.updateFeeType(req.schoolId, req.params.id, body, req.user?.id);

  res.status(200).json({
    success: true,
    message: 'Fee type updated successfully',
    data,
  });
});

export const toggleFeeTypeStatus = asyncHandler(async (req, res) => {
  const data = await feeTypeService.toggleFeeTypeStatus(req.schoolId, req.params.id, req.user?.id);

  res.status(200).json({
    success: true,
    message: 'Fee type status updated successfully',
    data,
  });
});

export const deleteFeeType = asyncHandler(async (req, res) => {
  const result = await feeTypeService.deleteFeeType(req.schoolId, req.params.id, req.user?.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});
