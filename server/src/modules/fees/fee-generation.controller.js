import { asyncHandler } from '../../utils/asyncHandler.js';
import * as feeGenService from './fee-generation.service.js';
import { feeGenerationSchema, queryHistorySchema } from './fee-generation.validation.js';

export const previewFeeGeneration = asyncHandler(async (req, res) => {
  const body = feeGenerationSchema.parse(req.body);
  const data = await feeGenService.processFeeGenerationPreview(req.schoolId, body);

  res.status(200).json({
    success: true,
    message: 'Fee generation preview calculated successfully',
    data,
  });
});

export const executeFeeGeneration = asyncHandler(async (req, res) => {
  const body = feeGenerationSchema.parse(req.body);
  const data = await feeGenService.executeFeeGeneration(req.schoolId, body, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Fee charges generated successfully',
    data,
  });
});

export const getGenerationHistory = asyncHandler(async (req, res) => {
  const query = queryHistorySchema.parse(req.query);
  const data = await feeGenService.listGenerationHistory(req.schoolId, query);

  res.status(200).json({
    success: true,
    message: 'Fee generation history retrieved successfully',
    data: data.data,
    pagination: data.pagination,
  });
});

export const getGenerationBatch = asyncHandler(async (req, res) => {
  const data = await feeGenService.getGenerationBatchById(req.schoolId, req.params.batchId, req.query);

  res.status(200).json({
    success: true,
    message: 'Fee generation batch details retrieved successfully',
    data,
  });
});
