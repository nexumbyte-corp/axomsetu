import { asyncHandler } from '../../utils/asyncHandler.js';
import razorpayService from './razorpay.service.js';
import { createRazorpayOrderSchema, verifyRazorpayPaymentSchema } from './razorpay.validation.js';

export const createOrder = asyncHandler(async (req, res) => {
  const validatedBody = createRazorpayOrderSchema.parse(req.body || {});
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
