import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Zap,
  Check,
  AlertCircle,
  Users,
  CreditCard,
  History,
  Clock,
  Phone,
  Mail,
  Headphones,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PAGE_SEO } from '../config/seoConfig.js';
import { formatDate } from '../utils/formatters.js';
import { calculateMonthlyPrice } from '../utils/subscriptionUtils.js';

import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';
import { Toast, toast } from '../components/ui/Toast.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import { RazorpayCheckoutButton } from '../components/subscription/RazorpayCheckoutButton.jsx';
import { TermsAndConditionsModal } from '../components/legal/TermsAndConditionsModal.jsx';

export const SubscriptionPage = () => {
  useDocumentTitle(PAGE_SEO.subscription);
  const { currentSubData: contextSubData, refreshSubscription } = useSubscription();
  const [currentSubData, setCurrentSubData] = useState(contextSubData || null);
  const [plans, setPlans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(!contextSubData);
  const [toastMessage, setToastMessage] = useState(null);

  // Active Bottom Tab State: 'plans' | 'requests' | 'history'
  const [activeBottomTab, setActiveBottomTab] = useState('plans');

  // Purchase Modal State
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [noRefundAccepted, setNoRefundAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Enterprise Contact Support Modal State
  const [contactSupportModalOpen, setContactSupportModalOpen] = useState(false);
  const [contactModalPlan, setContactModalPlan] = useState(null);
  const [platformContact, setPlatformContact] = useState(null);

  const fetchSubscriptionDetails = useCallback(async () => {
    try {
      const [subRes, plansRes, reqsRes, histRes, contactRes] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getActivePlans(),
        subscriptionService.getPaymentRequests(),
        subscriptionService.getSubscriptionHistory(),
        subscriptionService.getPlatformContact?.().catch(() => null),
      ]);

      if (subRes?.success) setCurrentSubData(subRes.data);
      if (plansRes?.success) setPlans(plansRes.data || []);
      if (reqsRes?.success) setRequests(reqsRes.data || []);
      if (histRes?.success) setHistory(histRes.data || []);
      if (contactRes?.success && contactRes.data) setPlatformContact(contactRes.data);
    } catch (err) {
      const msg = err.message || 'Failed to load subscription information';
      setToastMessage({ type: 'danger', message: msg });
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionDetails();
  }, [fetchSubscriptionDetails]);

  useEffect(() => {
    if (contextSubData) {
      setCurrentSubData(contextSubData);
    }
  }, [contextSubData]);

  const sub = currentSubData?.subscription;
  const remainingDays = currentSubData?.remainingDays || 0;
  const hasActiveSubscription = currentSubData?.status === 'ACTIVE' && remainingDays > 0;
  const isSuspended = currentSubData?.status === 'SUSPENDED' || sub?.status === 'SUSPENDED';

  // Derived attributes of current active plan
  const currentPlanNameLower = sub?.planName?.toLowerCase() || '';
  const isTrialPlan = Boolean(sub?.isTrial || sub?.planType === 'TRIAL' || currentPlanNameLower.includes('trial') || currentPlanNameLower.includes('free'));
  const isCurrentEnterprise = Boolean(sub?.isEnterprise || sub?.planType === 'ENTERPRISE' || currentPlanNameLower.includes('enterprise'));
  const currentPlanPrice = Number(sub?.finalPrice || sub?.basePrice || 0);
  const currentStudentLimit = Number(sub?.maxStudentLimit || 0);

  const handleOpenPurchaseModal = useCallback((plan) => {
    if (hasActiveSubscription && isCurrentEnterprise) {
      const msg = 'Your school is currently operating under an active Enterprise Subscription. Additional plan purchases are disabled until your subscription expires.';
      toast.error(msg);
      return;
    }
    setSelectedPlan(plan);
    setNoRefundAccepted(false);
    setModalError('');
  }, [hasActiveSubscription, isCurrentEnterprise]);

  const handleClosePurchaseModal = useCallback(() => {
    if (submitting) return;
    setSelectedPlan(null);
    setModalError('');
  }, [submitting]);

  const handleOpenContactModal = useCallback((plan = null) => {
    setContactModalPlan(plan);
    setContactSupportModalOpen(true);
  }, []);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  // Find matching plan object for current sub if available
  const currentMatchingPlan = plans.find(
    (p) => p.id === sub?.planId || p.name?.toLowerCase() === currentPlanNameLower
  );

  return (
    <div className="space-y-8 w-full">
      {toastMessage && <Toast type={toastMessage.type} message={toastMessage.message} onClose={() => setToastMessage(null)} />}

      <ModulePageHeader
        icon={CreditCard}
        title="Subscription Management"
        description="Manage your school subscription, view plan tiers, and check billing history."
        actions={
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchSubscriptionDetails}>
            Refresh Status
          </Button>
        }
      />

      {/* Warning Alert for Expired or Suspended Subscription */}
      {!hasActiveSubscription && (
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-5 shadow-xs flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-900">
              {isSuspended ? 'School Account Access Suspended' : 'No Active Subscription'}
            </h3>
            <p className="text-xs text-rose-700 leading-relaxed">
              {isSuspended
                ? 'Your school subscription has been suspended by the platform administrator. Operational modules (students, staff, fees, finance, reports, settings) are currently restricted.'
                : 'Your school does not have an active subscription plan. Select an available plan below to purchase access.'}
            </p>
          </div>
        </div>
      )}

      {/* Active Subscription Summary Card (Only shown if subscription is currently active) */}
      {loading ? (
        <TableSkeleton rows={2} cols={4} />
      ) : hasActiveSubscription ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Top Row: Plan Identity & Days Counter */}
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 uppercase tracking-wider">
                  Current Plan
                </span>
                <Badge
                  variant={
                    hasActiveSubscription
                      ? 'success'
                      : isSuspended
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                >
                  {hasActiveSubscription
                    ? isTrialPlan
                      ? 'TRIAL ACTIVE'
                      : 'ACTIVE'
                    : isSuspended
                      ? 'SUSPENDED'
                      : 'INACTIVE'}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {sub?.planName || 'No Active Subscription Plan'}
                </h2>
                {hasActiveSubscription && !isTrialPlan && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs font-semibold border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-lg cursor-pointer"
                    onClick={() => {
                      if (isCurrentEnterprise) {
                        handleOpenContactModal();
                      } else if (currentMatchingPlan) {
                        handleOpenPurchaseModal(currentMatchingPlan);
                      } else if (sub) {
                        handleOpenPurchaseModal({
                          id: sub.planId,
                          name: sub.planName,
                          finalPrice: sub.finalPrice,
                          durationValue: 1,
                          durationUnit: 'Year',
                        });
                      }
                    }}
                  >
                    {isCurrentEnterprise ? 'Contact Support for Upgrade' : 'Renew Plan'}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Validity: <span className="font-semibold text-slate-700">{formatDate(sub?.startDate, '-')}</span> to{' '}
                  <span className="font-semibold text-slate-700">{formatDate(sub?.endDate, 'N/A (Expired)')}</span>
                </span>
              </div>
            </div>

            {/* Days Remaining Pill & Mini Bar */}
            <div className="bg-slate-50 px-4 py-3 rounded-xl border border-slate-200/80 flex flex-col sm:items-end justify-center min-w-[200px]">
              <div className="flex items-center justify-between sm:justify-end gap-2 w-full">
                <span className="text-[11px] font-semibold text-slate-500">Remaining Period</span>
                <span className={`text-base font-bold font-mono ${remainingDays <= 7 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {remainingDays} <span className="text-xs font-medium text-slate-500 font-sans">Days</span>
                </span>
              </div>
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-500 ${
                    remainingDays > 30
                      ? 'bg-emerald-500'
                      : remainingDays > 7
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, (remainingDays / 60) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Metrics: 4 Clean Operational Metric Tiles */}
          <div className="p-4 sm:p-5 bg-slate-50/50 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 border-t border-slate-100">
            {/* Student Capacity with Mini Progress */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Student Limit</span>
                <Users className="w-3 h-3 text-slate-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm sm:text-base font-bold text-slate-900 font-mono">
                  {currentSubData?.activeStudentCount ?? 0}
                  <span className="text-xs font-normal text-slate-400 font-sans">
                    {' '}/ {sub?.maxStudentLimit ? sub.maxStudentLimit : 'Unlimited'}
                  </span>
                </span>
                {sub?.maxStudentLimit && (
                  <span className={`text-[10px] font-bold ${
                    ((currentSubData?.activeStudentCount || 0) / sub.maxStudentLimit) >= 0.9 ? 'text-rose-600' : 'text-slate-500'
                  }`}>
                    {Math.min(100, Math.round(((currentSubData?.activeStudentCount || 0) / sub.maxStudentLimit) * 100))}%
                  </span>
                )}
              </div>
              {sub?.maxStudentLimit && (
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      ((currentSubData?.activeStudentCount || 0) / sub.maxStudentLimit) >= 0.95
                        ? 'bg-rose-500'
                        : ((currentSubData?.activeStudentCount || 0) / sub.maxStudentLimit) >= 0.8
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round(((currentSubData?.activeStudentCount || 0) / sub.maxStudentLimit) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Billing Cycle */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Billing Cycle</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 block truncate">
                {sub?.duration || '1 Month'}
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                Cycle duration
              </span>
            </div>

            {/* Final Price / Investment */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Current Rate</span>
              <span className="text-sm sm:text-base font-bold text-slate-900 font-mono block">
                {formatCurrency(sub?.finalPrice)}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block truncate">
                {sub?.discount > 0 ? `Saved ${formatCurrency(sub.discount)}` : 'Standard Rate'}
              </span>
            </div>

            {/* Payment Status */}
            <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Payment Status</span>
              <div className="flex items-center gap-1.5 pt-0.5">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                  <Check className="w-3 h-3 text-emerald-600" />
                  {sub?.paymentStatus || 'PAID'}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block truncate">
                Active status confirmed
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Main Tabbed Container: Available Plans, Payment Requests & Subscription History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-6 pt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveBottomTab('plans')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeBottomTab === 'plans'
                ? 'border-indigo-600 text-indigo-700 bg-slate-50/70 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Available Plans</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {plans.length}
            </span>
          </button>

          <button
            onClick={() => setActiveBottomTab('requests')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeBottomTab === 'requests'
                ? 'border-indigo-600 text-indigo-700 bg-slate-50/70 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Payment Requests</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {requests.length}
            </span>
          </button>

          <button
            onClick={() => setActiveBottomTab('history')}
            className={`px-3.5 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeBottomTab === 'history'
                ? 'border-indigo-600 text-indigo-700 bg-slate-50/70 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Subscription History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
              {history.length}
            </span>
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {/* TAB 1: AVAILABLE SUBSCRIPTION PLANS */}
          {activeBottomTab === 'plans' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Select Subscription Tier</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {hasActiveSubscription
                      ? 'Upgrade capacity tier, renew active term, or contact support for dedicated enterprise setups.'
                      : 'Select a subscription plan to activate operational features for your institution.'}
                  </p>
                </div>
              </div>

              {hasActiveSubscription && isCurrentEnterprise ? (
                <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg space-y-6 border border-slate-800 my-2">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2.5 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/30 uppercase tracking-wider">
                          Active Enterprise Subscription
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Active until {formatDate(sub?.endDate, 'N/A')}
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                        Enterprise Subscription Active ({sub?.planName || 'Enterprise Custom'})
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Your institution is currently operating under an active Enterprise Subscription valid through{' '}
                        <strong className="text-white">{formatDate(sub?.endDate, 'N/A')}</strong> ({remainingDays} days remaining).
                        Standard subscription plan purchasing and switching are disabled while your Enterprise subscription is active.
                      </p>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => handleOpenContactModal()}
                      className="bg-purple-600 hover:bg-purple-500 text-white border-0 font-bold px-5 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-2 shrink-0 self-start md:self-auto"
                    >
                      <Phone className="w-4 h-4" />
                      Contact Enterprise Support
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-slate-800 text-xs">
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-1">
                      <span className="text-slate-400 font-medium block">Current Student Capacity</span>
                      <span className="text-base font-bold text-white font-mono">
                        {currentSubData?.activeStudentCount ?? 0} / {sub?.maxStudentLimit ? `${sub.maxStudentLimit}` : 'Custom / Unlimited'}
                      </span>
                    </div>
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-1">
                      <span className="text-slate-400 font-medium block">Subscription Validity</span>
                      <span className="text-xs font-bold text-white">
                        {formatDate(sub?.startDate)} - {formatDate(sub?.endDate)}
                      </span>
                    </div>
                    <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-1">
                      <span className="text-slate-400 font-medium block">Plan Switch Status</span>
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        Locked until subscription expiry
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch pt-2">
                  {plans.map((plan) => {
                    const hasDiscount = plan.discountAmount > 0 || plan.discountPercentage > 0;
                    const planNameLower = plan.name?.toLowerCase() || '';
                    const isEnterprisePlan = Boolean(plan.isEnterprise || plan.type === 'ENTERPRISE' || planNameLower.includes('enterprise'));
                    const isTrial = Boolean(plan.isTrial || plan.type === 'TRIAL' || planNameLower.includes('trial'));
                    const isCurrentPlan = Boolean(
                      hasActiveSubscription &&
                      (sub?.planId === plan.id ||
                        currentPlanNameLower === planNameLower ||
                        (isCurrentEnterprise && isEnterprisePlan))
                    );

                    // Determine if plan is higher tier than current active plan
                    const planFinalPrice = Number(plan.finalPrice || 0);
                    const planStudentLimit = Number(plan.maxStudentLimit || 999999);
                    const isHigherPlan = !isCurrentPlan && (
                      planFinalPrice > currentPlanPrice ||
                      planStudentLimit > currentStudentLimit ||
                      (isEnterprisePlan && !isCurrentEnterprise)
                    );

                    // Derive dynamic button text and action
                    let btnText = 'Purchase Now';
                    let btnVariant = 'primary';
                    let btnAction = () => handleOpenPurchaseModal(plan);
                    let btnDisabled = false;

                    if (!hasActiveSubscription) {
                      if (isEnterprisePlan) {
                        btnText = 'Contact Support';
                        btnAction = () => handleOpenContactModal(plan);
                      } else {
                        btnText = 'Purchase Now';
                        btnAction = () => handleOpenPurchaseModal(plan);
                      }
                    } else {
                      // User has active subscription
                      if (isCurrentEnterprise) {
                        btnText = 'Contact Support for Upgrade';
                        btnAction = () => handleOpenContactModal(plan);
                      } else if (isEnterprisePlan) {
                        btnText = 'Contact Support for Upgrade';
                        btnAction = () => handleOpenContactModal(plan);
                      } else if (isCurrentPlan) {
                        if (isTrialPlan) {
                          btnText = 'Upgrade Plan';
                          btnAction = () => handleOpenPurchaseModal(plan);
                        } else {
                          btnText = 'Renew Plan';
                          btnAction = () => handleOpenPurchaseModal(plan);
                        }
                      } else if (isHigherPlan) {
                        btnText = 'Upgrade Plan';
                        btnAction = () => handleOpenPurchaseModal(plan);
                      } else {
                        btnText = 'Current Plan (Active)';
                        btnDisabled = true;
                        btnVariant = 'outline';
                      }
                    }

                    return (
                      <div
                        key={plan.id}
                        className={`bg-white rounded-xl p-5 border flex flex-col justify-between transition-all relative ${
                          isCurrentPlan
                            ? 'border-indigo-500 ring-2 ring-indigo-500/15 shadow-sm'
                            : isEnterprisePlan
                              ? 'border-purple-200 hover:border-purple-300 shadow-2xs'
                              : 'border-slate-200 hover:border-indigo-200 hover:shadow-xs'
                        }`}
                      >
                        <div>
                          {/* Header: Name and Badge */}
                          <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                            <h4 className="text-base font-bold text-slate-900">{plan.name}</h4>
                            {isCurrentPlan ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white tracking-wide uppercase">
                                Current Plan
                              </span>
                            ) : isTrial ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Trial
                              </span>
                            ) : isEnterprisePlan ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                Enterprise
                              </span>
                            ) : plan.badge ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                                {plan.badge}
                              </span>
                            ) : null}
                          </div>

                          {/* Student Capacity Tag */}
                          <div className="mb-2.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                isEnterprisePlan
                                  ? 'bg-purple-50 text-purple-800 border border-purple-100'
                                  : plan.maxStudentLimit
                                    ? 'bg-indigo-50/70 text-indigo-800 border border-indigo-100'
                                    : 'bg-emerald-50/70 text-emerald-800 border border-emerald-100'
                              }`}
                            >
                              <Users className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {isEnterprisePlan
                                  ? 'Custom Capacity (Sales)'
                                  : plan.type === 'ENTERPRISE' || planNameLower.includes('enterprise')
                                    ? 'Custom (Unlimited Students)'
                                    : plan.maxStudentLimit
                                      ? `Up to ${plan.maxStudentLimit} Active Students`
                                      : 'Unlimited Students'}
                              </span>
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mb-3 min-h-[32px] leading-relaxed line-clamp-2">
                            {plan.description}
                          </p>

                          {/* Pricing Strip */}
                          <div className="py-2.5 border-y border-slate-100 my-3">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className={`text-xl font-bold font-mono ${isEnterprisePlan ? 'text-purple-900 font-extrabold font-sans' : 'text-slate-900'}`}>
                                {isTrial
                                  ? 'Free'
                                  : isEnterprisePlan
                                    ? 'Custom Pricing'
                                    : formatCurrency(plan.finalPrice)}
                              </span>
                              {!isEnterprisePlan && !isTrial && (
                                <span className="text-xs text-slate-500 font-medium font-sans">
                                  / {plan.durationValue || 1} {plan.durationUnit || 'Year'}
                                </span>
                              )}
                            </div>

                            {hasDiscount && !isEnterprisePlan && !isTrial && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-400 line-through font-mono">
                                  {formatCurrency(plan.basePrice)}
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                                  Save {formatCurrency(plan.discountAmount)}
                                </span>
                              </div>
                            )}

                            {!isEnterprisePlan && !isTrial && (
                              <div className="mt-1 text-[11px] font-semibold text-indigo-600">
                                {formatCurrency(calculateMonthlyPrice(plan))} / month
                              </div>
                            )}
                          </div>

                          {/* Features List */}
                          <div className="space-y-1.5 mb-5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Included:
                            </span>
                            {Array.isArray(plan.features) && plan.features.length > 0 ? (
                              plan.features.map((feat, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                  <span className="leading-tight">{typeof feat === 'string' ? feat : feat.name || feat.title}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400 italic">All core school management modules</span>
                            )}
                          </div>
                        </div>

                        {/* CTA Button */}
                        <Button
                          variant={btnVariant}
                          size="sm"
                          className={`w-full justify-center font-bold text-xs py-2 rounded-xl transition-all cursor-pointer ${
                            isCurrentPlan
                              ? 'bg-slate-100 hover:bg-indigo-50 border-indigo-200 text-indigo-700'
                              : isEnterprisePlan
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                                : ''
                          }`}
                          disabled={btnDisabled}
                          icon={btnDisabled ? undefined : isEnterprisePlan || btnText.includes('Contact Support') ? Phone : ArrowRight}
                          iconPosition="right"
                          onClick={btnAction}
                        >
                          {btnText}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENT & APPROVAL REQUESTS */}
          {activeBottomTab === 'requests' && (
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="border-none">
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200">
                      Requested Date
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200">
                      Plan Name
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200">
                      Payment Method
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200">
                      Reference / Txn ID
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200 text-right">
                      Amount
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200 text-right">
                      Approval Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                        No payment requests submitted yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((req) => (
                      <TableRow key={req.id} className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                        <TableCell className="py-2.5 px-3.5 text-xs font-mono text-slate-500">
                          {formatDate(req.requestedAt)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3.5 font-bold text-slate-900 text-xs">
                          {req.planName}
                        </TableCell>
                        <TableCell className="py-2.5 px-3.5 text-xs text-slate-600 font-medium">
                          {req.paymentMethod}
                        </TableCell>
                        <TableCell className="py-2.5 px-3.5 font-mono text-xs text-slate-500">
                          {req.referenceNumber || '—'}
                        </TableCell>
                        <TableCell className="py-2.5 px-3.5 text-right font-bold text-slate-900 font-mono text-xs">
                          {formatCurrency(req.amount)}
                        </TableCell>
                        <TableCell className="py-2.5 px-3.5 text-right">
                          <Badge variant={req.status === 'PAID' ? 'success' : req.status === 'REJECTED' ? 'danger' : 'warning'} size="sm">
                            {req.status}
                          </Badge>
                          {req.status === 'REJECTED' && req.rejectionReason && (
                            <span className="block text-[10px] text-rose-600 mt-0.5 truncate max-w-[160px] ml-auto" title={req.rejectionReason}>
                              Reason: {req.rejectionReason}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* TAB 3: SUBSCRIPTION HISTORY */}
          {activeBottomTab === 'history' && (
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <Table>
                <TableHeader>
                  <TableRow className="border-none">
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200">
                      Plan
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200">
                      Billing Cycle
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200">
                      Start Date
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200">
                      End Date
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200 text-right">
                      Final Amount
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200 text-right">
                      Payment Status
                    </TableHead>
                    <TableHead className="py-2.5 px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/80 border-b border-slate-200 text-right">
                      Status
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                        No historical subscription records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((h) => {
                      const isCurrentActive = sub?.id === h.id && hasActiveSubscription;
                      return (
                        <TableRow key={h.id} className={isCurrentActive ? 'bg-indigo-50/40 font-medium' : 'hover:bg-slate-50/70 border-b border-slate-100 transition-colors'}>
                          <TableCell className="py-2.5 px-3.5 font-semibold text-slate-900 text-xs">
                            <div className="flex items-center gap-2">
                              <span>{h.planName}</span>
                              {isCurrentActive && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-indigo-600 text-white uppercase tracking-wider">
                                  Current
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 px-3.5 text-xs text-slate-600">{h.duration}</TableCell>
                          <TableCell className="py-2.5 px-3.5 text-xs font-mono text-slate-500">
                            {formatDate(h.startDate)}
                          </TableCell>
                          <TableCell className="py-2.5 px-3.5 text-xs font-mono text-slate-500">
                            {h.endDate ? formatDate(h.endDate) : <span className="text-rose-600 font-medium">N/A (Expired)</span>}
                          </TableCell>
                          <TableCell className="py-2.5 px-3.5 text-right font-bold text-slate-900 font-mono text-xs">
                            {formatCurrency(h.finalPrice)}
                          </TableCell>
                          <TableCell className="py-2.5 px-3.5 text-right text-xs font-semibold text-emerald-600">
                            {h.paymentStatus || 'PAID'}
                          </TableCell>
                          <TableCell className="py-2.5 px-3.5 text-right">
                            <Badge variant={h.status === 'ACTIVE' ? 'success' : h.status === 'SUSPENDED' ? 'warning' : 'danger'} size="sm">
                              {h.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Purchase Plan Modal */}
      {selectedPlan && (
        <Modal
          isOpen={Boolean(selectedPlan)}
          onClose={handleClosePurchaseModal}
          size="sm"
          title={`Subscribe to ${selectedPlan.name.replace(/\s*plan$/i, '')}`}
          description="Instant activation for your institution via secure payment"
        >
          <div className="space-y-4">
            {/* Modal-level Error Banner */}
            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-medium text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">{modalError}</div>
              </div>
            )}

            {/* Plan Summary Receipt Card */}
            {(() => {
              const finalPrice = selectedPlan.finalPrice ?? selectedPlan.basePrice ?? selectedPlan.price ?? 0;
              const hasDiscount = (selectedPlan.discountAmount > 0 || (selectedPlan.basePrice && selectedPlan.basePrice > finalPrice));
              const durationText = `${selectedPlan.durationValue || 1} ${selectedPlan.durationUnit?.toLowerCase() || 'year'}${(selectedPlan.durationValue || 1) > 1 ? 's' : ''}`;

              return (
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{selectedPlan.name}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                          {durationText}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedPlan.maxStudentLimit
                          ? `Up to ${Number(selectedPlan.maxStudentLimit).toLocaleString('en-IN')} active students`
                          : 'Unlimited active students'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-slate-900 tracking-tight">
                        {formatCurrency(finalPrice)}
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">total due</span>
                    </div>
                  </div>

                  {hasDiscount && (
                    <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
                      <span>Standard price</span>
                      <div className="flex items-center gap-2">
                        <span className="line-through text-slate-400">{formatCurrency(selectedPlan.basePrice)}</span>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-1.5 py-0.5 rounded">
                          Save {formatCurrency(selectedPlan.discountAmount || (selectedPlan.basePrice - finalPrice))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Streamlined Payment Method Bar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-white text-xs">
              <div className="flex items-center gap-2.5 text-slate-700">
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                  <CreditCard className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-slate-900 font-semibold block text-xs">Razorpay Secure Checkout</span>
                  <span className="text-[11px] text-slate-500">UPI, Credit/Debit Cards, NetBanking</span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-full shrink-0">
                <Zap className="w-3 h-3 text-emerald-600" /> Instant
              </span>
            </div>

            {/* Clean Terms & Non-Refundable Policy Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={noRefundAccepted}
                  onChange={(e) => {
                    setNoRefundAccepted(e.target.checked);
                    if (modalError) setModalError('');
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer shrink-0"
                />
                <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors leading-relaxed">
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setTermsModalOpen(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 underline font-medium cursor-pointer"
                  >
                    Terms of Service
                  </button>{' '}
                  and understand subscription purchases are non-refundable after activation.
                </span>
              </label>
            </div>

            {/* Checkout Action CTA & Subtle Security Guarantee */}
            <div className="pt-2 space-y-3">
              <RazorpayCheckoutButton
                amountInRupees={selectedPlan?.finalPrice ?? selectedPlan?.basePrice ?? selectedPlan?.price ?? 0}
                name={`AxomSetu - ${selectedPlan?.name || 'Subscription'}`}
                description={`Subscription Plan: ${selectedPlan?.name || ''}`}
                disabled={submitting || !noRefundAccepted}
                buttonText={`Pay ${formatCurrency(selectedPlan?.finalPrice ?? selectedPlan?.basePrice ?? selectedPlan?.price ?? 0)} & Activate`}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
                onSuccess={async (paymentRes) => {
                  const refNo =
                    paymentRes.payment_id ||
                    paymentRes.razorpay_payment_id ||
                    paymentRes.response?.razorpay_payment_id;
                  const orderId =
                    paymentRes.order_id ||
                    paymentRes.razorpay_order_id ||
                    paymentRes.response?.razorpay_order_id;
                  const signature =
                    paymentRes.signature ||
                    paymentRes.razorpay_signature ||
                    paymentRes.response?.razorpay_signature;
                  try {
                    setSubmitting(true);
                    const res = await subscriptionService.submitPurchaseRequest({
                      planId: selectedPlan.id,
                      paymentMethod: 'RAZORPAY',
                      referenceNumber: refNo,
                      razorpayPaymentId: refNo,
                      razorpayOrderId: orderId,
                      razorpaySignature: signature,
                      razorpay_payment_id: refNo,
                      razorpay_order_id: orderId,
                      razorpay_signature: signature,
                      remarks: `Razorpay Order: ${orderId}`,
                      noRefundAccepted: true,
                    });

                    if (res && res.success) {
                      toast.success('🎉 Payment verified! Your subscription has been activated immediately.');
                      setSelectedPlan(null);
                      await Promise.all([fetchSubscriptionDetails(), refreshSubscription?.()]);
                    } else {
                      toast.error(res?.message || 'Failed processing subscription activation');
                    }
                  } catch (err) {
                    toast.error(err.message || 'Failed processing subscription activation');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>256-bit SSL Encrypted • Powered by Razorpay</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Enterprise Contact Support Modal */}
      {contactSupportModalOpen && (
        <Modal
          isOpen={contactSupportModalOpen}
          onClose={() => setContactSupportModalOpen(false)}
          title="Contact Enterprise Support"
        >
          <div className="space-y-5 text-xs text-slate-700">
            <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl space-y-1">
              <h4 className="text-sm font-bold text-purple-950 flex items-center gap-2">
                <Headphones className="w-4 h-4 text-purple-700" />
                Enterprise Custom Deployment & Upgrades
              </h4>
              <p className="text-purple-800 leading-relaxed text-xs">
                {contactModalPlan
                  ? `You are inquiring about the ${contactModalPlan.name} tier.`
                  : 'For custom student capacity, dedicated cloud infrastructure, custom domain setups, or custom payment gateway integration, please contact our enterprise sales desk.'}
              </p>
            </div>

            <div className="space-y-3">
              {/* Dynamic Phone / Sales Hotline */}
              {(platformContact?.supportPhone || platformContact?.phone) && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Direct Sales & Support Hotline</span>
                    <a href={`tel:${platformContact.supportPhone || platformContact.phone}`} className="font-mono text-sm font-bold text-indigo-600 hover:underline">
                      {platformContact.supportPhone || platformContact.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Dynamic Support Email */}
              {(platformContact?.supportEmail || platformContact?.email) && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Enterprise Support Email</span>
                    <a href={`mailto:${platformContact.supportEmail || platformContact.email}`} className="font-mono text-sm font-bold text-purple-700 hover:underline">
                      {platformContact.supportEmail || platformContact.email}
                    </a>
                  </div>
                </div>
              )}

              {/* Dynamic WhatsApp Support */}
              {(platformContact?.whatsappNumber || platformContact?.whatsapp) && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">WhatsApp Enterprise Support</span>
                    <a
                      href={`https://wa.me/${(platformContact.whatsappNumber || platformContact.whatsapp || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm font-bold text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>{platformContact.whatsappNumber || platformContact.whatsapp}</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Designated Contact Persons from Database */}
              {Array.isArray(platformContact?.contactPersons) && platformContact.contactPersons.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Designated Support Contacts</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {platformContact.contactPersons.map((cp, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-0.5">
                        <div className="font-bold text-slate-900 text-xs flex items-center justify-between">
                          <span>{cp.name}</span>
                          {cp.isPrimary && (
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded">Primary</span>
                          )}
                        </div>
                        {cp.role && <div className="text-[10px] text-slate-500 font-medium">{cp.role}</div>}
                        {cp.phone && <div className="text-[10px] font-mono text-indigo-600">{cp.phone}</div>}
                        {cp.email && <div className="text-[10px] font-mono text-slate-600 truncate">{cp.email}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-100 rounded-xl text-slate-600 leading-relaxed text-[11px]">
              <strong>Note:</strong> Super Admins will review your school workspace profile and issue custom enterprise subscription invoices directly to your account.
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button variant="primary" onClick={() => setContactSupportModalOpen(false)}>
                Close Contact Info
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Razorpay Merchant & Platform Compliance Footer */}
      <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            RZP
          </div>
          <div>
            <div className="font-bold text-slate-800">AxomSetu School SaaS Platform • Managed by NEXUMBYTE</div>
            <div className="text-[11px] text-slate-500">256-Bit SSL Encrypted Secure Payments Powered by Razorpay</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTermsModalOpen(true)}
            className="text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
          >
            Terms & Conditions
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setTermsModalOpen(true)}
            className="text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setContactSupportModalOpen(true)}
            className="text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
          >
            Contact & Support
          </button>
        </div>
      </div>

      {/* Legal Terms & Privacy Modal */}
      <TermsAndConditionsModal
        isOpen={termsModalOpen}
        onClose={() => setTermsModalOpen(false)}
        onAccept={() => {
          setNoRefundAccepted(true);
          setTermsModalOpen(false);
        }}
        onDecline={() => setTermsModalOpen(false)}
        isAccepted={noRefundAccepted}
      />
    </div>
  );
};
