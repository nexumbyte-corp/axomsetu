import { z } from 'zod';

const phoneRegex = /^[0-9+\-\s()]{7,15}$/;

export const createSuperAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
  email: z.string().trim().email('Valid email is required').max(100, 'Email must not exceed 100 characters').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(15, 'Password must not exceed 15 characters'),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || phoneRegex.test(val), {
      message: 'Phone number must be between 7 and 15 valid phone characters',
    })
    .optional()
    .nullable(),
});

export const updateAdminUserProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters').optional(),
  email: z.string().trim().email('Valid email is required').max(100, 'Email must not exceed 100 characters').toLowerCase().optional(),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || phoneRegex.test(val), {
      message: 'Phone number must be between 7 and 15 valid phone characters',
    })
    .optional()
    .nullable(),
});

export const resetUserPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(15, 'Password must not exceed 15 characters'),
});

export const changeUserRoleSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'STAFF'], {
    errorMap: () => ({ message: 'Invalid role' }),
  }),
});
