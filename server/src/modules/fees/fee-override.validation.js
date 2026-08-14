import { z } from 'zod';

export const upsertFeeOverrideSchema = z.object({
  academicYearId: z.string().uuid('Invalid academic year ID'),
  feeTypeId: z.string().uuid('Invalid fee type ID'),
  amount: z.number().min(0, 'Amount cannot be negative'),
  isActive: z.boolean().default(true),
});

export const queryFeeOverrideSchema = z.object({
  academicYearId: z.string().uuid('Invalid academic year ID').optional(),
});
