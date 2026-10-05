import { z } from 'zod';

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid('Valid expense category ID is required'),
  expenseDate: z.string().min(1, 'Expense date is required'),
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val > 0, 'Amount must be greater than zero'),
  paymentMode: z
    .enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DEMAND_DRAFT', 'POS', 'OTHER'])
    .optional()
    .default('CASH'),
  referenceNumber: z.string().trim().max(100, 'Reference number must not exceed 100 characters').optional().nullable(),
  referenceNo: z.string().trim().max(100, 'Reference number must not exceed 100 characters').optional().nullable(),
  description: z.string().trim().max(500, 'Description must not exceed 500 characters').optional().nullable(),
  academicYearId: z.string().uuid('Invalid academic year ID').optional().nullable(),
});

export const cancelExpenseSchema = z.object({
  reason: z.string().trim().max(300, 'Cancellation reason must not exceed 300 characters').optional().nullable(),
});

export const createExpenseCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must not exceed 100 characters'),
  description: z.string().trim().max(300, 'Description must not exceed 300 characters').optional().nullable(),
});

export const updateExpenseCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be at least 2 characters')
    .max(100, 'Category name must not exceed 100 characters')
    .optional(),
  description: z.string().trim().max(300, 'Description must not exceed 300 characters').optional().nullable(),
});
