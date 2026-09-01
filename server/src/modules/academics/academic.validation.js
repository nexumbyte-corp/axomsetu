import { z } from 'zod';

// ==========================================
// CLASS SCHEMAS
// ==========================================
export const createClassSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Class name is required').max(50, 'Class name must not exceed 50 characters'),
    order: z.number().int().min(1, 'Sort order must be a positive integer').max(1000, 'Sort order must not exceed 1000').optional(),
    hasStream: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const updateClassSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Class name cannot be empty').max(50, 'Class name must not exceed 50 characters').optional(),
    order: z.number().int().min(1, 'Sort order must be a positive integer').max(1000, 'Sort order must not exceed 1000').optional(),
    hasStream: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const classIdParamSchema = {
  params: z.object({
    classId: z.string().uuid('Invalid class ID format'),
  }),
};

export const bulkDeleteClassesSchema = {
  body: z.object({
    classIds: z
      .array(z.string().uuid('Invalid class ID format'))
      .min(1, 'At least one class ID must be provided')
      .max(100, 'Cannot bulk delete more than 100 classes at once'),
  }),
};

// ==========================================
// MEDIUM SCHEMAS
// ==========================================
export const createMediumSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Medium name is required').max(50, 'Medium name must not exceed 50 characters'),
    isActive: z.boolean().optional(),
  }),
};

export const updateMediumSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Medium name cannot be empty').max(50, 'Medium name must not exceed 50 characters').optional(),
    isActive: z.boolean().optional(),
  }),
};

export const mediumIdParamSchema = {
  params: z.object({
    mediumId: z.string().uuid('Invalid medium ID format'),
  }),
};

// ==========================================
// SECTION SCHEMAS
// ==========================================
export const createSectionSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Section name is required').max(50, 'Section name must not exceed 50 characters'),
    isActive: z.boolean().optional(),
  }),
};

export const updateSectionSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Section name cannot be empty').max(50, 'Section name must not exceed 50 characters').optional(),
    isActive: z.boolean().optional(),
  }),
};

export const sectionIdParamSchema = {
  params: z.object({
    sectionId: z.string().uuid('Invalid section ID format'),
  }),
};

// ==========================================
// STREAM SCHEMAS
// ==========================================
export const createStreamSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Stream name is required').max(50, 'Stream name must not exceed 50 characters'),
    isActive: z.boolean().optional(),
  }),
};

export const updateStreamSchema = {
  body: z.object({
    name: z.string().trim().min(1, 'Stream name cannot be empty').max(50, 'Stream name must not exceed 50 characters').optional(),
    isActive: z.boolean().optional(),
  }),
};

export const streamIdParamSchema = {
  params: z.object({
    streamId: z.string().uuid('Invalid stream ID format'),
  }),
};
