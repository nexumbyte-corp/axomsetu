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

const STAFF_ROLES = [
  'TEACHER',
  'ADMINISTRATOR',
  'ACCOUNTANT',
  'LIBRARIAN',
  'DRIVER',
  'SUPPORT_STAFF',
  'OTHER',
];

const STAFF_STATUSES = ['ACTIVE', 'INACTIVE', 'RESIGNED', 'ON_LEAVE'];

const PAYMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'DEMAND_DRAFT'];

export const createStaffSchema = z.object({
  employeeId: z.string().trim().optional().or(z.literal('')),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  role: z.enum(STAFF_ROLES).default('TEACHER'),
  department: z.string().trim().optional().or(z.literal('')),
  designation: z.string().trim().optional().or(z.literal('')),
  joiningDate: z.string().optional().or(z.literal('')),
  baseSalary: z.coerce.number().min(0, 'Base salary must be non-negative').default(0),
  bankName: z.string().trim().optional().or(z.literal('')),
  bankAccountNo: z.string().trim().optional().or(z.literal('')),
  ifscCode: z.string().trim().optional().or(z.literal('')),
});

export const updateStaffSchema = createStaffSchema.partial().extend({
  status: z.enum(STAFF_STATUSES).optional(),
});

export const disburseAdvanceSchema = z.object({
  amount: z.coerce.number().positive('Advance amount must be greater than 0'),
  advanceDate: z.string().min(1, 'Advance date is required'),
  paymentMode: z.enum(PAYMENT_MODES).default('CASH'),
  referenceNo: z.string().trim().optional().or(z.literal('')),
  remarks: z.string().trim().optional().or(z.literal('')),
});

export const recordSalaryPaymentSchema = z.object({
  staffId: z.string().uuid('Invalid staff ID'),
  academicYearId: z.string().uuid().optional().nullable(),
  months: z.array(z.enum(FEE_MONTHS)).min(1, 'Select at least one month'),
  year: z.coerce.number().int().min(2000).max(2100),
  allowances: z.coerce.number().min(0).default(0),
  deductions: z.coerce.number().min(0).default(0),
  advanceDeducted: z.coerce.number().min(0).default(0),
  paymentMode: z.enum(PAYMENT_MODES).default('CASH'),
  referenceNo: z.string().trim().optional().or(z.literal('')),
  remarks: z.string().trim().optional().or(z.literal('')),
  paymentDate: z.string().optional(),
});
