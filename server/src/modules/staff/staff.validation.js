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

const phoneRegex = /^[0-9+\-\s()]{7,15}$/;

export const createStaffSchema = z.object({
  employeeId: z
    .string()
    .trim()
    .max(50, 'Employee ID must not exceed 50 characters')
    .optional()
    .or(z.literal('')),
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(100, 'Email must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || phoneRegex.test(val), {
      message: 'Phone number must be between 7 and 15 valid phone characters',
    })
    .optional()
    .or(z.literal('')),
  role: z.enum(STAFF_ROLES).default('TEACHER'),
  department: z
    .string()
    .trim()
    .max(100, 'Department must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  designation: z
    .string()
    .trim()
    .max(100, 'Designation must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  joiningDate: z.string().optional().or(z.literal('')),
  baseSalary: z
    .coerce
    .number()
    .min(0, 'Base salary must be non-negative')
    .max(10000000, 'Base salary must not exceed 10,000,000')
    .default(0),
  bankName: z
    .string()
    .trim()
    .max(100, 'Bank name must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  bankAccountNo: z
    .string()
    .trim()
    .max(50, 'Bank account number must not exceed 50 characters')
    .optional()
    .or(z.literal('')),
  ifscCode: z
    .string()
    .trim()
    .max(20, 'IFSC code must not exceed 20 characters')
    .optional()
    .or(z.literal('')),
});

export const updateStaffSchema = createStaffSchema.partial().extend({
  status: z.enum(STAFF_STATUSES).optional(),
});

export const disburseAdvanceSchema = z.object({
  amount: z
    .coerce
    .number()
    .positive('Advance amount must be greater than 0')
    .max(1000000, 'Advance amount must not exceed 1,000,000'),
  advanceDate: z.string().min(1, 'Advance date is required'),
  paymentMode: z.enum(PAYMENT_MODES).default('CASH'),
  referenceNo: z
    .string()
    .trim()
    .max(100, 'Reference number must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  remarks: z
    .string()
    .trim()
    .max(300, 'Remarks must not exceed 300 characters')
    .optional()
    .or(z.literal('')),
  academicYearId: z.string().uuid('Invalid Academic Year ID').optional().nullable(),
});

export const recordSalaryPaymentSchema = z.object({
  staffId: z.string().uuid('Invalid staff ID'),
  academicYearId: z.string().uuid('Invalid Academic Year ID').optional().nullable(),
  months: z.array(z.enum(FEE_MONTHS)).min(1, 'Select at least one month').max(12, 'Cannot select more than 12 months'),
  year: z.coerce.number().int().min(2000, 'Year must be at least 2000').max(2100, 'Year must not exceed 2100'),
  allowances: z
    .coerce
    .number()
    .min(0, 'Allowances must be non-negative')
    .max(10000000, 'Allowances must not exceed 10,000,000')
    .default(0),
  deductions: z
    .coerce
    .number()
    .min(0, 'Deductions must be non-negative')
    .max(10000000, 'Deductions must not exceed 10,000,000')
    .default(0),
  advanceDeducted: z
    .coerce
    .number()
    .min(0, 'Advance deducted must be non-negative')
    .max(10000000, 'Advance deducted must not exceed 10,000,000')
    .default(0),
  paymentMode: z.enum(PAYMENT_MODES).default('CASH'),
  referenceNo: z
    .string()
    .trim()
    .max(100, 'Reference number must not exceed 100 characters')
    .optional()
    .or(z.literal('')),
  remarks: z
    .string()
    .trim()
    .max(300, 'Remarks must not exceed 300 characters')
    .optional()
    .or(z.literal('')),
  paymentDate: z.string().optional(),
});
