import { z } from 'zod';

export const createSchoolUserSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Valid email is required').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().max(20).optional().nullable(),
  schoolRole: z.enum(['SCHOOL_ADMIN', 'STAFF'], {
    errorMap: () => ({ message: 'Role must be SCHOOL_ADMIN or STAFF' }),
  }),
  customRoleLabel: z.string().max(50).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateSchoolUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  customRoleLabel: z.string().max(50).optional().nullable(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ required_error: 'isActive is required' }),
  reason: z.string().max(200).optional(),
});

export const updateUserPermissionsSchema = z.object({
  permissions: z.array(z.string()).min(0),
});

export const schoolUserParamSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
});
