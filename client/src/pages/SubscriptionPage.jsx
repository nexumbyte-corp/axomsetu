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
} from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
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

export const SubscriptionPage = () => {
  useDocumentTitle('Subscription Management');
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
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [noRefundAccepted, setNoRefundAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

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

  const handleOpenPurchaseModal = (plan) => {
    setSelectedPlan(plan);
    setPaymentMethod('UPI');
    setReferenceNumber('');
    setRemarks('');
    setNoRefundAccepted(false);
    setModalError('');
  };

  const handleClosePurchaseModal = () => {
    if (submitting) return;
    setSelectedPlan(null);
    setModalError('');
  };

  const handleOpenContactModal = (plan = null) => {
    setContactModalPlan(plan);
    setContactSupportModalOpen(true);
  };

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

    if (paymentMethod === 'RAZORPAY') {
      const msg = 'Razorpay is coming soon. Please select Cash or UPI.';
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

  // Find matching plan object for current sub if available
  const currentMatchingPlan = plans.find(
    (p) => p.id === sub?.planId || p.name?.toLowerCase() === currentPlanNameLower
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
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

      {/* Active Subscription Summary Card */}
      {loading ? (
        <TableSkeleton rows={2} cols={4} />
      ) : (
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
                    className={`h-full transition-all duration-500 ${
                      remainingDays > 30
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
      )}

      {/* Main Tabbed Container: Available Plans, Payment Requests & Subscription History */}
      <Card className="shadow-xs border-slate-200">
        <div className="border-b border-slate-200 px-6 pt-4 flex items-center gap-6 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveBottomTab('plans')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeBottomTab === 'plans'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            Available Subscription Plans ({plans.length})
          </button>

          <button
            onClick={() => setActiveBottomTab('requests')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeBottomTab === 'requests'
                ? 'border-indigo-600 text-indigo-600 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            Payment & Approval Requests ({requests.length})
          </button>

          <button
            onClick={() => setActiveBottomTab('history')}
            className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
              activeBottomTab === 'history'
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch pt-2">
                {plans.map((plan) => {
                  const hasDiscount = plan.discountAmount > 0 || plan.discountPercentage > 0;
                  const planNameLower = plan.name?.toLowerCase() || '';
                  const isEnterprisePlan = Boolean(plan.isEnterprise || plan.type === 'ENTERPRISE' || planNameLower.includes('enterprise'));
                  const isTrial = Boolean(plan.isTrial || plan.type === 'TRIAL' || planNameLower.includes('trial'));
                  const isCurrentPlan = Boolean(
                    sub?.planId === plan.id ||
                    currentPlanNameLower === planNameLower ||
                    (isCurrentEnterprise && isEnterprisePlan)
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
                      className={`bg-white rounded-xl p-6 border shadow-2xs flex flex-col justify-between transition-all relative ${
                        isCurrentPlan
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
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold border ${
                              isEnterprisePlan
                                ? 'bg-purple-50 text-purple-900 border-purple-200/90'
                                : plan.maxStudentLimit
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200/90'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200/90'
                            }`}
                          >
                            <Users className={`w-3.5 h-3.5 shrink-0 ${isEnterprisePlan ? 'text-purple-600' : plan.maxStudentLimit ? 'text-indigo-600' : 'text-emerald-600'}`} />
                            <span>
                              {isEnterprisePlan
                                ? (plan.maxStudentLimit ? `${plan.maxStudentLimit}+ Active Students` : '701+ Active Students')
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
                                : isEnterprisePlan || plan.finalPrice === 0
                                  ? 'Custom Price'
                                  : formatCurrency(plan.finalPrice)}
                            </span>
                            {!isTrial && !isEnterprisePlan && plan.finalPrice > 0 && (
                              <span className="text-xs text-slate-500">
                                / {plan.durationValue} {plan.durationUnit?.toLowerCase() || 'year'}{(plan.durationValue || 1) > 1 ? 's' : ''}
                              </span>
                            )}
                            {isEnterprisePlan && (
                              <span className="text-[11px] font-medium text-purple-700 block mt-0.5">
                                Tailored to school requirements
                              </span>
                            )}
                          </div>

                          {hasDiscount && !isEnterprisePlan && !isTrial && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs text-slate-400 line-through font-mono">
                                {formatCurrency(plan.basePrice)}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {plan.discountPercentage > 0
                                  ? `${plan.discountPercentage}% OFF`
                                  : `Save ${formatCurrency(plan.discountAmount)}`}
                              </span>
                            </div>
                          )}

                          {plan.offerTitle && (
                            <div className="mt-2.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 p-1.5 rounded-lg flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              <span>{plan.offerTitle}</span>
                            </div>
                          )}
                        </div>

                        {/* Features List - Styled as per Landing Page */}
                        <div className="space-y-2 mb-6">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                            Features Included
                          </span>
                          {Array.isArray(plan.features) &&
                            plan.features.map((feat, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{typeof feat === 'string' ? feat : feat.name}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      <Button
                        variant={btnVariant}
                        disabled={btnDisabled}
                        className={`w-full justify-center py-2 text-xs font-semibold rounded-lg shadow-xs ${
                          isEnterprisePlan
                            ? 'bg-purple-600 hover:bg-purple-700 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                        icon={isEnterprisePlan || btnText.includes('Contact Support') ? Phone : ArrowRight}
                        iconPosition="right"
                        onClick={btnAction}
                      >
                        {btnText}
                      </Button>
                    </div>
                  );
                })}
              </div>
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
        <Modal isOpen={Boolean(selectedPlan)} onClose={handleClosePurchaseModal} title={`Subscribe to ${selectedPlan.name} Plan`}>
          <form onSubmit={handleSubmitPurchase} autoComplete="off" className="space-y-5">
            {/* Modal-level Error Banner */}
            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">{modalError}</div>
              </div>
            )}

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
                <span>{formatCurrency(selectedPlan.finalPrice)}</span>
              </div>
            </div>

            {/* Payment Method Options */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Payment Method *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('UPI');
                    if (modalError) setModalError('');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'UPI'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-xs block font-bold">UPI Payment</span>
                  <span className="text-[10px] text-slate-500">Google Pay, PhonePe, Paytm</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('CASH');
                    if (modalError) setModalError('');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    paymentMethod === 'CASH'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-xs block font-bold">Cash / Direct</span>
                  <span className="text-[10px] text-slate-500">Manual Verification</span>
                </button>

                <button
                  type="button"
                  disabled
                  className="p-3 rounded-xl border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed text-center opacity-70"
                >
                  <span className="text-xs block font-bold">Razorpay</span>
                  <span className="text-[9px] text-amber-600 font-semibold block">Coming Soon</span>
                </button>
              </div>
            </div>

            {/* Method Details */}
            {paymentMethod === 'CASH' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-semibold mb-1">Cash Payment Notice:</p>
                <p>Cash payments require manual verification and approval by the Super Admin before the subscription becomes active.</p>
              </div>
            )}

            {paymentMethod === 'UPI' && (
              <div className="space-y-3">
                <Input
                  label="UPI Transaction / Reference Number *"
                  placeholder="Enter 12-digit UPI reference number"
                  value={referenceNumber}
                  onChange={(e) => {
                    setReferenceNumber(e.target.value);
                    if (modalError) setModalError('');
                  }}
                  required
                />
                <p className="text-[11px] text-slate-500">
                  Please enter the 12-digit transaction reference number generated after completing your UPI transfer.
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

            {/* No Refund Policy Notice & Mandatory Confirmation */}
            <div className={`rounded-xl p-3.5 space-y-2 border transition-all ${
              !noRefundAccepted && modalError
                ? 'bg-rose-100/70 border-rose-400 ring-2 ring-rose-300'
                : 'bg-rose-50/80 border-rose-200'
            }`}>
              <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Subscription Refund Policy Notice</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed font-medium">
                "Subscription purchases are non-refundable after activation, except where required by applicable law or expressly approved by NEXUMBYTE."
              </p>
              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={noRefundAccepted}
                  onChange={(e) => {
                    setNoRefundAccepted(e.target.checked);
                    if (modalError) setModalError('');
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-rose-950">
                  I understand and agree that subscription purchases are non-refundable after activation. <span className="text-rose-600 font-black">*</span>
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={handleClosePurchaseModal} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                loading={submitting}
                loadingText="Submitting Request..."
              >
                Submit Purchase Request
              </Button>
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
    </div>
  );
};
