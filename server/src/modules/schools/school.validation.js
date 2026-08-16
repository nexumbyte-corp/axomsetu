import { z } from 'zod';

export const registerSchoolSchema = {
  body: z
    .object({
      schoolName: z.string().min(1, 'School name is required').trim(),
      address: z.string().trim().optional().or(z.literal('')),
      phone: z.string().trim().optional().or(z.literal('')),
      email: z.string().email('Invalid school email address format').toLowerCase().trim(),
      ownerName: z.string().min(1, 'Owner name is required').trim(),
      password: z.string().min(8, 'Password must be at least 8 characters long'),
      confirmPassword: z.string().min(1, 'Confirm password is required'),
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
  body: z.object({
    name: z.string().min(1, 'School name is required').trim(),
    address: z.string().trim().optional().or(z.literal('')),
    phone: z.string().trim().optional().or(z.literal('')),
    email: z.string().email('Invalid email address format').toLowerCase().trim(),
    ownerName: z.string().min(1, 'Owner name is required').trim(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
};

export const updateSchoolSchema = {
  body: z.object({
    name: z.string().min(1, 'School name cannot be empty').trim().optional(),
    address: z.string().trim().optional().or(z.literal('')).or(z.null()),
    phone: z.string().trim().optional().or(z.literal('')).or(z.null()),
    email: z.string().email('Invalid email address format').toLowerCase().trim().optional(),
    logoUrl: z.string().optional().or(z.literal('')).or(z.null()),
    district: z.string().trim().optional().or(z.literal('')).or(z.null()),
    state: z.string().trim().optional().or(z.literal('')).or(z.null()),
    pincode: z.string().trim().optional().or(z.literal('')).or(z.null()),
    udiseCode: z.string().trim().optional().or(z.literal('')).or(z.null()),
    affiliationNo: z.string().trim().optional().or(z.literal('')).or(z.null()),
    website: z.string().trim().optional().or(z.literal('')).or(z.null()),
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
