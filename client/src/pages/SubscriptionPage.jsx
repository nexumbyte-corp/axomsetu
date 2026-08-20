import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, AlertTriangle, ArrowRight, RefreshCw, Zap, Check, AlertCircle } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';
import { Toast, toast } from '../components/ui/Toast.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';

export const SubscriptionPage = () => {
  useDocumentTitle('Subscription');
  const { currentSubData: contextSubData, refreshSubscription } = useSubscription();
  const [currentSubData, setCurrentSubData] = useState(contextSubData || null);
  const [plans, setPlans] = useState([]);
  const [requests, setRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(!contextSubData);
  const [toastMessage, setToastMessage] = useState(null);

  // Purchase Modal State
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [noRefundAccepted, setNoRefundAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchSubscriptionDetails = useCallback(async () => {
    try {
      const [subRes, plansRes, reqsRes, histRes] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getActivePlans(),
        subscriptionService.getPaymentRequests(),
        subscriptionService.getSubscriptionHistory(),
      ]);

      if (subRes?.success) setCurrentSubData(subRes.data);
      if (plansRes?.success) setPlans(plansRes.data || []);
      if (reqsRes?.success) setRequests(reqsRes.data || []);
      if (histRes?.success) setHistory(histRes.data || []);
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
  const _isExpired = currentSubData?.status === 'EXPIRED' || (remainingDays === 0 && sub?.status !== 'ACTIVE');
  const isSuspended = currentSubData?.status === 'SUSPENDED' || sub?.status === 'SUSPENDED';

  return (
    <div className="space-y-8">
      {toastMessage && <Toast type={toastMessage.type} message={toastMessage.message} onClose={() => setToastMessage(null)} />}

      <ModulePageHeader
        title="Subscription Management"
        description="View your active school plan, track subscription status, and view subscription history."
      />

      {/* Warning Alert for Expired or Suspended Subscription */}
      {(!hasActiveSubscription) && (
        <div className="bg-rose-50 border-l-4 border-rose-600 rounded-xl p-4 sm:p-6 shadow-sm flex items-start gap-4">
          <div className="p-2 rounded-lg bg-rose-100 text-rose-700 shrink-0 mt-0.5">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-rose-900">
              {isSuspended ? 'School Account Suspended' : 'No Active Subscription'}
            </h3>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              {isSuspended
                ? 'Your school subscription has been suspended by the platform administrator. Operational modules (students, staff, fees, finance, reports, settings) are restricted.'
                : 'Your school does not currently have an active subscription plan. Select an available plan below to purchase/activate your workspace operations.'}
            </p>
          </div>
        </div>
      )}

      {/* Current Active Plan Primary Details Card */}
      {loading ? (
        <TableSkeleton rows={2} cols={4} />
      ) : (
        <Card className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Current Active Plan
                </span>
                <Badge
                  variant={
                    hasActiveSubscription
                      ? 'success'
                      : isSuspended
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {hasActiveSubscription
                    ? 'ACTIVE'
                    : isSuspended
                    ? 'SUSPENDED'
                    : 'INACTIVE'}
                </Badge>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {sub?.planName || 'No Active Plan'}
              </h2>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>
                  Validity: {sub?.startDate ? new Date(sub.startDate).toLocaleDateString('en-IN') : '-'} to{' '}
                  {sub?.endDate ? new Date(sub.endDate).toLocaleDateString('en-IN') : 'N/A (Expired)'}
                </span>
              </p>
            </div>

            {/* Remaining Days Widget */}
            <div className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700/80 min-w-[240px] text-center sm:text-right">
              <span className="text-xs text-slate-400 block font-medium">Days Remaining</span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1 font-mono">
                {remainingDays}{' '}
                <span className="text-xs font-normal text-slate-400 font-sans">Days</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
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

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block">Billing Cycle</span>
              <span className="font-semibold text-slate-200">{sub?.duration || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Base Price</span>
              <span className="font-semibold text-slate-200">{formatCurrency(sub?.basePrice)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Applied Discount</span>
              <span className="font-semibold text-emerald-400">{formatCurrency(sub?.discount)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Final Price</span>
              <span className="font-bold text-white font-mono">{formatCurrency(sub?.finalPrice)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Payment Status</span>
              <span className="font-semibold text-emerald-400">{sub?.paymentStatus || 'PAID'}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Available Plans Section - Displayed ONLY when school has NO active subscription */}
      {!hasActiveSubscription && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Available Subscription Plans</h3>
              <p className="text-xs text-slate-500">Select a subscription plan to activate operational access for your institution.</p>
            </div>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchSubscriptionDetails}>
              Refresh Plans
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const hasDiscount = plan.discountAmount > 0 || plan.discountPercentage > 0;
              return (
                <div
                  key={plan.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-xl hover:border-indigo-400 transition-all duration-300 flex flex-col justify-between relative group"
                >
                  {plan.badge && (
                    <div className="absolute -top-3 right-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full shadow-md tracking-wider">
                      {plan.badge}
                    </div>
                  )}

                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{plan.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 min-h-[36px]">{plan.description}</p>

                    <div className="my-6 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
                          {formatCurrency(plan.finalPrice)}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          / {plan.durationValue} {plan.durationUnit.toLowerCase()}{plan.durationValue > 1 ? 's' : ''}
                        </span>
                      </div>

                      {hasDiscount && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-slate-400 line-through font-mono">
                            {formatCurrency(plan.basePrice)}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            {plan.discountPercentage > 0 ? `${plan.discountPercentage}% OFF` : `Save ${formatCurrency(plan.discountAmount)}`}
                          </span>
                        </div>
                      )}

                      {plan.offerTitle && (
                        <div className="mt-3 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 p-2 rounded-lg flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{plan.offerTitle}</span>
                        </div>
                      )}
                    </div>

                    {/* Features List */}
                    <div className="space-y-2.5 mb-6">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
                        Included Features
                      </span>
                      {Array.isArray(plan.features) &&
                        plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 text-xs text-slate-700">
                            <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                            <span>{typeof feat === 'string' ? feat : feat.name}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-full justify-center py-2.5 shadow-md shadow-indigo-600/10 font-bold"
                    icon={ArrowRight}
                    iconPosition="right"
                    onClick={() => handleOpenPurchaseModal(plan)}
                  >
                    Subscribe Now
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Requests Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Payment Requests</h3>
            <p className="text-xs text-slate-500">Track pending and past payment approval requests.</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requested Date</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference / Txn ID</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Status</TableHead>
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
                <TableRow key={req.id}>
                  <TableCell className="text-xs font-mono text-slate-500">
                    {new Date(req.requestedAt).toLocaleDateString('en-IN')}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900 text-xs">{req.planName}</TableCell>
                  <TableCell className="text-xs text-slate-600 font-medium">{req.paymentMethod}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">{req.referenceNumber || '-'}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900 font-mono text-xs">
                    {formatCurrency(req.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={req.status === 'PAID' ? 'success' : req.status === 'REJECTED' ? 'danger' : 'warning'}>
                      {req.status}
                    </Badge>
                    {req.status === 'REJECTED' && req.rejectionReason && (
                      <span className="block text-[10px] text-rose-600 mt-0.5 truncate max-w-[150px]" title={req.rejectionReason}>
                        Reason: {req.rejectionReason}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Subscription History Section */}
      <Card className="p-6">
        <h3 className="text-base font-bold text-slate-900 mb-1">Subscription History</h3>
        <p className="text-xs text-slate-500 mb-4">Historical record of all plan subscriptions assigned to your school.</p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan</TableHead>
              <TableHead>Billing Cycle</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Payment Status</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                  No subscription history records found.
                </TableCell>
              </TableRow>
            ) : (
              history.map((h) => {
                const isCurrentActive = sub?.id === h.id && hasActiveSubscription;
                return (
                  <TableRow key={h.id} className={isCurrentActive ? 'bg-indigo-50/50' : ''}>
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
                      {new Date(h.startDate).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {h.endDate ? new Date(h.endDate).toLocaleDateString('en-IN') : <span className="text-rose-600 font-medium">N/A (Expired)</span>}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 font-mono text-xs">
                      {formatCurrency(h.finalPrice)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-semibold text-emerald-600">
                      {h.paymentStatus || 'PAID'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={h.status === 'ACTIVE' ? 'success' : h.status === 'SUSPENDED' ? 'warning' : 'danger'}>
                        {h.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Purchase Plan Modal */}
      {selectedPlan && (
        <Modal isOpen={Boolean(selectedPlan)} onClose={handleClosePurchaseModal} title={`Purchase ${selectedPlan.name} Plan`}>
          <form onSubmit={handleSubmitPurchase} className="space-y-5">
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
                <span>Billing Cycle</span>
                <span>
                  {selectedPlan.durationValue} {selectedPlan.durationUnit.toLowerCase()}{selectedPlan.durationValue > 1 ? 's' : ''}
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
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('UPI');
                    if (modalError) setModalError('');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === 'UPI'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-xs block font-bold">UPI</span>
                  <span className="text-[10px] text-slate-500">Google Pay, PhonePe</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('CASH');
                    if (modalError) setModalError('');
                  }}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    paymentMethod === 'CASH'
                      ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-xs block font-bold">Cash</span>
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
                  Please enter the reference number generated after completing your UPI transaction.
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
    </div>
  );
};


