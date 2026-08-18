import { z } from 'zod';

const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const uuidSchema = z.string().regex(uuidPattern, { message: 'Invalid UUID format' });

export const createHostelSchema = z.object({
  name: z.string().trim().min(1, 'Hostel name is required'),
  code: z.string().trim().optional().nullable(),
  type: z.enum(['BOYS', 'GIRLS', 'COMBINED']).default('COMBINED'),
  description: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
});

export const updateHostelSchema = z.object({
  name: z.string().trim().min(1, 'Hostel name is required').optional(),
  code: z.string().trim().optional().nullable(),
  type: z.enum(['BOYS', 'GIRLS', 'COMBINED']).optional(),
  description: z.string().trim().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createRoomSchema = z.object({
  hostelId: uuidSchema,
  roomNumber: z.string().trim().min(1, 'Room number is required'),
  floor: z.string().trim().optional().nullable(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').default(1),
  roomType: z.string().trim().optional().nullable(),
});

export const updateRoomSchema = z.object({
  roomNumber: z.string().trim().min(1, 'Room number is required').optional(),
  floor: z.string().trim().optional().nullable(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').optional(),
  roomType: z.string().trim().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createBedSchema = z.object({
  hostelId: uuidSchema,
  roomId: uuidSchema,
  bedNumber: z.string().trim().min(1, 'Bed number is required'),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED']).default('AVAILABLE'),
});

export const bulkCreateBedsSchema = z.object({
  hostelId: uuidSchema,
  roomId: uuidSchema,
  count: z.number().int().min(1).max(100, 'Cannot bulk create more than 100 beds at once'),
  prefix: z.string().trim().optional().default('Bed'),
});

export const updateBedStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED']),
});

export const saveFeeConfigSchema = z.object({
  academicYearId: uuidSchema,
  hostelId: uuidSchema.optional().nullable(),
  admissionFeeEnabled: z.boolean().default(false),
  admissionFeeAmount: z.number().min(0, 'Admission fee amount must be non-negative').default(0),
  monthlyFeeEnabled: z.boolean().default(false),
  monthlyFeeAmount: z.number().min(0, 'Monthly fee amount must be non-negative').default(0),
});

export const admitStudentSchema = z.object({
  academicYearId: uuidSchema,
  studentId: uuidSchema,
  hostelId: uuidSchema,
  roomId: uuidSchema,
  bedId: uuidSchema,
  startDate: z.string().min(1, 'Start date is required'),
  admissionFeeOverride: z.number().min(0).optional().nullable(),
  monthlyFeeOverride: z.number().min(0).optional().nullable(),
  monthlyFeeApplied: z.number().min(0).optional().nullable(),
});

export const transferStudentSchema = z.object({
  enrollmentId: uuidSchema,
  toHostelId: uuidSchema,
  toRoomId: uuidSchema,
  toBedId: uuidSchema,
  transferDate: z.string().optional(),
  reason: z.string().trim().optional().nullable(),
});

export const exitStudentSchema = z.object({
  enrollmentId: uuidSchema,
  exitDate: z.string().min(1, 'Exit date is required'),
  reason: z.string().trim().optional().nullable(),
});

export const studentFeeItemSchema = z.object({
  studentId: uuidSchema,
  studentEnrollmentId: uuidSchema.optional().nullable(),
  appliedFee: z.number().min(0, 'Applied fee must be non-negative'),
  defaultFee: z.number().min(0).optional(),
  isWaived: z.boolean().optional(),
  reason: z.string().trim().optional().nullable(),
});

export const generateHostelFeesSchema = z.object({
  academicYearId: uuidSchema,
  month: z.enum([
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ]),
  hostelId: uuidSchema.optional().nullable(),
  students: z.array(studentFeeItemSchema).optional().default([]),
});

