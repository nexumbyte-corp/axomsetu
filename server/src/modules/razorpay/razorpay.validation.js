import { z } from 'zod';

export const createRazorpayOrderSchema = z.object({
  amount: z
    .union([z.number(), z.string()])
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val >= 100, 'Amount must be at least 100 paise'),
  currency: z.string().trim().length(3, 'Currency must be 3 characters').optional().default('INR'),
  receipt: z.string().trim().max(100, 'Receipt must not exceed 100 characters').optional().nullable(),
});

export const verifyRazorpayPaymentSchema = z
  .object({
    razorpay_order_id: z.string().trim().max(100).optional(),
    order_id: z.string().trim().max(100).optional(),
    razorpay_payment_id: z.string().trim().max(100).optional(),
    payment_id: z.string().trim().max(100).optional(),
    razorpay_signature: z.string().trim().max(200).optional(),
    signature: z.string().trim().max(200).optional(),
  })
  .refine(
    (data) => (data.razorpay_order_id || data.order_id) && (data.razorpay_payment_id || data.payment_id) && (data.razorpay_signature || data.signature),
    {
      message: 'order_id, payment_id, and signature are required',
    }
  );
