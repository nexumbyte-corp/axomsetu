import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiError } from '../../utils/ApiError.js';
import { compressAndUploadLogo } from '../../services/cloudinary.service.js';
import * as studentService from './student.service.js';
import {
  bulkPromoteStudentsSchema,
  createStudentSchema,
  promoteStudentSchema,
  updateEnrollmentSchema,
  updateStudentProfileSchema,
  updateStudentStatusSchema,
} from './student.validation.js';

export const uploadStudentPhoto = asyncHandler(async (req, res) => {
  if (!req.file || !req.file.buffer) {
    throw ApiError.badRequest('Please upload an image file');
  }

  const uploadResult = await compressAndUploadLogo(req.file.buffer, req.file.mimetype, 'school_saas/students');

  res.status(200).json({
    success: true,
    message: `Photo uploaded successfully (${(uploadResult.bytes / 1024).toFixed(2)} KB)`,
    data: {
      photoUrl: uploadResult.secure_url,
      sizeKb: (uploadResult.bytes / 1024).toFixed(2),
    },
  });
});

export const createStudent = asyncHandler(async (req, res) => {
  const validatedBody = createStudentSchema.parse(req.body);
  const result = await studentService.createStudent(req.schoolId, validatedBody, req.user?.id, req.user?.role);

  res.status(201).json({
    success: true,
    message: 'Student created successfully',
    data: result,
  });
});

export const listStudents = asyncHandler(async (req, res) => {
  const result = await studentService.listStudents(req.schoolId, req.query);

  res.status(200).json({
    success: true,
    message: 'Students retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

export const getStudentDetails = asyncHandler(async (req, res) => {
  const academicYearId = req.query.academicYearId || null;
  const result = await studentService.getStudentById(req.schoolId, req.params.studentId, academicYearId);

  res.status(200).json({
    success: true,
    message: 'Student details retrieved successfully',
    data: result,
  });
});

export const updateStudentProfile = asyncHandler(async (req, res) => {
  const validatedBody = updateStudentProfileSchema.parse(req.body);
  const result = await studentService.updateStudentProfile(req.schoolId, req.params.studentId, validatedBody, req.user?.id);

  res.status(200).json({
    success: true,
    message: 'Student profile updated successfully',
    data: result,
  });
});

export const updateStudentStatus = asyncHandler(async (req, res) => {
  const validatedBody = updateStudentStatusSchema.parse(req.body);
  const result = await studentService.updateStudentStatus(req.schoolId, req.params.studentId, validatedBody.status, req.user?.id);

  res.status(200).json({
    success: true,
    message: 'Student status updated successfully',
    data: result,
  });
});

export const updateEnrollment = asyncHandler(async (req, res) => {
  const validatedBody = updateEnrollmentSchema.parse(req.body);
  const result = await studentService.updateEnrollment(
    req.schoolId,
    req.params.studentId,
    req.params.enrollmentId,
    validatedBody,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: 'Student enrollment updated successfully',
    data: result,
  });
});

export const promoteStudent = asyncHandler(async (req, res) => {
  const validatedBody = promoteStudentSchema.parse(req.body);
  const result = await studentService.promoteStudent(req.schoolId, req.params.studentId, validatedBody, req.user?.id);

  res.status(200).json({
    success: true,
    message: result.message,
    data: result.targetEnrollment || result.student || result,
  });
});

export const bulkPromoteStudents = asyncHandler(async (req, res) => {
  const validatedBody = bulkPromoteStudentsSchema.parse(req.body);
  const result = await studentService.bulkPromoteStudents(req.schoolId, validatedBody, req.user?.id);

  res.status(200).json({
    success: true,
    message: `${result.promotedCount} student(s) promoted successfully`,
    data: result,
  });
});

export const deleteStudentHard = asyncHandler(async (req, res) => {
  const result = await studentService.deleteStudentHard(req.schoolId, req.params.studentId, req.user?.id);

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

