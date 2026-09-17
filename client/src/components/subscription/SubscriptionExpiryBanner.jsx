import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useSubscription } from '../../hooks/useSubscription.js';
import { useAuth } from '../../hooks/useAuth.js';

export const SubscriptionExpiryBanner = ({ thresholdDays = 7 }) => {
  const { user } = useAuth();
  const { remainingDays, status } = useSubscription();

  // Super Admin workspace is not bound to subscription expiry
  if (user?.role === 'SUPER_ADMIN') return null;

  // Check if subscription is active and about to expire within threshold days
  const isExpiringSoon = status === 'ACTIVE' && remainingDays > 0 && remainingDays <= thresholdDays;

  if (!isExpiringSoon) return null;

  return (
    <div className="bg-amber-500 text-white px-3 sm:px-6 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-inner border-t border-amber-400/40 select-none">
      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-100 animate-pulse" />
      <div className="text-center sm:text-left flex flex-wrap items-center justify-center gap-1">
        <span>Your subscription is set to expire in {remainingDays} day(s). Renew now to avoid any interruption in service.</span>
        <Link
          to="/app/subscription"
          className="inline-flex items-center gap-1 font-bold underline hover:text-amber-100 transition-colors ml-1 cursor-pointer"
        >
          Renew Now <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
