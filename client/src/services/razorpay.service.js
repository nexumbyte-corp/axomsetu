import axios from 'axios';
import { api } from './api.js';

/**
 * Calls backend endpoint to create a Razorpay order
 * @param {Object} data
 * @param {number} data.amount Amount in paise
 * @param {string} [data.currency='INR']
 * @param {string} [data.receipt]
 */
export const createRazorpayOrder = async ({ amount, currency = 'INR', receipt }) => {
  try {
    const res = await api.post('/create-order', { amount, currency, receipt });
    return res.data || res;
  } catch (err) {
    // Fallback to top-level /api/create-order if /api/v1 fails
    try {
      const fallbackRes = await axios.post('/api/create-order', { amount, currency, receipt });
      return fallbackRes.data;
    } catch (fallbackErr) {
      throw err.message ? err : fallbackErr;
    }
  }
};

/**
 * Calls backend endpoint to verify Razorpay payment signature
 * @param {Object} data
 * @param {string} data.razorpay_order_id
 * @param {string} data.razorpay_payment_id
 * @param {string} data.razorpay_signature
 */
export const verifyRazorpayPayment = async (paymentData) => {
  try {
    const res = await api.post('/verify-payment', paymentData);
    return res.data || res;
  } catch (err) {
    try {
      const fallbackRes = await axios.post('/api/verify-payment', paymentData);
      return fallbackRes.data;
    } catch (fallbackErr) {
      throw err.message ? err : fallbackErr;
    }
  }
};

export default {
  createRazorpayOrder,
  verifyRazorpayPayment,
};
