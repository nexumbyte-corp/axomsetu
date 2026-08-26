import { z } from 'zod';

const phoneRegex = /^[0-9+\-\s()]{7,15}$/;

export const createSchoolUserSchema = z.object({
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
  schoolRole: z.enum(['SCHOOL_ADMIN', 'STAFF'], {
    errorMap: () => ({ message: 'Role must be SCHOOL_ADMIN or STAFF' }),
  }),
  customRoleLabel: z.string().trim().max(50, 'Custom role label must not exceed 50 characters').optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateSchoolUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters').optional(),
  phone: z
    .string()
    .trim()
    .refine((val) => !val || phoneRegex.test(val), {
      message: 'Phone number must be between 7 and 15 valid phone characters',
    })
    .optional()
    .nullable(),
  customRoleLabel: z.string().trim().max(50, 'Custom role label must not exceed 50 characters').optional().nullable(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive is required' }),
  reason: z.string().trim().max(300, 'Reason must not exceed 300 characters').optional(),
});

export const updateUserPermissionsSchema = z.object({
  permissions: z.array(z.string().max(100, 'Permission string must not exceed 100 characters')).max(100, 'Cannot assign more than 100 permissions at once'),
});

export const schoolUserParamSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});
