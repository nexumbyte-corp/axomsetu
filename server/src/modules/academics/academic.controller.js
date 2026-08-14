import { asyncHandler } from '../../utils/asyncHandler.js';
import * as academicService from './academic.service.js';

// ==========================================
// CLASSES CONTROLLERS
// ==========================================
export const getClasses = asyncHandler(async (req, res) => {
  const result = await academicService.listClasses(req.schoolId);

  res.status(200).json({
    success: true,
    message: 'Classes retrieved successfully',
    data: result,
  });
});

export const addClass = asyncHandler(async (req, res) => {
  const result = await academicService.createClass(req.schoolId, req.body, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Class created successfully',
    data: result,
  });
});

export const updateClass = asyncHandler(async (req, res) => {
  const result = await academicService.updateClass(
    req.schoolId,
    req.params.classId,
    req.body,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: 'Class updated successfully',
    data: result,
  });
});

export const deleteClass = asyncHandler(async (req, res) => {
  const result = await academicService.deleteClass(
    req.schoolId,
    req.params.classId,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: 'Class deleted successfully',
    data: result,
  });
});

// ==========================================
// MEDIUMS CONTROLLERS
// ==========================================
export const getMediums = asyncHandler(async (req, res) => {
  const result = await academicService.listMediums(req.schoolId);

  res.status(200).json({
    success: true,
    message: 'Mediums retrieved successfully',
    data: result,
  });
});

export const addMedium = asyncHandler(async (req, res) => {
  const result = await academicService.createMedium(req.schoolId, req.body, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Medium created successfully',
    data: result,
  });
});

export const updateMedium = asyncHandler(async (req, res) => {
  const result = await academicService.updateMedium(
    req.schoolId,
    req.params.mediumId,
    req.body,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: 'Medium updated successfully',
    data: result,
  });
});

// ==========================================
// SECTIONS CONTROLLERS
// ==========================================
export const getSections = asyncHandler(async (req, res) => {
  const result = await academicService.listSections(req.schoolId);

  res.status(200).json({
    success: true,
    message: 'Sections retrieved successfully',
    data: result,
  });
});

export const addSection = asyncHandler(async (req, res) => {
  const result = await academicService.createSection(req.schoolId, req.body, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Section created successfully',
    data: result,
  });
});

export const updateSection = asyncHandler(async (req, res) => {
  const result = await academicService.updateSection(
    req.schoolId,
    req.params.sectionId,
    req.body,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: 'Section updated successfully',
    data: result,
  });
});

// ==========================================
// STREAMS CONTROLLERS
// ==========================================
export const getStreams = asyncHandler(async (req, res) => {
  const result = await academicService.listStreams(req.schoolId);

  res.status(200).json({
    success: true,
    message: 'Streams retrieved successfully',
    data: result,
  });
});

export const addStream = asyncHandler(async (req, res) => {
  const result = await academicService.createStream(req.schoolId, req.body, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Stream created successfully',
    data: result,
  });
});

export const updateStream = asyncHandler(async (req, res) => {
  const result = await academicService.updateStream(
    req.schoolId,
    req.params.streamId,
    req.body,
    req.user?.id
  );

  res.status(200).json({
    success: true,
    message: 'Stream updated successfully',
    data: result,
  });
});
