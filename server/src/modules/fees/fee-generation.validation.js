import { z } from 'zod';

const FEE_MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

const GENERATION_MODES = ['ENTIRE_SCHOOL', 'BY_CLASS', 'BY_STUDENT'];

const customFeeHeadSchema = z.object({
  feeTypeId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1, 'Fee head title is required').max(100, 'Fee head title must not exceed 100 characters'),
  amount: z.number().min(0, 'Amount cannot be negative').max(10000000, 'Amount must not exceed 10,000,000'),
  enabled: z.boolean().default(true),
  isTemporary: z.boolean().default(false),
});

export const feeGenerationSchema = z.object({
  academicYearId: z.string().uuid('Invalid academic year ID'),
  month: z.enum(FEE_MONTHS, { errorMap: () => ({ message: 'Invalid month selected' }) }),
  mode: z.enum(GENERATION_MODES, { errorMap: () => ({ message: 'Invalid generation mode' }) }),
  classId: z.string().uuid().optional().nullable(),
  mediumId: z.string().uuid().optional().nullable(),
  streamId: z.string().uuid().optional().nullable(),
  sectionId: z.string().uuid().optional().nullable(),
  studentId: z.string().uuid().optional().nullable(),
  customFeeHeads: z.array(customFeeHeadSchema).max(50, 'Cannot add more than 50 custom fee heads').optional(),
});

export const queryHistorySchema = z.object({
  academicYearId: z.string().uuid().optional(),
  month: z.enum(FEE_MONTHS).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => !isNaN(val) && val > 0 && val <= 10000, 'Page must be between 1 and 10000'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .refine((val) => !isNaN(val) && val > 0 && val <= 100, 'Limit must be between 1 and 100'),
});
