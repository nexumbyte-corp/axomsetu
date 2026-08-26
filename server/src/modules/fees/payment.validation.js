import { z } from 'zod';

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DEMAND_DRAFT'];

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

const chargeSelectionSchema = z
  .object({
    chargeId: z.string().uuid('Invalid charge ID'),
    amount: z.number().positive('Allocated amount must be greater than zero').max(10000000, 'Amount must not exceed 10,000,000').optional(),
    allocatedAmount: z.number().positive('Allocated amount must be greater than zero').max(10000000, 'Amount must not exceed 10,000,000').optional(),
  })
  .refine((data) => data.amount !== undefined || data.allocatedAmount !== undefined, {
    message: 'Either amount or allocatedAmount must be provided for each charge',
  });

export const createPaymentSchema = z
  .object({
    studentId: z.string().uuid('Invalid student ID'),
    paymentMode: z.enum(PAYMENT_MODES, {
      errorMap: () => ({ message: 'Invalid payment mode selected' }),
    }),
    paymentDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    remarks: z.string().trim().max(300, 'Remarks cannot exceed 300 characters').optional().nullable(),
    referenceNumber: z.string().trim().max(100, 'Reference number cannot exceed 100 characters').optional().nullable(),
    referenceNo: z.string().trim().max(100, 'Reference number cannot exceed 100 characters').optional().nullable(),
    receivedAmount: z.number().positive('Received amount must be greater than zero').max(10000000, 'Received amount must not exceed 10,000,000').optional(),
    charges: z.array(chargeSelectionSchema).max(100, 'Cannot include more than 100 charges in a single payment').optional(),
    allocations: z.array(chargeSelectionSchema).max(100, 'Cannot include more than 100 allocations in a single payment').optional(),
  })
  .refine(
    (data) => (data.charges && data.charges.length > 0) || (data.allocations && data.allocations.length > 0),
    {
      message: 'At least one charge allocation is required',
    }
  )
  .refine(
    (data) => {
      const isCash = data.paymentMode === 'CASH';
      const ref = data.referenceNumber || data.referenceNo;
      if (!isCash && (!ref || ref.trim().length === 0)) {
        return false;
      }
      return true;
    },
    (data) => ({
      message: `Reference number is required for payment mode ${data.paymentMode}`,
      path: ['referenceNumber'],
    })
  );

export const paymentParamsSchema = z.object({
  id: z.string().uuid('Invalid payment ID'),
});

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(3, 'A reason for voiding this receipt is required (minimum 3 characters)').max(300, 'Reason cannot exceed 300 characters'),
});

export const ledgerQuerySchema = z.object({
  academicYearId: z.string().uuid('Invalid academic year ID').optional(),
});

export const queryPaymentSchema = z.object({
  search: z.string().trim().max(100, 'Search query must not exceed 100 characters').optional(),
  studentId: z.string().uuid('Invalid student ID').optional(),
  academicYearId: z.string().uuid('Invalid academic year ID').optional(),
  month: z.enum(FEE_MONTHS).optional(),
  paymentMode: z.enum(PAYMENT_MODES).optional(),
  status: z.enum(['SUCCESS', 'VOID']).optional(),
  classId: z.string().uuid('Invalid class ID').optional(),
  sectionId: z.string().uuid('Invalid section ID').optional(),
  mediumId: z.string().uuid('Invalid medium ID').optional(),
  streamId: z.string().uuid('Invalid stream ID').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  collectedById: z.string().uuid('Invalid collectedById').optional(),
  sortBy: z.enum(['paymentDate', 'receiptNumber', 'receivedAmount', 'createdAt', 'studentName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
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

export const receiptSearchSchema = z.object({
  q: z.string().trim().max(100, 'Search query must not exceed 100 characters').optional(),
  receiptNumber: z.string().trim().max(50, 'Receipt number must not exceed 50 characters').optional(),
  academicYearId: z.string().uuid('Invalid academic year ID').optional(),
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
