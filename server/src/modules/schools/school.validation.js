import { z } from 'zod';

const phoneRegex = /^[0-9+\-\s()]{7,15}$/;

export const registerSchoolSchema = {
  body: z
    .object({
      schoolName: z
        .string()
        .min(2, 'School name must be at least 2 characters')
        .max(100, 'School name must not exceed 100 characters')
        .trim(),
      address: z
        .string()
        .trim()
        .min(3, 'Address must be at least 3 characters if provided')
        .max(300, 'Address must not exceed 300 characters')
        .optional()
        .or(z.literal('')),
      phone: z
        .string()
        .trim()
        .refine((val) => !val || phoneRegex.test(val), {
          message: 'Phone number must be 7 to 15 digits (optional +, -, spaces or parentheses)',
        })
        .optional()
        .or(z.literal('')),
      email: z
        .string()
        .email('Invalid school email address format')
        .max(100, 'Email must not exceed 100 characters')
        .toLowerCase()
        .trim(),
      ownerName: z
        .string()
        .min(2, 'Owner name must be at least 2 characters')
        .max(50, 'Owner name must not exceed 50 characters')
        .trim(),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(15, 'Password must not exceed 15 characters'),
      confirmPassword: z
        .string()
        .min(8, 'Confirm password must be at least 8 characters long')
        .max(15, 'Confirm password must not exceed 15 characters'),
      termsAccepted: z
        .boolean({ required_error: 'Terms & Conditions acceptance is required before registration.' })
        .refine((val) => val === true, {
          message: 'Terms & Conditions acceptance is required before registration.',
        }),
      acceptedTermsVersion: z.string().optional(),
      privacyPolicyVersion: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
};

export const createSchoolSchema = {
  body: z
    .object({
      name: z
        .string()
        .min(2, 'School name must be at least 2 characters')
        .max(100, 'School name must not exceed 100 characters')
        .trim()
        .optional(),
      schoolName: z
        .string()
        .min(2, 'School name must be at least 2 characters')
        .max(100, 'School name must not exceed 100 characters')
        .trim()
        .optional(),
      code: z
        .string()
        .trim()
        .min(2, 'School code must be at least 2 characters')
        .max(20, 'School code must not exceed 20 characters')
        .optional()
        .or(z.literal('')),
      address: z
        .string()
        .trim()
        .min(3, 'Address must be at least 3 characters if provided')
        .max(300, 'Address must not exceed 300 characters')
        .optional()
        .or(z.literal('')),
      phone: z
        .string()
        .trim()
        .refine((val) => !val || phoneRegex.test(val), {
          message: 'Phone number must be 7 to 15 digits (optional +, -, spaces or parentheses)',
        })
        .optional()
        .or(z.literal('')),
      email: z
        .string()
        .email('Invalid email address format')
        .max(100, 'Email must not exceed 100 characters')
        .toLowerCase()
        .trim(),
      ownerName: z
        .string()
        .min(2, 'Owner name must be at least 2 characters')
        .max(100, 'Owner name must not exceed 100 characters')
        .trim()
        .optional(),
      adminName: z
        .string()
        .min(2, 'Owner name must be at least 2 characters')
        .max(100, 'Owner name must not exceed 100 characters')
        .trim()
        .optional(),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(100, 'Password must not exceed 100 characters')
        .optional(),
      adminPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(100, 'Password must not exceed 100 characters')
        .optional(),
    })
    .refine((data) => Boolean(data.name || data.schoolName), {
      message: 'School name is required',
      path: ['name'],
    })
    .refine((data) => Boolean(data.ownerName || data.adminName), {
      message: 'Owner name is required',
      path: ['ownerName'],
    })
    .refine((data) => Boolean(data.password || data.adminPassword), {
      message: 'Password is required',
      path: ['password'],
    }),
};

export const updateSchoolSchema = {
  body: z.object({
    name: z
      .string()
      .min(2, 'School name must be at least 2 characters')
      .max(100, 'School name must not exceed 100 characters')
      .trim()
      .optional(),
    address: z
      .string()
      .trim()
      .min(3, 'Address must be at least 3 characters if provided')
      .max(300, 'Address must not exceed 300 characters')
      .optional()
      .or(z.literal(''))
      .or(z.null()),
    phone: z
      .string()
      .trim()
      .refine((val) => !val || phoneRegex.test(val), {
        message: 'Phone number must be 7 to 15 digits (optional +, -, spaces or parentheses)',
      })
      .optional()
      .or(z.literal(''))
      .or(z.null()),
    email: z
      .string()
      .email('Invalid email address format')
      .max(100, 'Email must not exceed 100 characters')
      .toLowerCase()
      .trim()
      .optional(),
    logoUrl: z.string().max(500, 'Logo URL must not exceed 500 characters').optional().or(z.literal('')).or(z.null()),
    district: z
      .string()
      .trim()
      .min(2, 'District must be at least 2 characters')
      .max(100, 'District must not exceed 100 characters')
      .optional()
      .or(z.literal(''))
      .or(z.null()),
    state: z
      .string()
      .trim()
      .min(2, 'State must be at least 2 characters')
      .max(100, 'State must not exceed 100 characters')
      .optional()
      .or(z.literal(''))
      .or(z.null()),
    pincode: z
      .string()
      .trim()
      .min(4, 'Pincode must be at least 4 characters')
      .max(10, 'Pincode must not exceed 10 characters')
      .optional()
      .or(z.literal(''))
      .or(z.null()),
    udiseCode: z
      .string()
      .trim()
      .min(4, 'UDISE Code must be at least 4 characters')
      .max(30, 'UDISE Code must not exceed 30 characters')
      .optional()
      .or(z.literal(''))
      .or(z.null()),
    affiliationNo: z
      .string()
      .trim()
      .min(3, 'Affiliation No must be at least 3 characters')
      .max(50, 'Affiliation No must not exceed 50 characters')
      .optional()
      .or(z.literal(''))
      .or(z.null()),
    website: z
      .string()
      .trim()
      .max(200, 'Website must not exceed 200 characters')
      .optional()
      .or(z.literal(''))
      .or(z.null()),
  }),
};

export const changeStatusSchema = {
  body: z.object({
    status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE'], {
      errorMap: () => ({ message: 'Invalid school status' }),
    }),
  }),
};

export const schoolIdParamSchema = {
  params: z.object({
    schoolId: z.string().uuid('Invalid school ID format'),
  }),
};

export const listSchoolsQuerySchema = {
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => !isNaN(val) && val > 0, 'Page must be a positive integer'),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .refine((val) => !isNaN(val) && val > 0 && val <= 100, 'Limit must be between 1 and 100'),
    search: z.string().trim().optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(),
  }),
};

export const addSchoolAdminSchema = {
  params: z.object({
    schoolId: z.string().uuid('Invalid school ID format'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user ID format').optional(),
    email: z.string().email('Invalid email address format').toLowerCase().trim().optional(),
    name: z.string().trim().optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    phone: z.string().trim().optional(),
    isOwner: z.boolean().optional(),
    schoolRole: z.enum(['OWNER', 'SCHOOL_ADMIN', 'STAFF']).optional(),
    systemRole: z.enum(['SUPER_ADMIN', 'SCHOOL_ADMIN']).optional(),
  }),
};
