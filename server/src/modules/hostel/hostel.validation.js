import { z } from 'zod';

const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const uuidSchema = z.string().regex(uuidPattern, { message: 'Invalid UUID format' });

export const createHostelSchema = z.object({
  name: z.string().trim().min(2, 'Hostel name must be at least 2 characters').max(100, 'Hostel name must not exceed 100 characters'),
  code: z.string().trim().max(50, 'Hostel code must not exceed 50 characters').optional().nullable(),
  type: z.enum(['BOYS', 'GIRLS', 'COMBINED']).default('COMBINED'),
  description: z.string().trim().max(300, 'Description must not exceed 300 characters').optional().nullable(),
  address: z.string().trim().max(300, 'Address must not exceed 300 characters').optional().nullable(),
});

export const updateHostelSchema = z.object({
  name: z.string().trim().min(2, 'Hostel name must be at least 2 characters').max(100, 'Hostel name must not exceed 100 characters').optional(),
  code: z.string().trim().max(50, 'Hostel code must not exceed 50 characters').optional().nullable(),
  type: z.enum(['BOYS', 'GIRLS', 'COMBINED']).optional(),
  description: z.string().trim().max(300, 'Description must not exceed 300 characters').optional().nullable(),
  address: z.string().trim().max(300, 'Address must not exceed 300 characters').optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createRoomSchema = z.object({
  hostelId: uuidSchema,
  roomNumber: z.string().trim().min(1, 'Room number is required').max(50, 'Room number must not exceed 50 characters'),
  floor: z.string().trim().max(50, 'Floor must not exceed 50 characters').optional().nullable(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100, 'Capacity must not exceed 100').default(1),
  roomType: z.string().trim().max(50, 'Room type must not exceed 50 characters').optional().nullable(),
});

export const updateRoomSchema = z.object({
  roomNumber: z.string().trim().min(1, 'Room number is required').max(50, 'Room number must not exceed 50 characters').optional(),
  floor: z.string().trim().max(50, 'Floor must not exceed 50 characters').optional().nullable(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(100, 'Capacity must not exceed 100').optional(),
  roomType: z.string().trim().max(50, 'Room type must not exceed 50 characters').optional().nullable(),
  isActive: z.boolean().optional(),
});

export const bulkCreateRoomsSchema = z.object({
  hostelId: uuidSchema,
  startRoomNumber: z.number().int().min(1, 'Start room number must be at least 1').max(9999, 'Start room number must not exceed 9999').default(101),
  count: z.number().int().min(1, 'Count must be at least 1').max(50, 'Cannot bulk create more than 50 rooms at once'),
  prefix: z.string().trim().max(20, 'Prefix must not exceed 20 characters').optional().default(''),
  floor: z.string().trim().max(50, 'Floor must not exceed 50 characters').optional().nullable(),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(20, 'Capacity must not exceed 20').default(2),
  roomType: z.string().trim().max(50, 'Room type must not exceed 50 characters').optional().default('Non-AC'),
});

export const createBedSchema = z.object({
  hostelId: uuidSchema,
  roomId: uuidSchema,
  bedNumber: z.string().trim().min(1, 'Bed number is required').max(50, 'Bed number must not exceed 50 characters'),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED']).default('AVAILABLE'),
});

export const bulkCreateBedsSchema = z.object({
  hostelId: uuidSchema,
  roomId: uuidSchema,
  count: z.number().int().min(1).max(100, 'Cannot bulk create more than 100 beds at once'),
  prefix: z.string().trim().max(30, 'Prefix must not exceed 30 characters').optional().default('Bed'),
});

export const updateBedStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'BLOCKED']),
});

export const saveFeeConfigSchema = z.object({
  academicYearId: uuidSchema,
  hostelId: uuidSchema.optional().nullable(),
  admissionFeeEnabled: z.boolean().default(false),
  admissionFeeAmount: z.number().min(0, 'Admission fee amount must be non-negative').max(10000000, 'Admission fee must not exceed 10,000,000').default(0),
  monthlyFeeEnabled: z.boolean().default(false),
  monthlyFeeAmount: z.number().min(0, 'Monthly fee amount must be non-negative').max(10000000, 'Monthly fee must not exceed 10,000,000').default(0),
});

export const admitStudentSchema = z.object({
  academicYearId: uuidSchema,
  studentId: uuidSchema,
  hostelId: uuidSchema,
  roomId: uuidSchema,
  bedId: uuidSchema,
  startDate: z.string().min(1, 'Start date is required'),
  admissionFeeOverride: z.number().min(0).max(10000000, 'Admission fee override must not exceed 10,000,000').optional().nullable(),
  monthlyFeeOverride: z.number().min(0).max(10000000, 'Monthly fee override must not exceed 10,000,000').optional().nullable(),
  monthlyFeeApplied: z.number().min(0).max(10000000, 'Monthly fee applied must not exceed 10,000,000').optional().nullable(),
});

export const transferStudentSchema = z.object({
  enrollmentId: uuidSchema,
  toHostelId: uuidSchema,
  toRoomId: uuidSchema,
  toBedId: uuidSchema,
  transferDate: z.string().optional(),
  reason: z.string().trim().max(300, 'Reason must not exceed 300 characters').optional().nullable(),
});

export const exitStudentSchema = z.object({
  enrollmentId: uuidSchema,
  exitDate: z.string().min(1, 'Exit date is required'),
  reason: z.string().trim().max(300, 'Reason must not exceed 300 characters').optional().nullable(),
});

export const studentFeeItemSchema = z.object({
  studentId: uuidSchema,
  studentEnrollmentId: uuidSchema.optional().nullable(),
  appliedFee: z.number().min(0, 'Applied fee must be non-negative').max(10000000, 'Applied fee must not exceed 10,000,000'),
  defaultFee: z.number().min(0).max(10000000, 'Default fee must not exceed 10,000,000').optional(),
  isWaived: z.boolean().optional(),
  reason: z.string().trim().max(300, 'Reason must not exceed 300 characters').optional().nullable(),
});

export const generateHostelFeesSchema = z.object({
  academicYearId: uuidSchema,
  month: z.enum([
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ]),
  hostelId: uuidSchema.optional().nullable(),
  students: z.array(studentFeeItemSchema).max(500, 'Cannot generate fees for more than 500 students at once').optional().default([]),
});

