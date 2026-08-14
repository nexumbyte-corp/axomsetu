import { asyncHandler } from '../../utils/asyncHandler.js';
import * as academicYearService from './academicYear.service.js';

export const getAcademicYears = asyncHandler(async (req, res) => {
  const result = await academicYearService.listAcademicYears(req.schoolId);

  res.status(200).json({
    success: true,
    message: 'Academic years retrieved successfully',
    data: result,
  });
});

export const getCurrentAcademicYear = asyncHandler(async (req, res) => {
  const result = await academicYearService.getCurrentAcademicYear(req.schoolId);

  res.status(200).json({
    success: true,
    message: 'Current academic year retrieved successfully',
    data: result,
  });
});

export const lockAcademicYear = asyncHandler(async (req, res) => {
  const result = await academicYearService.lockAcademicYear(
    req.schoolId,
    req.params.academicYearId,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: 'Academic year locked successfully',
    data: result,
  });
});

export const unlockAcademicYear = asyncHandler(async (req, res) => {
  const result = await academicYearService.unlockAcademicYear(
    req.schoolId,
    req.params.academicYearId,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: 'Academic year unlocked successfully',
    data: result,
  });
});
