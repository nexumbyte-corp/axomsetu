import { z } from 'zod';

export const createFeeTypeSchema = z.object({
  name: z.string().trim().min(2, 'Fee type name must be at least 2 characters').max(100, 'Fee type name must not exceed 100 characters'),
  code: z.string().trim().max(50, 'Fee type code must not exceed 50 characters').optional().nullable(),
  description: z.string().trim().max(300, 'Description must not exceed 300 characters').optional().nullable(),
  order: z.number().int().min(0, 'Order must be a non-negative integer').max(1000, 'Order must not exceed 1000').default(0),
  category: z.enum(['ACADEMIC', 'HOSTEL']).default('ACADEMIC'),
  billingRule: z.enum(['ONE_TIME_PER_ACADEMIC_YEAR', 'MONTHLY']).default('MONTHLY'),
  feeCategory: z.enum(['ACADEMIC', 'HOSTEL']).optional(),
  isActive: z.boolean().default(true),
});

export const updateFeeTypeSchema = createFeeTypeSchema.partial();

export const queryFeeTypeSchema = z.object({
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().trim().max(100, 'Search query must not exceed 100 characters').optional(),
});
