import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Plus, Calendar, AlertTriangle } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService.js';
import { adminService } from '../../services/adminService.js';
import { calculateSubscriptionEndDate, formatDateInput } from '../../utils/subscriptionUtils.js';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';

export const SuperAdminSubscriptionsPage = () => {
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'running'
  const [requests, setRequests] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [schools, setSchools] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });

  // Action Modals
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [extendingSub, setExtendingSub] = useState(null);
  const [addDays, setAddDays] = useState(30);
  const [extensionReason, setExtensionReason] = useState('');

  const [expiringSub, setExpiringSub] = useState(null);
  const [expirationReason, setExpirationReason] = useState('');

  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    schoolId: '',
    planId: '',
    startDate: '',
    endDate: '',
    amount: '',
    paymentMethod: 'CASH',
    referenceNumber: '',
    remarks: '',
    isComplimentary: false,
    complimentaryReason: '',
  });

  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'requests') {
        const res = await subscriptionService.adminListPendingPayments({
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter || undefined,
          search,
        });
        if (res.success) {
          setRequests(res.data || []);
          if (res.pagination) setPagination(res.pagination);
        }
      } else {
        const res = await subscriptionService.adminListSubscriptions({
          page: pagination.page,
          limit: pagination.limit,
          status: statusFilter || undefined,
          search,
        });
        if (res.success) {
          setSubscriptions(res.data || []);
          if (res.pagination) setPagination(res.pagination);
        }
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to fetch subscription records' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, pagination.limit, pagination.page, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadSchoolsAndPlans = async () => {
    try {
      const [schRes, planRes] = await Promise.all([
        adminService.listSchools({ limit: 100 }),
        subscriptionService.adminListPlans(),
      ]);
      if (schRes.success) setSchools(schRes.data.items || schRes.data || []);
      if (planRes.success) setPlans(planRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenManualModal = () => {
    loadSchoolsAndPlans();
    setManualForm({
      schoolId: '',
      planId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      amount: '',
      paymentMethod: 'CASH',
      referenceNumber: '',
      remarks: '',
      isComplimentary: false,
      complimentaryReason: '',
    });
    setIsManualModalOpen(true);
  };

  const handleApprove = async (paymentId) => {
    setSubmittingAction(true);
    try {
      const res = await subscriptionService.adminApprovePayment(paymentId);
      if (res.success) {
        setToast({ type: 'success', message: 'Subscription request approved and activated!' });
        fetchData();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to approve request.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      setToast({ type: 'danger', message: 'Rejection reason is mandatory.' });
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await subscriptionService.adminRejectPayment(rejectingPayment.id, rejectionReason.trim());
      if (res.success) {
        setToast({ type: 'success', message: 'Subscription request rejected.' });
        setRejectingPayment(null);
        setRejectionReason('');
        fetchData();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to reject request.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExtendSubmit = async (e) => {
    e.preventDefault();
    if (!extensionReason.trim()) {
      setToast({ type: 'danger', message: 'Extension reason is mandatory.' });
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await subscriptionService.adminExtendSubscription(extendingSub.id, {
        addDays: Number(addDays),
        reason: extensionReason.trim(),
      });
      if (res.success) {
        setToast({ type: 'success', message: 'Subscription duration extended.' });
        setExtendingSub(null);
        setExtensionReason('');
        fetchData();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to extend subscription.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExpireSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    try {
      const res = await subscriptionService.adminExpireSubscription(expiringSub.id, expirationReason.trim() || null);
      if (res.success) {
        setToast({ type: 'success', message: `Subscription for ${expiringSub.schoolName} has been expired.` });
        setExpiringSub(null);
        setExpirationReason('');
        fetchData();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to expire subscription.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.schoolId) {
      setToast({ type: 'danger', message: 'Please select a school.' });
      return;
    }

    setSubmittingAction(true);
    try {
      const res = await subscriptionService.adminCreateManualSubscription(manualForm);
      if (res.success) {
        setToast({ type: 'success', message: 'Manual subscription assigned successfully.' });
        setIsManualModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to assign manual subscription.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <ModulePageHeader
        title="Subscriptions"
        description="Manage platform subscription requests and active running subscriptions across schools."
        actions={
          <Button variant="primary" icon={Plus} onClick={handleOpenManualModal}>
            Assign Subscription
          </Button>
        }
      />

      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => {
            setActiveTab('requests');
            setStatusFilter('');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'requests'
              ? 'border-indigo-600 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Subscription Requests
        </button>
        <button
          onClick={() => {
            setActiveTab('running');
            setStatusFilter('');
            setPagination((p) => ({ ...p, page: 1 }));
          }}
          className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'running'
              ? 'border-indigo-600 text-indigo-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Running Subscriptions
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4 shadow-2xs">
        <div className="w-full sm:flex-1">
          <Input
            placeholder="Search school name, code, reference number..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-56">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            {activeTab === 'requests' ? (
              <>
                <option value="PENDING">Pending</option>
                <option value="PAID">Approved / Paid</option>
                <option value="REJECTED">Rejected</option>
              </>
            ) : (
              <>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
              </>
            )}
          </Select>
        </div>

        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchData}>
          Refresh
        </Button>
      </div>

      {/* Requests Table View */}
      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : activeTab === 'requests' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Requested Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Request Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    No subscription requests found.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-slate-900">
                      {p.schoolName}
                      <span className="text-[10px] text-slate-400 font-mono block">{p.schoolCode}</span>
                    </TableCell>

                    <TableCell className="font-semibold text-slate-800 text-xs">{p.planName}</TableCell>

                    <TableCell className="font-bold text-emerald-600 font-mono text-xs">
                      {formatCurrency(p.amount)}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-slate-500">
                      {new Date(p.requestedAt).toLocaleDateString('en-IN')}
                    </TableCell>

                    <TableCell>
                      <Badge variant={p.status === 'PENDING' ? 'warning' : p.status === 'PAID' ? 'success' : 'danger'}>
                        {p.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs font-medium text-slate-700">
                      {p.paymentMethod} &bull; {p.status}
                    </TableCell>

                    <TableCell className="text-right">
                      {p.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            disabled={submittingAction}
                            onClick={() => handleApprove(p.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            disabled={submittingAction}
                            onClick={() => setRejectingPayment(p)}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-mono">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={(pg) => setPagination((prev) => ({ ...prev, page: pg }))}
          />
        </div>
      ) : (
        /* Running Subscriptions View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    No active running subscriptions found.
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-bold text-slate-900">
                      {s.schoolName}
                      <span className="text-[10px] text-slate-400 font-mono block">{s.schoolCode}</span>
                    </TableCell>

                    <TableCell className="font-semibold text-slate-800 text-xs">
                      {s.planName}
                      <span className="text-[10px] text-slate-500 block">{s.duration}</span>
                    </TableCell>

                    <TableCell className="text-xs font-mono text-slate-500">
                      {new Date(s.startDate).toLocaleDateString('en-IN')}
                    </TableCell>

                    <TableCell className="text-xs font-mono text-slate-500">
                      {s.endDate ? (
                        new Date(s.endDate).toLocaleDateString('en-IN')
                      ) : (
                        <span className="text-rose-600 font-bold">N/A (Expired)</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          s.status === 'ACTIVE'
                            ? 'success'
                            : s.status === 'SUSPENDED'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right font-bold text-slate-900 font-mono text-xs">
                      {formatCurrency(s.finalPrice)}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.status === 'ACTIVE' && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={AlertTriangle}
                            className="text-rose-600 hover:bg-rose-50 border-rose-200"
                            onClick={() => {
                              setExpiringSub(s);
                              setExpirationReason('');
                            }}
                          >
                            Expire Subscription
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Calendar}
                          onClick={() => {
                            setExtendingSub(s);
                            setAddDays(30);
                            setExtensionReason('');
                          }}
                        >
                          Extend
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={(pg) => setPagination((prev) => ({ ...prev, page: pg }))}
          />
        </div>
      )}

      {/* Reject Payment Request Modal */}
      {rejectingPayment && (
        <Modal isOpen={Boolean(rejectingPayment)} onClose={() => setRejectingPayment(null)} title="Reject Subscription Request">
          <form onSubmit={handleRejectSubmit} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-900">{rejectingPayment.schoolName}</span> —{' '}
              <span>{rejectingPayment.planName} ({formatCurrency(rejectingPayment.amount)})</span>
            </div>

            <Input
              label="Rejection Reason *"
              placeholder="e.g. Reference number unverifiable / Payment incomplete"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setRejectingPayment(null)} disabled={submittingAction}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-rose-600 hover:bg-rose-700" loading={submittingAction}>
                Confirm Rejection
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Extend Subscription Modal */}
      {extendingSub && (
        <Modal isOpen={Boolean(extendingSub)} onClose={() => setExtendingSub(null)} title="Extend Subscription Duration">
          <form onSubmit={handleExtendSubmit} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
              <span className="font-bold text-slate-900">{extendingSub.schoolName}</span>
              <span className="block text-slate-500 mt-0.5">
                Current Expiry: {new Date(extendingSub.endDate).toLocaleDateString('en-IN')}
              </span>
            </div>

            <Input
              label="Extend By Days *"
              type="number"
              min="1"
              max="365"
              value={addDays}
              onChange={(e) => setAddDays(e.target.value)}
              required
            />

            <Input
              label="Extension Reason *"
              placeholder="e.g. Promotional extension granted"
              value={extensionReason}
              onChange={(e) => setExtensionReason(e.target.value)}
              required
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setExtendingSub(null)} disabled={submittingAction}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submittingAction}>
                Apply Extension
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Expire Subscription Modal */}
      {expiringSub && (
        <Modal isOpen={Boolean(expiringSub)} onClose={() => setExpiringSub(null)} title="Expire Subscription">
          <form onSubmit={handleExpireSubmit} className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs leading-relaxed">
              <strong>Warning:</strong> Are you sure you want to manually expire the active subscription for{' '}
              <strong>{expiringSub.schoolName}</strong>?
              <br />
              This action will immediately set the subscription status to <strong>EXPIRED</strong>, clear the end date to <strong>NULL</strong>, and enforce school access restrictions immediately.
            </div>

            <Input
              label="Reason for Expiration (Optional)"
              placeholder="e.g. Non-payment / Policy violation / Admin request"
              value={expirationReason}
              onChange={(e) => setExpirationReason(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setExpiringSub(null)} disabled={submittingAction}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="bg-rose-600 hover:bg-rose-700 text-white" loading={submittingAction}>
                Confirm Expire Subscription
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Assign Subscription Modal */}
      {isManualModalOpen && (
        <Modal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} title="Assign Subscription">
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <Select
              label="Select School *"
              value={manualForm.schoolId}
              onChange={(e) => setManualForm({ ...manualForm, schoolId: e.target.value })}
              required
            >
              <option value="">-- Select School --</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>

            <Select
              label="Subscription Plan"
              value={manualForm.planId}
              onChange={(e) => {
                const sel = plans.find((p) => p.id === e.target.value);
                const computedEnd = sel
                  ? formatDateInput(calculateSubscriptionEndDate(manualForm.startDate || new Date(), sel.durationUnit, sel.durationValue))
                  : manualForm.endDate;
                setManualForm({
                  ...manualForm,
                  planId: e.target.value,
                  amount: sel ? String(sel.finalPrice) : manualForm.amount,
                  endDate: computedEnd,
                });
              }}
            >
              <option value="">-- Select Plan --</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatCurrency(p.finalPrice)})
                </option>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date"
                type="date"
                value={manualForm.startDate}
                onChange={(e) => setManualForm({ ...manualForm, startDate: e.target.value })}
              />
              <Input
                label="End Date"
                type="date"
                value={manualForm.endDate}
                onChange={(e) => setManualForm({ ...manualForm, endDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Amount (₹) *"
                type="number"
                value={manualForm.amount}
                onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                required
              />
              <Select
                label="Payment Method"
                value={manualForm.paymentMethod}
                onChange={(e) => setManualForm({ ...manualForm, paymentMethod: e.target.value })}
              >
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
                <option value="OTHER">OTHER</option>
              </Select>
            </div>

            <Input
              label="Remarks / Notes"
              placeholder="Administrative notes..."
              value={manualForm.remarks}
              onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)} disabled={submittingAction}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submittingAction}>
                Assign Subscription
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
