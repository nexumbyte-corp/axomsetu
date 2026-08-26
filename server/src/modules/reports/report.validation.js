import { z } from 'zod';

export const genericReportQuerySchema = z.object({
  academicYearId: z.string().optional().or(z.literal('')),
  classId: z.string().optional().or(z.literal('')),
  sectionId: z.string().optional().or(z.literal('')),
  mediumId: z.string().optional().or(z.literal('')),
  streamId: z.string().optional().or(z.literal('')),
  studentId: z.string().optional().or(z.literal('')),
  staffId: z.string().optional().or(z.literal('')),
  categoryId: z.string().optional().or(z.literal('')),
  fundSourceId: z.string().optional().or(z.literal('')),
  feeTypeId: z.string().optional().or(z.literal('')),
  status: z.string().trim().max(50).optional().or(z.literal('')),
  search: z.string().trim().max(100, 'Search query must not exceed 100 characters').optional().or(z.literal('')),
  month: z.string().trim().max(20).optional().or(z.literal('')),
  year: z.string().trim().max(4).optional().or(z.literal('')),
  department: z.string().trim().max(100).optional().or(z.literal('')),
  designation: z.string().trim().max(100).optional().or(z.literal('')),
  role: z.string().trim().max(50).optional().or(z.literal('')),
  paymentMode: z.string().trim().max(50).optional().or(z.literal('')),
  type: z.string().trim().max(50).optional().or(z.literal('')),
  transactionType: z.string().trim().max(50).optional().or(z.literal('')),
  sourceType: z.string().trim().max(50).optional().or(z.literal('')),
  action: z.string().trim().max(50).optional().or(z.literal('')),
  entityType: z.string().trim().max(50).optional().or(z.literal('')),
  userId: z.string().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  date: z.string().optional().or(z.literal('')),
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

