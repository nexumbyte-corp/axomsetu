import { z } from 'zod';

export const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DEMAND_DRAFT'];

export const FEE_MONTHS = [
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

export const chargeSelectionSchema = z
  .object({
    chargeId: z.string().uuid('Invalid charge ID'),
    amount: z.number().positive('Allocated amount must be greater than zero').optional(),
    allocatedAmount: z.number().positive('Allocated amount must be greater than zero').optional(),
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
    remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional().nullable(),
    referenceNumber: z.string().trim().max(100, 'Reference number cannot exceed 100 characters').optional().nullable(),
    referenceNo: z.string().trim().max(100, 'Reference number cannot exceed 100 characters').optional().nullable(),
    receivedAmount: z.number().positive('Received amount must be greater than zero').optional(),
    charges: z.array(chargeSelectionSchema).optional(),
    allocations: z.array(chargeSelectionSchema).optional(),
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
  reason: z.string().trim().min(3, 'A reason for voiding this receipt is required (minimum 3 characters)').max(500, 'Reason cannot exceed 500 characters'),
});

export const ledgerQuerySchema = z.object({
  academicYearId: z.string().uuid('Invalid academic year ID').optional(),
});

export const queryPaymentSchema = z.object({
  search: z.string().optional(),
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
  page: z.string().optional(),
  limit: z.string().optional(),
});

export const receiptSearchSchema = z.object({
  q: z.string().optional(),
  receiptNumber: z.string().optional(),
  academicYearId: z.string().uuid('Invalid academic year ID').optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
