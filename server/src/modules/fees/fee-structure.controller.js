import { asyncHandler } from '../../utils/asyncHandler.js';
import * as feeStructureService from './fee-structure.service.js';
import {
  createFeeStructureSchema,
  updateFeeStructureSchema,
  queryFeeStructureSchema,
  bulkCreateFeeStructureSchema,
} from './fee-structure.validation.js';

export const getFeeStructures = asyncHandler(async (req, res) => {
  const query = queryFeeStructureSchema.parse(req.query);
  const data = await feeStructureService.listFeeStructures(req.schoolId, query);

  res.status(200).json({
    success: true,
    message: 'Fee structures retrieved successfully',
    data,
  });
});

export const getFeeStructure = asyncHandler(async (req, res) => {
  const data = await feeStructureService.getFeeStructureById(req.schoolId, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Fee structure retrieved successfully',
    data,
  });
});

export const createFeeStructure = asyncHandler(async (req, res) => {
  const body = createFeeStructureSchema.parse(req.body);
  const data = await feeStructureService.createFeeStructure(req.schoolId, body, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Fee structure created successfully',
    data,
  });
});

export const bulkCreateFeeStructures = asyncHandler(async (req, res) => {
  const body = bulkCreateFeeStructureSchema.parse(req.body);
  const result = await feeStructureService.bulkCreateFeeStructures(req.schoolId, body, req.user?.id);

  res.status(201).json({
    success: true,
    message: result.message,
    data: result,
  });
});

export const updateFeeStructure = asyncHandler(async (req, res) => {
  const body = updateFeeStructureSchema.parse(req.body);
  const data = await feeStructureService.updateFeeStructure(req.schoolId, req.params.id, body, req.user?.id);

  res.status(200).json({
    success: true,
    message: 'Fee structure updated successfully',
    data,
  });
});

export const toggleFeeStructureStatus = asyncHandler(async (req, res) => {
  const data = await feeStructureService.toggleFeeStructureStatus(req.schoolId, req.params.id, req.user?.id);

  res.status(200).json({
    success: true,
    message: 'Fee structure status updated successfully',
    data,
  });
});

export const deleteFeeStructure = asyncHandler(async (req, res) => {
  const result = await feeStructureService.deleteFeeStructure(req.schoolId, req.params.id, req.user?.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});
