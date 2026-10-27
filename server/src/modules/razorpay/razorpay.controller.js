import { asyncHandler } from '../../utils/asyncHandler.js';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import razorpayService from './razorpay.service.js';
import { createRazorpayOrderSchema, verifyRazorpayPaymentSchema } from './razorpay.validation.js';

export const createOrder = asyncHandler(async (req, res) => {
  const validatedBody = createRazorpayOrderSchema.parse(req.body || {});

  if (validatedBody.planId) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: validatedBody.planId },
    });
    if (!plan || !plan.isActive) {
      throw ApiError.badRequest('Invalid or inactive subscription plan');
    }
    validatedBody.amount = Math.round(Number(plan.finalPrice) * 100);
    validatedBody.currency = plan.currency || 'INR';
    if (!validatedBody.receipt) {
      validatedBody.receipt = `sub_${Date.now()}`;
    }
  }

  const orderData = await razorpayService.createRazorpayOrder(validatedBody);

  res.status(200).json({
    success: true,
    message: 'Razorpay order created successfully',
    order_id: orderData.order_id,
    key_id: orderData.key_id,
    amount: orderData.amount,
    currency: orderData.currency,
    receipt: orderData.receipt,
    data: orderData,
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const validatedBody = verifyRazorpayPaymentSchema.parse(req.body || {});
  const result = await razorpayService.verifyRazorpayPayment(validatedBody);

  res.status(200).json({
    success: true,
    message: result.message,
    order_id: result.order_id,
    payment_id: result.payment_id,
    data: result,
  });
});

export default {
  createOrder,
  verifyPayment,
};
