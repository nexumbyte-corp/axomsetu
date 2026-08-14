import { ApiError } from '../utils/ApiError.js';

export class PaymentProvider {
  async createOrder(params) {
    throw new Error('createOrder must be implemented by concrete subclass');
  }

  async verifyPayment(params) {
    throw new Error('verifyPayment must be implemented by concrete subclass');
  }

  async verifyWebhook(params) {
    throw new Error('verifyWebhook must be implemented by concrete subclass');
  }
}

export class ManualPaymentProvider extends PaymentProvider {
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

  async verifyPayment({ referenceNumber }) {
    return {
      success: true,
      provider: 'MANUAL',
      verified: true,
    };
  }
}

export class RazorpayPaymentProvider extends PaymentProvider {
  constructor() {
    super();
    this.isEnabled = process.env.RAZORPAY_ENABLED === 'true';
  }

  async createOrder() {
    if (!this.isEnabled) {
      throw ApiError.badRequest('Razorpay payment gateway is currently disabled. Please select Cash or UPI.');
    }
    // Future Razorpay Order SDK initialization goes here
    throw ApiError.notImplemented('Razorpay online checkout is coming soon.');
  }

  async verifyPayment() {
    if (!this.isEnabled) {
      throw ApiError.badRequest('Razorpay payment gateway is currently disabled.');
    }
    throw ApiError.notImplemented('Razorpay verification is coming soon.');
  }
}

export const getPaymentProvider = (providerType = 'MANUAL') => {
  if (providerType === 'RAZORPAY') {
    return new RazorpayPaymentProvider();
  }
  return new ManualPaymentProvider();
};
