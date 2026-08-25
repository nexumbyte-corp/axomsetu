import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService.js';
import { SubscriptionInvoiceCard } from '../../components/admin/SubscriptionInvoiceCard.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Toast } from '../../components/ui/Toast.jsx';

export const SubscriptionInvoicePage = () => {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchSubscription = async () => {
      setLoading(true);
      try {
        const res = await subscriptionService.adminGetSubscriptionById(subscriptionId);
        if (res.success && res.data) {
          setSubscription(res.data);
        } else {
          setToast({ type: 'danger', message: 'Subscription invoice record not found.' });
        }
      } catch (err) {
        setToast({ type: 'danger', message: err.message || 'Failed to load subscription invoice details.' });
      } finally {
        setLoading(false);
      }
    };

    if (subscriptionId) {
      fetchSubscription();
    }
  }, [subscriptionId]);

  useEffect(() => {
    if (searchParams.get('print') === 'true' && subscription) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [searchParams, subscription]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs space-y-3 max-w-3xl mx-auto my-8">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Generating subscription invoice details...</p>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs space-y-3 max-w-3xl mx-auto my-8">
        <p className="text-sm font-bold text-slate-900">Subscription Invoice Not Found</p>
        <p className="text-xs text-slate-500">The requested subscription invoice could not be retrieved.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/subscriptions')}>
          Back to Subscriptions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Top Action Header Bar (Hidden during printing) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs print:hidden max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Subscriptions</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
          >
            Print Business Invoice
          </Button>
        </div>
      </div>

      {/* Official Business Subscription Invoice Card */}
      <SubscriptionInvoiceCard subscription={subscription} school={subscription.school} />
    </div>
  );
};

export default SubscriptionInvoicePage;
