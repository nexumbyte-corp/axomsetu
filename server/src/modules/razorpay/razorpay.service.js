import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';

const getRazorpayInstance = () => {
  const key_id = env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const key_secret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw ApiError.internal('Razorpay API key or secret missing from environment configuration');
  }

  return new Razorpay({
    key_id,
    key_secret,
  });
};

/**
 * Creates a Razorpay order
 * @param {Object} params
 * @param {number} params.amount Amount in paise (minimum 100 paise)
 * @param {string} [params.currency='INR'] Currency code
 * @param {string} [params.receipt] Optional receipt reference
 */
export const createRazorpayOrder = async ({ amount, currency = 'INR', receipt }) => {
  const parsedAmount = parseInt(amount, 10);
  if (isNaN(parsedAmount) || parsedAmount < 100) {
    throw ApiError.badRequest('Amount must be at least 100 paise');
  }

  const instance = getRazorpayInstance();
  const options = {
    amount: parsedAmount,
    currency,
    receipt: receipt || `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
  };

  try {
    const order = await instance.orders.create(options);
    return {
      order_id: order.id,
      key_id: env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    };
  } catch (error) {
    console.error('Razorpay Order Creation Error:', error);
    const statusCode = error.statusCode || error.status || 500;
    if (statusCode === 401) {
      throw ApiError.unauthorized('Razorpay authentication failed. Please check key credentials.');
    }
    throw new ApiError(
      statusCode,
      error.error?.description || error.message || 'Razorpay order creation failed'
    );
  }
};

/**
 * Verifies Razorpay payment signature
 * @param {Object} params
 * @param {string} params.razorpay_order_id
 * @param {string} params.razorpay_payment_id
 * @param {string} params.razorpay_signature
 */
export const verifyRazorpayPayment = async (payload = {}) => {
  const razorpay_order_id = payload.razorpay_order_id || payload.order_id;
  const razorpay_payment_id = payload.razorpay_payment_id || payload.payment_id;
  const razorpay_signature = payload.razorpay_signature || payload.signature;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw ApiError.badRequest('Missing required payment parameters: order_id, payment_id, and signature are required');
  }

  const key_secret = env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!key_secret) {
    throw ApiError.internal('Razorpay key secret configuration missing');
  }

  const bodyToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', key_secret)
    .update(bodyToSign)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw ApiError.badRequest('Payment verification failed: Signature mismatch');
  }

  return {
    success: true,
    message: 'Payment signature verified successfully',
    razorpay_order_id,
    razorpay_payment_id,
    order_id: razorpay_order_id,
    payment_id: razorpay_payment_id,
  };
};

export default {
  createRazorpayOrder,
  verifyRazorpayPayment,
};
