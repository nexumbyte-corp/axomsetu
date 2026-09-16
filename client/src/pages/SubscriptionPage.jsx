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
  FileText,
} from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { PAGE_SEO } from '../config/seoConfig.js';
import { formatDate } from '../utils/formatters.js';

import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';
import { Toast, toast } from '../components/ui/Toast.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card, CardContent } from '../components/ui/Card.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
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
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
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
    setPaymentMethod('RAZORPAY');
    setReferenceNumber('');
    setRemarks('');
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

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setModalError('');

    if (paymentMethod === 'UPI' && !referenceNumber.trim()) {
      const msg = 'Please enter the 12-digit UPI transaction / reference number.';
      setModalError(msg);
      toast.error(msg);
      return;
    }

    if (!noRefundAccepted) {
      const msg = 'You must acknowledge and accept the non-refundable subscription policy before submitting.';
      setModalError(msg);
      toast.error(msg);
      return;
    }


    setSubmitting(true);
    try {
      const res = await subscriptionService.submitPurchaseRequest({
        planId: selectedPlan.id,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || null,
        remarks: remarks.trim() || null,
        noRefundAccepted: true,
      });

      if (res && res.success) {
        const successMsg = res.message || 'Payment request submitted successfully. Awaiting Super Admin approval.';
        toast.success(successMsg);
        setToastMessage({
          type: 'success',
          message: successMsg,
        });
        setSelectedPlan(null);
        await Promise.all([
          fetchSubscriptionDetails(),
          refreshSubscription?.(),
        ]);
      } else {
        const errorMsg = res?.message || 'Failed to submit payment request.';
        setModalError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to submit payment request. Please try again.';
      setModalError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

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
        description="Monitor active school plan validity, capacity metrics, payment requests, and billing history."
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
        <Card className="shadow-xs border-slate-200">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              {/* Left Column: Plan Title & Details */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
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

                <div>
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                    <span>{sub?.planName || 'No Active Subscription Plan'}</span>
                    {hasActiveSubscription && !isTrialPlan && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
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
                  </h2>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 font-medium">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>
                      Validity: <strong>{formatDate(sub?.startDate, '-')}</strong> to{' '}
                      <strong>{formatDate(sub?.endDate, 'N/A (Expired)')}</strong>
                    </span>
                  </p>
                </div>
              </div>

              {/* Right Column: Days Remaining Metric Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[240px] shrink-0 text-center lg:text-right space-y-2">
                <span className="text-xs font-semibold text-slate-500 block">Remaining Active Days</span>
                <div className="text-3xl font-bold text-slate-900 font-mono">
                  {remainingDays}{' '}
                  <span className="text-xs font-normal text-slate-500 font-sans">Days</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${remainingDays > 30
                        ? 'bg-emerald-500'
                        : remainingDays > 10
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    style={{ width: `${Math.min(100, (remainingDays / 60) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Grid Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Billing Cycle</span>
                <span className="font-semibold text-slate-800 text-xs mt-0.5 block">{sub?.duration || '-'}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Student Limit</span>
                <span className="font-bold text-indigo-700 font-mono text-xs mt-0.5 block">
                  {currentSubData?.activeStudentCount ?? 0} / {sub?.maxStudentLimit ? `${sub.maxStudentLimit}` : 'Unlimited'}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Base Price</span>
                <span className="font-semibold text-slate-800 text-xs mt-0.5 block">{formatCurrency(sub?.basePrice)}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Discount Savings</span>
                <span className="font-semibold text-emerald-700 text-xs mt-0.5 block">{formatCurrency(sub?.discount)}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Final Price</span>
                <span className="font-bold text-slate-900 font-mono text-xs mt-0.5 block">{formatCurrency(sub?.finalPrice)}</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Payment Status</span>
                <span className="font-bold text-emerald-700 text-xs mt-0.5 block">{sub?.paymentStatus || 'PAID'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Main Tabbed Container: Available Plans, Payment Requests & Subscription History */}
      <Card className="shadow-xs border-slate-200">
        <div className="border-b border-slate-200 px-6 pt-4 flex items-center gap-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveBottomTab('plans')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeBottomTab === 'plans'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <Zap className="w-4 h-4" />
            Available Subscription Plans ({plans.length})
          </button>

          <button
            onClick={() => setActiveBottomTab('requests')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeBottomTab === 'requests'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <Clock className="w-4 h-4" />
            Payment & Approval Requests ({requests.length})
          </button>

          <button
            onClick={() => setActiveBottomTab('history')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeBottomTab === 'history'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <History className="w-4 h-4" />
            Subscription History ({history.length})
          </button>
        </div>

        <CardContent className="p-6">
          {/* TAB 1: AVAILABLE SUBSCRIPTION PLANS */}
          {activeBottomTab === 'plans' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Select Subscription Tier</h3>
                  <p className="text-xs text-slate-500">
                    {hasActiveSubscription
                      ? 'Upgrade your capacity tier, renew your current active plan, or contact support for custom enterprise setup.'
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch pt-2">
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
                        btnText = 'Current Plan (Included)';
                        btnDisabled = true;
                        btnVariant = 'outline';
                      }
                    }

                    return (
                      <div
                        key={plan.id}
                        className={`bg-white rounded-xl p-6 border shadow-2xs flex flex-col justify-between transition-all relative ${isCurrentPlan
                            ? 'border-indigo-400 ring-2 ring-indigo-100'
                            : isEnterprisePlan
                              ? 'border-purple-300 ring-1 ring-purple-100'
                              : 'border-slate-200 hover:border-indigo-300'
                          }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2 gap-1.5 flex-wrap">
                            <h4 className="text-lg font-bold text-slate-900">{plan.name}</h4>
                            {isCurrentPlan ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-600 text-white uppercase tracking-wider">
                                Current Plan
                              </span>
                            ) : isTrial ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Trial
                              </span>
                            ) : isEnterprisePlan ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                Enterprise
                              </span>
                            ) : plan.badge ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                                {plan.badge}
                              </span>
                            ) : null}
                          </div>

                          {/* Student Capacity Highlight Badge */}
                          <div className="mb-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold border ${isEnterprisePlan
                                  ? 'bg-purple-50 text-purple-900 border-purple-200/90'
                                  : plan.maxStudentLimit
                                    ? 'bg-indigo-50 text-indigo-800 border-indigo-200/90'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
                                }`}
                            >
                              <Users className="w-3.5 h-3.5 shrink-0" />
                              <span>
                                {isEnterprisePlan
                                  ? 'Custom Student Capacity (Contact Sales)'
                                  : plan.type === 'ENTERPRISE' || planNameLower.includes('enterprise')
                                    ? 'Custom Capacity (Unlimited Active Students)'
                                    : plan.maxStudentLimit
                                      ? `Upto ${plan.maxStudentLimit} Active Students`
                                      : 'Unlimited Active Students'}
                              </span>
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mb-4 min-h-[32px] leading-relaxed">{plan.description}</p>

                          {/* Pricing Box - Styled as per Landing Page */}
                          <div className="py-3 border-y border-slate-100 my-4">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className={`text-2xl font-bold ${isEnterprisePlan ? 'text-purple-900 font-extrabold' : 'text-slate-900'}`}>
                                {isTrial
                                  ? 'Free'
                                  : isEnterprisePlan
                                    ? 'Custom Pricing'
                                    : formatCurrency(plan.finalPrice)}
                              </span>
                              {!isEnterprisePlan && !isTrial && (
                                <span className="text-xs text-slate-500 font-medium">
                                  / {plan.durationValue || 1} {plan.durationUnit || 'Year'}
                                </span>
                              )}
                            </div>
                            {hasDiscount && !isEnterprisePlan && !isTrial && (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-400 line-through">
                                  {formatCurrency(plan.basePrice)}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                  Save {formatCurrency(plan.discountAmount)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Feature List */}
                          <div className="space-y-2 mb-6">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Included Features:
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

                        {/* Action CTA Button */}
                        <Button
                          variant={btnVariant}
                          size="md"
                          className={`w-full justify-center font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer ${isCurrentPlan
                              ? 'bg-slate-100 hover:bg-indigo-50 border-indigo-200 text-indigo-700'
                              : isEnterprisePlan
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested Date</TableHead>
                  <TableHead>Plan Name</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Reference / Txn ID</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Approval Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                      No payment requests submitted yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-slate-50/80 transition-colors">
                      <TableCell className="text-xs font-mono text-slate-500">
                        {formatDate(req.requestedAt)}
                      </TableCell>
                      <TableCell className="font-bold text-slate-900 text-xs">{req.planName}</TableCell>
                      <TableCell className="text-xs text-slate-600 font-medium">{req.paymentMethod}</TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">{req.referenceNumber || '-'}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900 font-mono text-xs">
                        {formatCurrency(req.amount)}
                      </TableCell>
                      <TableCell className="text-right">
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
          )}

          {/* TAB 3: SUBSCRIPTION HISTORY */}
          {activeBottomTab === 'history' && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Billing Cycle</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Final Amount</TableHead>
                  <TableHead className="text-right">Payment Status</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                      No historical subscription records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((h) => {
                    const isCurrentActive = sub?.id === h.id && hasActiveSubscription;
                    return (
                      <TableRow key={h.id} className={isCurrentActive ? 'bg-indigo-50/40 font-medium' : 'hover:bg-slate-50/80 transition-colors'}>
                        <TableCell className="font-semibold text-slate-900 text-xs">
                          <div className="flex items-center gap-2">
                            <span>{h.planName}</span>
                            {isCurrentActive && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-600 text-white uppercase tracking-wider">
                                Current
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-600">{h.duration}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">
                          {formatDate(h.startDate)}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">
                          {h.endDate ? formatDate(h.endDate) : <span className="text-rose-600 font-medium">N/A (Expired)</span>}
                        </TableCell>
                        <TableCell className="text-right font-bold text-slate-900 font-mono text-xs">
                          {formatCurrency(h.finalPrice)}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-emerald-600">
                          {h.paymentStatus || 'PAID'}
                        </TableCell>
                        <TableCell className="text-right">
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
          )}
        </CardContent>
      </Card>

      {/* Purchase Plan Modal */}
      {selectedPlan && (
        <Modal
          isOpen={Boolean(selectedPlan)}
          onClose={handleClosePurchaseModal}
          size="lg"
          title={`Subscribe to ${selectedPlan.name.replace(/\s*plan$/i, '')}`}
        >
          <form onSubmit={handleSubmitPurchase} autoComplete="off" className="space-y-4">
            {/* Modal-level Error Banner */}
            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">{modalError}</div>
              </div>
            )}

            {/* Plan Summary Card */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Selected Plan</span>
                <span>{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-600 mt-1">
                <span>Billing Duration</span>
                <span>
                  {selectedPlan.durationValue} {selectedPlan.durationUnit?.toLowerCase() || 'year'}{(selectedPlan.durationValue || 1) > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-extrabold text-indigo-700 mt-3 pt-3 border-t border-slate-200 font-mono">
                <span>Total Amount Due</span>
                <span>{formatCurrency(selectedPlan.finalPrice ?? selectedPlan.basePrice)}</span>
              </div>
            </div>

            {/* Payment Method Options (Razorpay Online & Hidden Cash Option) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Select Payment Method *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('RAZORPAY');
                    if (modalError) setModalError('');
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${paymentMethod === 'RAZORPAY'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold ring-1 ring-indigo-500 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <div>
                    <span className="text-xs block font-bold">Online Payment</span>
                    <span className="text-[11px] text-indigo-600 font-medium">Instant Automatic Activation</span>
                  </div>
                  <CreditCard className="w-5 h-5 text-indigo-600 shrink-0" />
                </button>

                {/* Cash option hidden from UI */}
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('CASH');
                    if (modalError) setModalError('');
                  }}
                  className={`hidden p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${paymentMethod === 'CASH'
                      ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 font-bold ring-1 ring-indigo-500 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <div>
                    <span className="text-xs block font-bold">Cash / Direct</span>
                    <span className="text-[11px] text-slate-500">Requires Admin Approval</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Payment Method Details */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-2">
                <Input
                  label="Reference / Receipt Number (Optional)"
                  placeholder="Cash receipt or transaction note..."
                  value={referenceNumber}
                  onChange={(e) => {
                    setReferenceNumber(e.target.value);
                    if (modalError) setModalError('');
                  }}
                />
              </div>
            )}

            {paymentMethod === 'RAZORPAY' && (
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3 text-xs text-indigo-900">
                <p className="font-bold">⚡ Instant Activation:</p>
                <p className="text-[11px] text-indigo-800 mt-0.5">
                  Upon completing Razorpay payment, your subscription will be activated automatically with immediate access.
                </p>
              </div>
            )}

            <Input
              label="Remarks / Notes (Optional)"
              placeholder="Add optional payment details..."
              value={remarks}
              onChange={(e) => {
                setRemarks(e.target.value);
                if (modalError) setModalError('');
              }}
            />

            {/* Razorpay Merchant Compliance & Policy Links */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Secured by Razorpay • 256-Bit SSL Encrypted</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTermsModalOpen(true)}
                  className="text-indigo-600 hover:text-indigo-800 underline font-extrabold cursor-pointer flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  <span>Terms & Privacy Policy</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-500 leading-snug">
                Digital SaaS Fulfillment: Subscription plan features are activated instantly upon successful payment. All prices are in INR (₹).
              </div>
            </div>

            {/* Mandatory Refund Confirmation */}
            <div className={`rounded-xl p-3 space-y-1 border transition-all ${!noRefundAccepted && modalError
                ? 'bg-rose-100/70 border-rose-400 ring-2 ring-rose-300'
                : 'bg-rose-50/80 border-rose-200'
              }`}>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noRefundAccepted}
                  onChange={(e) => {
                    setNoRefundAccepted(e.target.checked);
                    if (modalError) setModalError('');
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold text-rose-950">
                  I agree to the Terms of Service & understand subscription purchases are non-refundable after activation. <span className="text-rose-600 font-black">*</span>
                </span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={handleClosePurchaseModal} disabled={submitting}>
                Cancel
              </Button>
              {paymentMethod === 'RAZORPAY' ? (
                <RazorpayCheckoutButton
                  amountInRupees={selectedPlan?.finalPrice ?? selectedPlan?.basePrice ?? selectedPlan?.price ?? 0}
                  name={`AxomSetu - ${selectedPlan?.name || 'Subscription'}`}
                  description={`Subscription Purchase (${selectedPlan?.name || ''})`}
                  disabled={submitting || !noRefundAccepted}
                  buttonText={`Pay ₹${(selectedPlan?.finalPrice ?? selectedPlan?.basePrice ?? selectedPlan?.price ?? 0).toLocaleString('en-IN')} & Activate Now`}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer"
                  onSuccess={async (paymentRes) => {
                    const refNo = paymentRes.payment_id || paymentRes.response?.razorpay_payment_id;
                    try {
                      setSubmitting(true);
                      const res = await subscriptionService.submitPurchaseRequest({
                        planId: selectedPlan.id,
                        paymentMethod: 'RAZORPAY',
                        referenceNumber: refNo,
                        remarks: remarks.trim() ? `${remarks.trim()} | Razorpay Order: ${paymentRes.order_id}` : `Razorpay Order: ${paymentRes.order_id}`,
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
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  loading={submitting}
                  loadingText="Submitting Request..."
                >
                </Button>
              )}
            </div>
          </form>
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
