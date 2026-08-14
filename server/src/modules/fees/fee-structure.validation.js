import { z } from 'zod';

const feeHeadSchema = z.object({
  feeTypeId: z.string().uuid('Invalid fee type ID'),
  amount: z.number().min(0, 'Amount cannot be negative'),
  isActive: z.boolean().default(true),
});

const validateUniqueFeeTypes = (heads) => {
  if (!heads) return true;
  const seen = new Set();
  for (const head of heads) {
    if (seen.has(head.feeTypeId)) return false;
    seen.add(head.feeTypeId);
  }
  return true;
};

export const createFeeStructureSchema = z
  .object({
    academicYearId: z.string().uuid('Invalid academic year ID'),
    classId: z.string().uuid('Invalid class ID'),
    mediumId: z.string().uuid('Invalid medium ID'),
    streamId: z.string().uuid('Invalid stream ID').optional().nullable(),
    isActive: z.boolean().default(true),
    heads: z.array(feeHeadSchema).min(1, 'At least one fee head is required'),
  })
  .refine((data) => validateUniqueFeeTypes(data.heads), {
    message: 'Duplicate fee items cannot be added within the same fee structure',
    path: ['heads'],
  });

export const updateFeeStructureSchema = z
  .object({
    classId: z.string().uuid('Invalid class ID').optional(),
    mediumId: z.string().uuid('Invalid medium ID').optional(),
    streamId: z.string().uuid('Invalid stream ID').optional().nullable(),
    isActive: z.boolean().optional(),
    heads: z.array(feeHeadSchema).optional(),
  })
  .refine((data) => validateUniqueFeeTypes(data.heads), {
    message: 'Duplicate fee items cannot be added within the same fee structure',
    path: ['heads'],
  });

export const queryFeeStructureSchema = z.object({
  academicYearId: z.string().uuid('Invalid academic year ID').optional(),
  classId: z.string().uuid('Invalid class ID').optional(),
  mediumId: z.string().uuid('Invalid medium ID').optional(),
  streamId: z.string().uuid('Invalid stream ID').optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export const bulkCreateFeeStructureSchema = z.object({
  targetAcademicYearId: z.string().uuid('Invalid target academic year ID'),
  structures: z
    .array(
      z
        .object({
          classId: z.string().uuid('Invalid class ID'),
          mediumId: z.string().uuid('Invalid medium ID'),
          streamId: z.string().uuid('Invalid stream ID').optional().nullable(),
          isActive: z.boolean().default(true),
          heads: z.array(feeHeadSchema).min(1, 'At least one fee head is required'),
        })
        .refine((data) => validateUniqueFeeTypes(data.heads), {
          message: 'Duplicate fee items cannot be added within the same fee structure',
          path: ['heads'],
        })
    )
    .min(1, 'At least one fee structure is required'),
});
