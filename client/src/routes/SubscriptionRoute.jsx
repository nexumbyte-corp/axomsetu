import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, AlertTriangle, CreditCard } from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription.js';
import { Spinner } from '../components/ui/Spinner.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';

export const SubscriptionRoute = ({ children }) => {
  const navigate = useNavigate();
  const { isSubscriptionActive, loading, status } = useSubscription();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner size="lg" label="Checking subscription status..." />
      </div>
    );
  }

  if (isSubscriptionActive) {
    return children;
  }

  const statusLabel = status === 'SUSPENDED' ? 'Suspended' : status === 'EXPIRED' ? 'Expired' : 'Inactive';

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <Card className="p-8 text-center border-rose-200 bg-white shadow-xl rounded-2xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
          <Lock className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 mb-2">
          Subscription {statusLabel}
        </span>

        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Operational Feature Restricted
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-lg mx-auto leading-relaxed">
          Your school workspace requires an <strong>Active Subscription</strong> to access operational modules (Students, Staff, Fees, Finance, Reports, etc.).
        </p>

        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Why am I seeing this?</span>
          </div>
          <p className="text-slate-500 pl-6">
            Your school's subscription is currently <strong>{status}</strong>. All school data remains preserved safely, but active operations are locked until a subscription plan is active.
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <Button
            variant="primary"
            size="md"
            icon={CreditCard}
            onClick={() => navigate('/app/subscription')}
            className="px-6 py-2.5 font-bold shadow-md"
          >
            Manage Subscription & Activate Plan
          </Button>
        </div>
      </Card>
    </div>
  );
};
