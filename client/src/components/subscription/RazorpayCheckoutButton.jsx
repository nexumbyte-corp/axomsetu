import React, { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { loadRazorpayScript } from '../../utils/loadRazorpayScript.js';
import { createRazorpayOrder, verifyRazorpayPayment } from '../../services/razorpay.service.js';
import { toast } from '../ui/Toast.jsx';

/**
 * Razorpay Checkout Button Component for Subscriptions
 * @param {Object} props
 * @param {number} [props.amountInRupees] Subscription plan price in Rupees (₹)
 * @param {number} [props.amount] Alternative prop for price in Rupees (₹)
 * @param {string} [props.currency='INR'] Currency code
 * @param {string} [props.receipt] Receipt reference string
 * @param {string} [props.name='AxomSetu School SaaS'] Organization or Plan Name
 * @param {string} [props.description='Subscription Upgrade / Purchase'] Description
 * @param {Function} [props.onSuccess] Callback when payment is completed & verified
 * @param {Function} [props.onFailure] Callback on payment error or verification failure
 * @param {Function} [props.onDismiss] Callback when user closes payment modal
 * @param {string} [props.buttonText] Custom label for the button
 * @param {string} [props.className] Custom Tailwind CSS styling for the button
 */
export const RazorpayCheckoutButton = ({
  amountInRupees,
  amount,
  currency = 'INR',
  receipt,
  name = 'AxomSetu School SaaS',
  description = 'Subscription Plan Purchase',
  prefill = {},
  onSuccess,
  onFailure,
  onDismiss,
  buttonText,
  className = '',
  disabled = false,
}) => {
  const [loading, setLoading] = useState(false);

  // Dynamic price in Rupees from Subscription Plan
  const priceInRupees = Number(amountInRupees !== undefined ? amountInRupees : amount || 0);

  const handleCheckout = async () => {
    if (loading || disabled) return;
    setLoading(true);

    try {
      // 1. Ensure Razorpay Checkout script is loaded
      const isScriptLoaded = await loadRazorpayScript();
      if (!isScriptLoaded) {
        toast.error('Razorpay SDK failed to load. Please check your internet connection.');
        setLoading(false);
        return;
      }

      // 2. Convert Rupees (₹) dynamically to Paise for Razorpay API (1 INR = 100 paise)
      const amountInPaise = Math.round(priceInRupees * 100);

      if (amountInPaise < 100) {
        toast.error('Payment amount must be at least ₹1.00 (100 paise).');
        setLoading(false);
        return;
      }

      // 3. Create Razorpay order via backend endpoint
      const orderResponse = await createRazorpayOrder({
        amount: amountInPaise,
        currency,
        receipt: receipt || `sub_${Date.now()}`,
      });

      const orderData = orderResponse.data || orderResponse;
      const orderId = orderData.order_id || orderData.id;

      if (!orderId) {
        throw new Error('Order creation failed: No order_id returned from server.');
      }

      // 4. Initialize Razorpay Standard Checkout modal
      const razorpayKey = orderData.key_id || orderResponse.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_TcN6LHCXuBovS1';

      const options = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || currency,
        name,
        description,
        order_id: orderId,
        prefill: {
          name: prefill.name || '',
          email: prefill.email || '',
          contact: prefill.contact || prefill.phone || '',
        },
        theme: {
          color: '#4f46e5', // Brand indigo color
        },
        handler: async (response) => {
          setLoading(true);
          try {
            // 5. Verify payment signature on backend
            const verifyRes = await verifyRazorpayPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success('Payment verified successfully!');
            if (onSuccess) {
              onSuccess({
                response,
                verification: verifyRes,
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                amountInRupees: priceInRupees,
              });
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            const msg = err.message || 'Payment verification signature check failed';
            toast.error(msg);
            if (onFailure) onFailure(err);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast.info('Payment checkout closed by user.');
            if (onDismiss) onDismiss();
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on('payment.failed', (response) => {
        setLoading(false);
        console.error('Razorpay Payment Failed:', response.error);
        const errMsg = response.error?.description || response.error?.reason || 'Payment failed';
        toast.error(`Payment Failed: ${errMsg}`);
        if (onFailure) onFailure(response.error);
      });

      rzp.open();
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error(err.message || 'Failed to initiate Razorpay checkout');
      if (onFailure) onFailure(err);
    } finally {
      setLoading(false);
    }
  };

  const defaultBtnText = `Pay ₹${priceInRupees.toLocaleString('en-IN')}`;

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading || disabled}
      className={
        className ||
        `inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`
      }
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          <CreditCard className="w-4 h-4 shrink-0" />
          <span>{buttonText || defaultBtnText}</span>
        </>
      )}
    </button>
  );
};

export default RazorpayCheckoutButton;
