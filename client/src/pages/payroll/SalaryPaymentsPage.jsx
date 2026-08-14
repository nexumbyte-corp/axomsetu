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
import {
  CreditCard,
  Search,
  CheckSquare,
  Square,
  Printer,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Download,
} from 'lucide-react';

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / GPay / PhonePe' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
  { value: 'CHEQUE', label: 'Cheque' },
];

export const SalaryPaymentsPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(true);

  const [pendingData, setPendingData] = useState(null);
  const [loadingPending, setLoadingPending] = useState(false);

  // Selection state: Map of payrollId -> { selected: boolean, payNowAmount: number }
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
      setSelectionMap({});
      return;
    }
    setLoadingPending(true);
    try {
      const res = await staffService.getPendingPayrollsForStaff(staffId);
      const data = res.data;
      setPendingData(data);

      // Initialize selection map with oldest 1 month checked by default
      const initialMap = {};
      (data.pendingPayrolls || []).forEach((p, idx) => {
        initialMap[p.id] = {
          selected: idx === 0, // Auto select oldest 1st month
          payNowAmount: p.balance,
          balance: p.balance,
          month: p.month,
          year: p.year,
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
      const numVal = Math.max(0, parseFloat(val) || 0);
      return {
        ...prev,
        [payrollId]: {
          ...item,
          payNowAmount: Math.min(numVal, item.balance),
        },
      };
    });
  };

  // Selected totals
  const selectedEntries = Object.entries(selectionMap).filter(([_, v]) => v.selected);
  const selectedCount = selectedEntries.length;
  const totalPayNow = selectedEntries.reduce((sum, [_, v]) => sum + Number(v.payNowAmount || 0), 0);

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    if (!selectedStaffId || selectedCount === 0 || totalPayNow <= 0) {
      alert('Please select at least one pending month to pay.');
      return;
    }

    const paymentsPayload = selectedEntries.map(([payrollId, v]) => ({
      monthlyPayrollId: payrollId,
      payNowAmount: v.payNowAmount,
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

  const handlePrintReceipt = async () => {
    if (!successModalData) return;
    try {
      const { printPdfDocument } = await import('../../core/documents/documentEngine.js');
      await printPdfDocument({
        templateId: 'salary',
        data: successModalData,
      });
    } catch (err) {
      console.error('Failed to print receipt:', err);
      alert('Failed to launch print window.');
    }
  };

  const handleDownloadReceipt = async () => {
    if (!successModalData) return;
    try {
      const { downloadPdfDocument } = await import('../../core/documents/documentEngine.js');
      await downloadPdfDocument({
        templateId: 'salary',
        data: successModalData,
        filename: `SalaryReceipt_${successModalData.paymentNumber}.pdf`,
      });
    } catch (err) {
      console.error('Failed to download receipt PDF:', err);
      alert('Failed to download PDF receipt.');
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
        title="Salary Payments"
        description="Disburse pending monthly staff salaries with multi-month settlement and partial payment options."
      />

      <StaffSubNav />

      {/* Staff Selector */}
      <Card className="p-4 bg-white border border-slate-200 shadow-2xs space-y-3">
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
                  <h3 className="font-extrabold text-slate-900 text-sm">{pendingData.staff.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Total Pending Months: {pendingData.pendingCount} | Balance Due: ₹
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
                  <table className="w-full text-xs text-left min-w-[700px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 w-12 text-center">Select</th>
                        <th className="py-3.5 px-4">Month & Year</th>
                        <th className="py-3.5 px-4 text-right">Net Salary (₹)</th>
                        <th className="py-3.5 px-4 text-right">Already Paid (₹)</th>
                        <th className="py-3.5 px-4 text-right">Balance Due (₹)</th>
                        <th className="py-3.5 px-4 text-right w-44">Pay Now (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {pendingData.pendingPayrolls.map((p) => {
                        const item = selectionMap[p.id] || {};
                        const isSelected = Boolean(item.selected);
                        return (
                          <tr
                            key={p.id}
                            className={`transition-colors ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
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

                            <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                              ₹{p.netSalary.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono text-slate-500">
                              ₹{p.paidAmount.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3.5 px-4 text-right font-mono font-bold text-red-600">
                              ₹{p.balance.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <Input
                                type="number"
                                min="1"
                                max={p.balance}
                                value={item.payNowAmount ?? p.balance}
                                onChange={(e) => handlePayNowChange(p.id, e.target.value)}
                                disabled={!isSelected}
                                className="text-right font-mono font-bold text-slate-900"
                              />
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
                      Selected Months Summary
                    </span>
                    <span className="text-sm font-bold text-white">
                      {selectedCount} Month{selectedCount !== 1 ? 's' : ''} Selected
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                      Total Payment Amount
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
                      placeholder="e.g. Salary paid for June & July"
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
                      disabled={selectedCount === 0 || totalPayNow <= 0}
                    >
                      Pay Salary (₹{totalPayNow.toLocaleString('en-IN')})
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
        title="Salary Paid Successfully"
        size="md"
      >
        {successModalData && (
          <div className="space-y-6 text-xs">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-1">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-extrabold text-emerald-950">Payment Recorded</h3>
              <p className="text-xs text-emerald-700">Salary voucher generated and settled successfully.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Employee Name</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{successModalData.staff?.name}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Payment Voucher No</span>
                <p className="font-mono font-bold text-indigo-700 text-sm mt-0.5">{successModalData.paymentNumber}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Months Paid</span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {Array.isArray(successModalData.months) ? successModalData.months.join(', ') : successModalData.months}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Amount Paid</span>
                <p className="font-mono font-extrabold text-emerald-700 text-base mt-0.5">
                  ₹{Number(successModalData.netSalary).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setSuccessModalData(null)}>
                Done
              </Button>
              <Button variant="outline" icon={Download} onClick={handleDownloadReceipt}>
                Download PDF
              </Button>
              <Button variant="primary" icon={Printer} onClick={handlePrintReceipt}>
                Print Salary Receipt
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
