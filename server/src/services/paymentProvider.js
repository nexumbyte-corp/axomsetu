import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { createRazorpayOrder, verifyRazorpayPayment } from '../modules/razorpay/razorpay.service.js';

class PaymentProvider {
  async createOrder(_params) {
    throw new Error('createOrder must be implemented by concrete subclass');
  }

  async verifyPayment(_params) {
    throw new Error('verifyPayment must be implemented by concrete subclass');
  }

  async verifyWebhook(_params) {
    throw new Error('verifyWebhook must be implemented by concrete subclass');
  }
}

class ManualPaymentProvider extends PaymentProvider {
  async createOrder({ amount, currency, referenceNumber, paymentMethod }) {
    if (paymentMethod === 'UPI' && (!referenceNumber || !referenceNumber.trim())) {
      throw ApiError.badRequest('Transaction / Reference Number is mandatory for UPI payments.');
    }

    return {
      provider: 'MANUAL',
      status: 'PENDING',
      amount,
      currency: currency || 'INR',
      referenceNumber: referenceNumber?.trim() || null,
      requiresAdminApproval: true,
    };
  }

  async verifyPayment({ referenceNumber: _referenceNumber }) {
    return {
      success: true,
      provider: 'MANUAL',
      verified: true,
    };
  }
}

class RazorpayPaymentProvider extends PaymentProvider {
  constructor() {
    super();
    const keyId = env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    this.isEnabled = Boolean(keyId);
  }

  async createOrder({ amount, currency, receipt }) {
    if (!this.isEnabled) {
      throw ApiError.badRequest('Razorpay API credentials missing in environment.');
    }
    // Amount convert to paise if input in Rupees
    const numAmount = Number(amount || 0);
    const amountInPaise = numAmount < 100 && numAmount > 0 ? Math.round(numAmount * 100) : Math.round(numAmount);

    const orderData = await createRazorpayOrder({
      amount: amountInPaise >= 100 ? amountInPaise : Math.round(numAmount * 100),
      currency: currency || 'INR',
      receipt: receipt || `sub_${Date.now()}`,
    });

    return {
      provider: 'RAZORPAY',
      status: 'CREATED',
      order_id: orderData.order_id,
      amount: orderData.amount,
      currency: orderData.currency,
      receipt: orderData.receipt,
    };
  }

  async verifyPayment(params) {
    if (!this.isEnabled) {
      throw ApiError.badRequest('Razorpay API credentials missing in environment.');
    }
    const result = await verifyRazorpayPayment(params);
    return {
      success: true,
      provider: 'RAZORPAY',
      verified: true,
      data: result,
    };
  }
}

export const getPaymentProvider = (providerType = 'MANUAL') => {
  if (providerType === 'RAZORPAY') {
    return new RazorpayPaymentProvider();
  }
  return new ManualPaymentProvider();
};
