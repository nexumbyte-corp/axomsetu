import React, { useEffect, useState } from 'react';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StaffSubNav } from '../staff/StaffSubNav.jsx';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';
import { CreditCard, CheckCircle2, AlertCircle, DollarSign } from 'lucide-react';

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / GPay / PhonePe' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
  { value: 'CHEQUE', label: 'Cheque' },
];

export const SalaryPaymentsPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [_loadingStaff, setLoadingStaff] = useState(true);

  const [pendingData, setPendingData] = useState(null);
  const [_staffSummary, setStaffSummary] = useState(null);
  const [loadingPending, setLoadingPending] = useState(false);

  // Selection state: Map of payrollId -> { selected: boolean, payNowAmount: number, error: string }
  const [selectionMap, setSelectionMap] = useState({});

  // Payment form metadata
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paying, setPaying] = useState(false);

  // Success Receipt Modal
  const [successModalData, setSuccessModalData] = useState(null);

  const fetchStaffDirectory = async () => {
    setLoadingStaff(true);
    try {
      const res = await staffService.getStaffList({ limit: 200, status: 'ACTIVE' });
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchStaffDirectory();
  }, []);

  const fetchPendingPayrolls = async (staffId) => {
    if (!staffId) {
      setPendingData(null);
      setStaffSummary(null);
      setSelectionMap({});
      return;
    }
    setLoadingPending(true);
    try {
      const res = await staffService.getPendingPayrollsForStaff(staffId);
      const data = res.data;
      setPendingData(data);
      setStaffSummary({
        baseSalary: Number(data.staff?.baseSalary || 0),
        pendingCount: data.pendingCount,
        totalBalance: data.totalBalance,
      });

      // Initialize selection map with oldest 1 month checked by default
      const initialMap = {};
      (data.pendingPayrolls || []).forEach((p, idx) => {
        initialMap[p.id] = {
          selected: idx === 0, // Auto select oldest 1st month
          payNowAmount: p.balance,
          balance: p.balance,
          month: p.month,
          year: p.year,
          netSalary: p.netSalary,
          paidAmount: p.paidAmount,
          error: '',
        };
      });
      setSelectionMap(initialMap);
    } catch (err) {
      console.error('Failed to load pending payrolls:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchPendingPayrolls(selectedStaffId);
  }, [selectedStaffId]);

  const handleSelectOldest = (count) => {
    const num = parseInt(count, 10);
    if (!pendingData?.pendingPayrolls) return;

    setSelectionMap((prev) => {
      const updated = { ...prev };
      pendingData.pendingPayrolls.forEach((p, idx) => {
        if (updated[p.id]) {
          updated[p.id].selected = idx < num;
          updated[p.id].payNowAmount = p.balance;
          updated[p.id].error = '';
        }
      });
      return updated;
    });
  };

  const handleToggleSelect = (payrollId) => {
    setSelectionMap((prev) => {
      const item = prev[payrollId];
      if (!item) return prev;
      return {
        ...prev,
        [payrollId]: {
          ...item,
          selected: !item.selected,
        },
      };
    });
  };

  const handlePayNowChange = (payrollId, val) => {
    setSelectionMap((prev) => {
      const item = prev[payrollId];
      if (!item) return prev;

      const numVal = parseFloat(val);
      let error = '';

      if (isNaN(numVal) || numVal <= 0) {
        error = 'Payment amount must be greater than zero.';
      } else if (numVal > item.balance + 0.01) {
        error = `Payment amount (₹${numVal.toLocaleString('en-IN')}) cannot exceed the remaining salary of ₹${item.balance.toLocaleString('en-IN')}.`;
      }

      return {
        ...prev,
        [payrollId]: {
          ...item,
          payNowAmount: isNaN(numVal) ? val : numVal,
          error,
        },
      };
    });
  };

  const handleFillRemaining = (payrollId) => {
    setSelectionMap((prev) => {
      const item = prev[payrollId];
      if (!item) return prev;
      return {
        ...prev,
        [payrollId]: {
          ...item,
          selected: true,
          payNowAmount: item.balance,
          error: '',
        },
      };
    });
  };

  // Selected totals & validation flags
  const selectedEntries = Object.entries(selectionMap).filter(([_, v]) => v.selected);
  const selectedCount = selectedEntries.length;
  const hasValidationError = selectedEntries.some(([_, v]) => Boolean(v.error) || Number(v.payNowAmount) <= 0 || Number(v.payNowAmount) > v.balance + 0.01);
  const totalPayNow = selectedEntries.reduce((sum, [_, v]) => sum + (Number(v.payNowAmount) || 0), 0);

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaffId || selectedCount === 0) {
      alert('Please select at least one pending month to pay.');
      return;
    }

    if (hasValidationError) {
      alert('Please resolve all validation errors before proceeding with payment.');
      return;
    }

    const paymentsPayload = selectedEntries.map(([payrollId, v]) => ({
      monthlyPayrollId: payrollId,
      payNowAmount: Number(v.payNowAmount),
    }));

    setPaying(true);
    try {
      const res = await staffService.recordMultiMonthSalaryPayment({
        staffId: selectedStaffId,
        payments: paymentsPayload,
        paymentMode,
        referenceNo,
        remarks,
      });

      // Fetch full receipt data for success dialog
      const receiptRes = await staffService.getSalaryPaymentReceiptData(res.data.salaryPayment.id);

      setSuccessModalData(receiptRes.data);
      setReferenceNo('');
      setRemarks('');
      fetchPendingPayrolls(selectedStaffId);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Payment processing failed.');
    } finally {
      setPaying(false);
    }
  };

  const staffSelectOptions = staffList.map((st) => ({
    value: st.id,
    label: `${st.name} (${st.employeeId}) — ${st.department || 'Staff'}`,
  }));

  return (
    <div className="space-y-6">
      <ModulePageHeader
        icon={CreditCard}
        title="Salary Payments & Partial Settlement"
        description="Disburse pending monthly staff salaries with partial payment options, strict balance validation, and instant disbursement vouchers."
      />

      <StaffSubNav />

      {/* Staff Selector & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-slate-200 shadow-2xs space-y-3 lg:col-span-2">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Step 1: Select Staff Member
          </label>
          <div className="max-w-xl">
            <Select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              options={[{ value: '', label: '-- Select Staff Member to Pay --' }, ...staffSelectOptions]}
            />
          </div>
        </Card>

        {/* Staff Salary Position Summary Bar */}
        {pendingData?.staff && (
          <Card className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                Staff Salary Position
              </span>
              <h4 className="text-base font-extrabold text-white mt-0.5">{pendingData.staff.name}</h4>
              <p className="text-[11px] text-slate-300 font-mono">
                {pendingData.staff.employeeId} | {pendingData.staff.designation || 'Staff'}
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Total Pending Months</span>
                <span className="font-bold text-white text-sm font-mono">{pendingData.pendingCount}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-indigo-300 font-medium block">Total Outstanding Balance</span>
                <span className="font-bold text-emerald-400 text-sm font-mono">
                  ₹{pendingData.totalBalance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Pending Salary Section */}
      {selectedStaffId && (
        <>
          {loadingPending ? (
            <div className="flex justify-center items-center py-16">
              <Spinner size="lg" />
            </div>
          ) : !pendingData || pendingData.pendingPayrolls.length === 0 ? (
            <Card className="p-12 text-center text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-sm">No Pending Salary Dues</p>
              <p className="mt-1">All prepared salary records for {pendingData?.staff?.name} have been fully paid!</p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Convenience & Pending Summary Bar */}
              <Card className="p-4 bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Pending Salary Settlements</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Total Pending Months: {pendingData.pendingCount} | Balance Outstanding: ₹
                    {pendingData.totalBalance.toLocaleString('en-IN')}
                  </p>
                </div>

                {/* Convenience dropdown: Select Oldest */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Quick Select:</span>
                  <button
                    onClick={() => handleSelectOldest(1)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg transition-colors"
                  >
                    Oldest 1 Month
                  </button>
                  <button
                    onClick={() => handleSelectOldest(2)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg transition-colors"
                  >
                    Oldest 2 Months
                  </button>
                  <button
                    onClick={() => handleSelectOldest(3)}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded-lg transition-colors"
                  >
                    Oldest 3 Months
                  </button>
                </div>
              </Card>

              {/* Pending Salary Table */}
              <Card className="overflow-hidden shadow-2xs">
                <div className="table-responsive-wrapper">
                  <table className="w-full text-xs text-left min-w-[750px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 w-12 text-center">Select</th>
                        <th className="py-3.5 px-4">Period</th>
                        <th className="py-3.5 px-4 text-right">Original Salary Due (₹)</th>
                        <th className="py-3.5 px-4 text-right">Already Paid (₹)</th>
                        <th className="py-3.5 px-4 text-right">Remaining Unpaid (₹)</th>
                        <th className="py-3.5 px-4 text-center">Status</th>
                        <th className="py-3.5 px-4 text-right w-56">Current Payment / Pay Now (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pendingData.pendingPayrolls.map((p) => {
                        const item = selectionMap[p.id] || {};
                        const isSelected = Boolean(item.selected);
                        const hasErr = Boolean(item.error);

                        return (
                          <tr
                            key={p.id}
                            className={`transition-colors ${hasErr ? 'bg-rose-50/50' : isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                              }`}
                          >
                            <td className="py-3.5 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelect(p.id)}
                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                              />
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-bold text-slate-900 text-sm">{p.month} {p.year}</span>
                              {p.academicYearName && (
                                <span className="text-[10px] text-slate-500 block">{p.academicYearName}</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                              ₹{p.netSalary.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                              ₹{p.paidAmount.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono font-extrabold text-rose-600">
                              ₹{p.balance.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              {p.paidAmount > 0 ? (
                                <Badge variant="neutral" size="sm">PARTIAL</Badge>
                              ) : (
                                <Badge variant="warning" size="sm">UNPAID</Badge>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right space-y-1">
                              <div className="flex items-center gap-1.5 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleFillRemaining(p.id)}
                                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline whitespace-nowrap"
                                  title="Fill remaining balance"
                                >
                                  Pay ₹{p.balance.toLocaleString('en-IN')}
                                </button>
                                <Input
                                  type="number"
                                  min="1"
                                  max={p.balance}
                                  value={item.payNowAmount ?? p.balance}
                                  onChange={(e) => handlePayNowChange(p.id, e.target.value)}
                                  disabled={!isSelected}
                                  className={`w-32 text-right font-mono font-bold text-slate-900 ${hasErr ? 'border-rose-500 focus:ring-rose-500 bg-rose-50' : ''
                                    }`}
                                />
                              </div>
                              {hasErr && isSelected && (
                                <p className="text-[10px] text-rose-600 font-bold text-right leading-tight">
                                  ⚠️ {item.error}
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Selection Summary Footer */}
                <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                      Selected Settlement Summary
                    </span>
                    <span className="text-sm font-bold text-white">
                      {selectedCount} Month{selectedCount !== 1 ? 's' : ''} Selected
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                      Current Disbursement Total
                    </span>
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">
                      ₹{totalPayNow.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Payment Details Submission Form */}
              <Card className="p-5 bg-white border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">
                  Step 2: Payment Disbursement Details
                </h3>

                {hasValidationError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Please correct the payment amounts before confirming disbursement. Current payment cannot exceed the remaining unpaid balance.</span>
                  </div>
                )}

                <form onSubmit={handlePaySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Select
                      label="Payment Mode *"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      options={PAYMENT_MODES}
                    />

                    <Input
                      label="Reference / Transaction Number"
                      placeholder="e.g. UTR / Txn # / Cheque #"
                      value={referenceNo}
                      onChange={(e) => setReferenceNo(e.target.value)}
                    />

                    <Input
                      label="Remarks"
                      placeholder="e.g. Partial salary payment for July"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      icon={DollarSign}
                      loading={paying}
                      loadingText="Processing Payment..."
                      disabled={selectedCount === 0 || totalPayNow <= 0 || hasValidationError}
                    >
                      Disburse Salary (₹{totalPayNow.toLocaleString('en-IN')})
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Payment Success & Receipt Dialog */}
      <Modal
        isOpen={Boolean(successModalData)}
        onClose={() => setSuccessModalData(null)}
        title="Salary Disbursement Voucher Generated"
        size="lg"
      >
        {successModalData && (
          <div className="space-y-6 text-xs">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-1">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-extrabold text-emerald-950">Disbursement Recorded</h3>
              <p className="text-xs text-emerald-700 font-mono">
                Voucher No: <span className="font-bold">{successModalData.paymentNumber}</span>
              </p>
            </div>

            {/* Staff & Voucher Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Staff Name</span>
                <p className="font-bold text-slate-900 text-xs mt-0.5">{successModalData.staff?.name}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Employee Code</span>
                <p className="font-mono font-bold text-indigo-700 text-xs mt-0.5">{successModalData.staff?.employeeId}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Payment Method</span>
                <p className="font-bold text-slate-800 text-xs mt-0.5">{successModalData.paymentMode}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium block">Disbursed Amount</span>
                <p className="font-mono font-extrabold text-emerald-700 text-sm mt-0.5">
                  ₹{Number(successModalData.netSalary).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* Itemized 5-Point Settlement Breakdown Table (Requirements 3 & 4) */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-900 text-white p-2.5 font-bold text-[11px] uppercase tracking-wider">
                Salary Settlement Breakdown
              </div>
              <div className="divide-y divide-slate-100">
                {(successModalData.allocations || []).map((alloc, idx) => {
                  const s = alloc.settlement || {};
                  return (
                    <div key={alloc.id || idx} className="p-3.5 bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-900">
                          Period: {alloc.monthlyPayroll?.month} {alloc.monthlyPayroll?.year}
                        </span>
                        <Badge variant={s.status === 'PAID' ? 'success' : 'neutral'} size="sm">
                          {s.status || 'PARTIALLY PAID'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono pt-1">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Salary Due</span>
                          <span className="font-bold text-slate-900">₹{(s.salaryDue || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Previously Paid</span>
                          <span className="font-bold text-slate-600">₹{(s.previouslyPaid || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-600 font-bold block uppercase">Current Disbursement</span>
                          <span className="font-bold text-emerald-700">₹{(s.currentDisbursement || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Paid</span>
                          <span className="font-bold text-slate-900">₹{(s.totalPaid || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-600 font-bold block uppercase">Remaining Unpaid</span>
                          <span className="font-bold text-rose-700">₹{(s.remainingUnpaid || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end items-center gap-3 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setSuccessModalData(null)}>
                Done
              </Button>
              <DocumentActions
                templateId="salary"
                data={successModalData}
                filename={`SalaryVoucher_${successModalData?.paymentNumber || 'VOUCHER'}.pdf`}
                title={`Salary Voucher #${successModalData?.paymentNumber || ''}`}
                variant="printOnly"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
