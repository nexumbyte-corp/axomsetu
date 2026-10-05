import { z } from 'zod';

export const addFundSchema = z.object({
  fundSourceId: z.string().uuid('Valid fund source ID is required'),
  transactionDate: z.string().min(1, 'Transaction date is required'),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, 'Amount must be greater than zero'),
  paymentMode: z
    .enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DEMAND_DRAFT', 'POS', 'OTHER'])
    .optional()
    .default('BANK_TRANSFER'),
  referenceNumber: z.string().trim().max(100, 'Reference number must not exceed 100 characters').optional().nullable(),
  remarks: z.string().trim().max(500, 'Remarks must not exceed 500 characters').optional().nullable(),
  academicYearId: z.string().uuid('Invalid academic year ID').optional().nullable(),
});

export const cancelFundSchema = z.object({
  reason: z.string().trim().max(300, 'Cancellation reason must not exceed 300 characters').optional().nullable(),
});

export const createFundSourceSchema = z.object({
  name: z
    .string({ required_error: 'Fund source name is required' })
    .trim()
    .min(2, 'Fund source name must be at least 2 characters')
    .max(100, 'Fund source name must not exceed 100 characters'),
  description: z.string().trim().max(300, 'Description must not exceed 300 characters').optional().nullable(),
});

export const updateFundSourceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Fund source name must be at least 2 characters')
    .max(100, 'Fund source name must not exceed 100 characters')
    .optional(),
  description: z.string().trim().max(300, 'Description must not exceed 300 characters').optional().nullable(),
});
