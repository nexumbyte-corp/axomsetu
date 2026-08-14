import { z } from 'zod';

// ==========================================
// CLASS SCHEMAS
// ==========================================
export const createClassSchema = {
  body: z.object({
    name: z.string().min(1, 'Class name is required').trim(),
    order: z.number().int().min(1, 'Sort order must be a positive integer').optional(),
    hasStream: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const updateClassSchema = {
  body: z.object({
    name: z.string().min(1, 'Class name cannot be empty').trim().optional(),
    order: z.number().int().min(1, 'Sort order must be a positive integer').optional(),
    hasStream: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const classIdParamSchema = {
  params: z.object({
    classId: z.string().uuid('Invalid class ID format'),
  }),
};

// ==========================================
// MEDIUM SCHEMAS
// ==========================================
export const createMediumSchema = {
  body: z.object({
    name: z.string().min(1, 'Medium name is required').trim(),
    isActive: z.boolean().optional(),
  }),
};

export const updateMediumSchema = {
  body: z.object({
    name: z.string().min(1, 'Medium name cannot be empty').trim().optional(),
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
    name: z.string().min(1, 'Section name is required').trim(),
    isActive: z.boolean().optional(),
  }),
};

export const updateSectionSchema = {
  body: z.object({
    name: z.string().min(1, 'Section name cannot be empty').trim().optional(),
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
    name: z.string().min(1, 'Stream name is required').trim(),
    isActive: z.boolean().optional(),
  }),
};

export const updateStreamSchema = {
  body: z.object({
    name: z.string().min(1, 'Stream name cannot be empty').trim().optional(),
    isActive: z.boolean().optional(),
  }),
};

export const streamIdParamSchema = {
  params: z.object({
    streamId: z.string().uuid('Invalid stream ID format'),
  }),
};
