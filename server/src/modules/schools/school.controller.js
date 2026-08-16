import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import * as schoolService from './school.service.js';

export const registerSchool = asyncHandler(async (req, res) => {
  const reqContext = {
    ipAddress: (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '').toString(),
    userAgent: req.headers['user-agent'] || null,
  };
  const result = await schoolService.createSchoolWithOwnerAndTrial(req.body, null, reqContext);

  res.status(201).json({
    success: true,
    message: 'School registered successfully',
    data: result,
  });
});

export const createSchool = asyncHandler(async (req, res) => {
  const reqContext = {
    ipAddress: (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '').toString(),
    userAgent: req.headers['user-agent'] || null,
  };
  const result = await schoolService.createSchoolWithOwnerAndTrial(req.body, req.user?.id, reqContext);

  res.status(201).json({
    success: true,
    message: 'School created successfully',
    data: result,
  });
});

export const getSchools = asyncHandler(async (req, res) => {
  const result = await schoolService.listSchools(req.query);

  res.status(200).json({
    success: true,
    message: 'Schools retrieved successfully',
    data: result.items,
    pagination: result.pagination,
  });
});

export const getSchoolDetails = asyncHandler(async (req, res) => {
  const result = await schoolService.getSchoolById(req.params.schoolId);

  res.status(200).json({
    success: true,
    message: 'School details retrieved successfully',
    data: result,
  });
});

export const updateSchool = asyncHandler(async (req, res) => {
  const result = await schoolService.updateSchool(req.params.schoolId, req.body, req.user?.id);

  res.status(200).json({
    success: true,
    message: 'School updated successfully',
    data: result,
  });
});

export const changeSchoolStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const result = await schoolService.updateSchoolStatus(req.params.schoolId, status, reason, req.user?.id);

  res.status(200).json({
    success: true,
    message: `School status updated to ${status} successfully`,
    data: result,
  });
});

export const addSchoolAdmin = asyncHandler(async (req, res) => {
  const result = await schoolService.addSchoolAdmin(req.params.schoolId, req.body, req.body.isOwner, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'School admin added successfully',
    data: result,
  });
});

export const removeSchoolAdmin = asyncHandler(async (req, res) => {
  const { schoolId, adminId } = req.params;
  const result = await schoolService.removeSchoolAdmin(schoolId, adminId, req.user?.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const changeSchoolOwner = asyncHandler(async (req, res) => {
  const { newOwnerUserId } = req.body;
  const result = await schoolService.changeSchoolOwner(req.params.schoolId, newOwnerUserId, req.user?.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const listSchoolUsers = asyncHandler(async (req, res) => {
  const users = await schoolService.listSchoolUsers(req.params.schoolId);
  res.status(200).json({
    success: true,
    data: users,
  });
});

export const createSchoolUser = asyncHandler(async (req, res) => {
  const result = await schoolService.createSchoolUser(req.params.schoolId, req.body, req.user?.id);
  res.status(201).json({
    success: true,
    message: 'School user created successfully',
    data: result,
  });
});

export const updateSchoolUserStatus = asyncHandler(async (req, res) => {
  const { schoolId, adminId } = req.params;
  const { isActive } = req.body;
  const result = await schoolService.updateSchoolUserStatus(schoolId, adminId, isActive, req.user?.id);
  res.status(200).json({
    success: true,
    message: `User status updated to ${isActive ? 'active' : 'inactive'}`,
    data: result,
  });
});

export const getTenantSchoolProfile = asyncHandler(async (req, res) => {
  const profile = await schoolService.getTenantSchoolProfile(req.schoolId);
  res.status(200).json({
    success: true,
    message: 'School profile retrieved successfully',
    data: profile,
  });
});

export const updateTenantSchoolProfile = asyncHandler(async (req, res) => {
  const result = await schoolService.updateTenantSchoolProfile(req.schoolId, req.body, req.user?.id);
  res.status(200).json({
    success: true,
    message: 'School profile updated successfully',
    data: result,
  });
});

export const uploadTenantSchoolLogo = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest('Please upload an image file');
  }

  const result = await schoolService.uploadTenantSchoolLogo(
    req.schoolId,
    req.file.buffer,
    req.file.mimetype,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: `Logo uploaded successfully (${result.sizeKb} KB)`,
    data: result,
  });
});

export const deleteTenantSchoolLogo = asyncHandler(async (req, res) => {
  const result = await schoolService.deleteTenantSchoolLogo(req.schoolId, req.user?.id);

  res.status(200).json({
    success: true,
    message: result.message,
    data: result.school,
  });
});



