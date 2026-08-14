import { z } from 'zod';

export const createFeeTypeSchema = z.object({
  name: z.string().trim().min(1, 'Fee type name is required').max(100),
  code: z.string().trim().max(50).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  order: z.number().int().min(0).default(0),
  category: z.enum(['ACADEMIC', 'HOSTEL']).default('ACADEMIC'),
  billingRule: z.enum(['ONE_TIME_PER_ACADEMIC_YEAR', 'MONTHLY']).default('MONTHLY'),
  feeCategory: z.enum(['ACADEMIC', 'HOSTEL']).optional(),
  isActive: z.boolean().default(true),
});

export const updateFeeTypeSchema = createFeeTypeSchema.partial();

export const queryFeeTypeSchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().trim().optional(),
});
