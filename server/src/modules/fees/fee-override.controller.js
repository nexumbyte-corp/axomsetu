import { asyncHandler } from '../../utils/asyncHandler.js';
import * as feeOverrideService from './fee-override.service.js';
import { upsertFeeOverrideSchema, queryFeeOverrideSchema } from './fee-override.validation.js';

export const getStudentFeeOverrides = asyncHandler(async (req, res) => {
  const query = queryFeeOverrideSchema.parse(req.query);
  const data = await feeOverrideService.getStudentFeeOverrides(
    req.schoolId,
    req.params.studentId,
    query
  );

  res.status(200).json({
    success: true,
    message: 'Student fee overrides retrieved successfully',
    data,
  });
});

export const upsertFeeOverride = asyncHandler(async (req, res) => {
  const body = upsertFeeOverrideSchema.parse(req.body);
  const data = await feeOverrideService.upsertFeeOverride(
    req.schoolId,
    req.params.studentId,
    body,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: 'Student fee override saved successfully',
    data,
  });
});

export const deleteFeeOverride = asyncHandler(async (req, res) => {
  const result = await feeOverrideService.deleteFeeOverride(
    req.schoolId,
    req.params.studentId,
    req.params.overrideId,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: result.message,
  });
});
