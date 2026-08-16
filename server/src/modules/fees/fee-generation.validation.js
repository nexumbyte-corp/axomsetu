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
  title: z.string().trim().min(1, 'Fee head title is required'),
  amount: z.number().min(0, 'Amount cannot be negative'),
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
  customFeeHeads: z.array(customFeeHeadSchema).optional(),
});

export const queryHistorySchema = z.object({
  academicYearId: z.string().uuid().optional(),
  month: z.enum(FEE_MONTHS).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
