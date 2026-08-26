import { z } from 'zod';

const phoneRegex = /^[0-9+\-\s()]{7,15}$/;

export const loginSchema = {
  body: z.object({
    email: z.string().trim().email('Invalid email address format').max(100, 'Email must not exceed 100 characters'),
    password: z.string().min(1, 'Password is required').max(100, 'Password must not exceed 100 characters'),
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required').max(1000, 'Refresh token must not exceed 1000 characters'),
  }),
};

export const updateProfileSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Full name must be at least 2 characters').max(100, 'Full name must not exceed 100 characters').optional(),
    phone: z
      .string()
      .trim()
      .refine((val) => !val || phoneRegex.test(val), {
        message: 'Phone number must be between 7 and 15 valid phone characters',
      })
      .nullable()
      .optional(),
  }),
};

export const changePasswordSchema = {
  body: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required').max(100, 'Current password must not exceed 100 characters'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters').max(15, 'New password must not exceed 15 characters'),
      confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters').max(15, 'Confirm password must not exceed 15 characters'),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'New password and confirm password do not match',
      path: ['confirmPassword'],
    }),
};

