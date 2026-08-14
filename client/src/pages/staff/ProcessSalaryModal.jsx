import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { staffService } from '../../services/staff.service.js';
import { Calculator, AlertCircle, DollarSign, Calendar } from 'lucide-react';

const MONTHS_LIST = [
  { value: 'JANUARY', label: 'January' },
  { value: 'FEBRUARY', label: 'February' },
  { value: 'MARCH', label: 'March' },
  { value: 'APRIL', label: 'April' },
  { value: 'MAY', label: 'May' },
  { value: 'JUNE', label: 'June' },
  { value: 'JULY', label: 'July' },
  { value: 'AUGUST', label: 'August' },
  { value: 'SEPTEMBER', label: 'September' },
  { value: 'OCTOBER', label: 'October' },
  { value: 'NOVEMBER', label: 'November' },
  { value: 'DECEMBER', label: 'December' },
];

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI / Online' },
  { value: 'CHEQUE', label: 'Cheque' },
];

export const ProcessSalaryModal = ({ isOpen, onClose, staff = null, staffList = [], onSuccess }) => {
  const [selectedStaffId, setSelectedStaffId] = useState(staff?.id || '');
  const [activeStaff, setActiveStaff] = useState(staff);

  const [selectedMonths, setSelectedMonths] = useState([
    MONTHS_LIST[new Date().getMonth()].value,
  ]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [allowances, setAllowances] = useState('0');
  const [deductions, setDeductions] = useState('0');
  const [advanceDeducted, setAdvanceDeducted] = useState('0');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [paidMonths, setPaidMonths] = useState([]);
  const [fetchingPaid, setFetchingPaid] = useState(false);

  useEffect(() => {
    if (staff) {
      setActiveStaff(staff);
      setSelectedStaffId(staff.id);
    } else if (staffList.length > 0) {
      const defaultStaff = staffList[0];
      setActiveStaff(defaultStaff);
      setSelectedStaffId(defaultStaff.id);
    }
  }, [staff, staffList, isOpen]);

  useEffect(() => {
    if (!selectedStaffId) return;
    const fetchPaidMonths = async () => {
      setFetchingPaid(true);
      try {
        const res = await staffService.getPaidMonths(selectedStaffId, year);
        const alreadyPaid = res.data?.paidMonths || [];
        setPaidMonths(alreadyPaid);
        setSelectedMonths((prev) => {
          const filtered = prev.filter((m) => !alreadyPaid.includes(m));
          if (filtered.length > 0) return filtered;
          const firstUnpaid = MONTHS_LIST.find((m) => !alreadyPaid.includes(m.value));
          return firstUnpaid ? [firstUnpaid.value] : [];
        });
      } catch (err) {
        console.error('Failed to fetch paid months:', err);
      } finally {
        setFetchingPaid(false);
      }
    };
    fetchPaidMonths();
  }, [selectedStaffId, year, isOpen]);

  const handleStaffChange = (e) => {
    const sId = e.target.value;
    setSelectedStaffId(sId);
    const found = staffList.find((s) => s.id === sId);
    setActiveStaff(found || null);
  };

  const toggleMonth = (monthValue) => {
    if (paidMonths.includes(monthValue)) return;
    if (selectedMonths.includes(monthValue)) {
      if (selectedMonths.length === 1) return; // keep at least 1 month
      setSelectedMonths(selectedMonths.filter((m) => m !== monthValue));
    } else {
      setSelectedMonths([...selectedMonths, monthValue]);
    }
  };

  // Real-time calculations
  const monthlyRate = Number(activeStaff?.baseSalary || 0);
  const totalBaseSalary = monthlyRate * selectedMonths.length;
  const allowancesNum = parseFloat(allowances) || 0;
  const deductionsNum = parseFloat(deductions) || 0;
  const advanceDeductedNum = parseFloat(advanceDeducted) || 0;

  const currentAdvanceBalance = Number(activeStaff?.advanceBalance || 0);

  const netSalary = totalBaseSalary + allowancesNum - deductionsNum - advanceDeductedNum;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedStaffId) {
      setError('Please select a staff member.');
      return;
    }

    if (selectedMonths.length === 0) {
      setError('No unpaid months selected for salary payment.');
      return;
    }

    // Double check duplicate months
    const dupes = selectedMonths.filter((m) => paidMonths.includes(m));
    if (dupes.length > 0) {
      setError(`The following month(s) are already paid for ${year}: ${dupes.join(', ')}`);
      return;
    }

    if (advanceDeductedNum > currentAdvanceBalance) {
      setError(`Advance deduction cannot exceed remaining advance balance of ₹${currentAdvanceBalance.toLocaleString('en-IN')}`);
      return;
    }

    if (netSalary < 0) {
      setError('Net salary cannot be negative.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        staffId: selectedStaffId,
        months: selectedMonths,
        year: Number(year),
        allowances: allowancesNum,
        deductions: deductionsNum,
        advanceDeducted: advanceDeductedNum,
        paymentMode,
        referenceNo,
        remarks,
        paymentDate,
      };

      const response = await staffService.recordSalaryPayment(payload);
      if (onSuccess) onSuccess(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record salary payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Salary Payment (Payroll)"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Select Staff if not pre-passed */}
        {!staff && (
          <Select
            label="Select Staff Member *"
            value={selectedStaffId}
            onChange={handleStaffChange}
            options={staffList.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.employeeId}) - Base: ₹${Number(s.baseSalary).toLocaleString('en-IN')}/mo`,
            }))}
          />
        )}

        {/* Staff summary banner */}
        {activeStaff && (
          <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-indigo-900">{activeStaff.name}</p>
              <p className="text-[11px] text-indigo-700 font-medium">
                ID: {activeStaff.employeeId} | {activeStaff.role} ({activeStaff.department || 'General'})
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-medium block">Monthly Base Salary</span>
              <span className="text-sm font-bold text-slate-900">
                ₹{Number(activeStaff.baseSalary).toLocaleString('en-IN')}
              </span>
              {Number(activeStaff.advanceBalance) > 0 && (
                <div className="mt-0.5">
                  <Badge variant="warning" size="sm">
                    Advance Bal: ₹{Number(activeStaff.advanceBalance).toLocaleString('en-IN')}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Multi-Month Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
            <span>
              Select Month(s) to Pay * ({selectedMonths.length} month{selectedMonths.length > 1 ? 's' : ''} selected)
            </span>
            <span className="text-[10px] text-slate-500 font-normal">
              Green badge = Already Paid for {year}
            </span>
          </label>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {MONTHS_LIST.map((m) => {
              const isPaid = paidMonths.includes(m.value);
              const isSelected = selectedMonths.includes(m.value);
              return (
                <button
                  type="button"
                  key={m.value}
                  disabled={isPaid}
                  onClick={() => !isPaid && toggleMonth(m.value)}
                  title={isPaid ? `${m.label} ${year} is already paid` : `Toggle ${m.label}`}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all border flex items-center justify-between ${
                    isPaid
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 cursor-not-allowed'
                      : isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{m.label}</span>
                  {isPaid && (
                    <span className="text-[8px] font-extrabold uppercase bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded">
                      PAID
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Payment Year *"
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            required
          />

          <Input
            label="Payment Date *"
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            required
          />
        </div>

        {/* Financial Adjustments Grid */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Base Salary ({selectedMonths.length} mo)
              </label>
              <div className="p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900 text-sm">
                ₹{totalBaseSalary.toLocaleString('en-IN')}
              </div>
            </div>

            <Input
              label="Allowances (+) ₹"
              type="number"
              min="0"
              value={allowances}
              onChange={(e) => setAllowances(e.target.value)}
              placeholder="0"
            />

            <Input
              label="Deductions (-) ₹"
              type="number"
              min="0"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              placeholder="0"
            />
          </div>

          {currentAdvanceBalance > 0 && (
            <div className="border-t border-slate-200 pt-2.5">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-amber-900">
                  Deduct from Staff Advance Balance (-)
                </label>
                <span className="text-[11px] font-bold text-amber-700">
                  Max Available: ₹{currentAdvanceBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <Input
                type="number"
                min="0"
                max={currentAdvanceBalance}
                value={advanceDeducted}
                onChange={(e) => setAdvanceDeducted(e.target.value)}
                placeholder="Amount to recover from advance"
              />
            </div>
          )}
        </div>

        {/* Real-time Net Salary Output Banner */}
        <div className="p-4 bg-emerald-600 text-white rounded-xl shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-emerald-100 font-bold block">
              Calculated Net Payable Salary
            </span>
            <span className="text-xs text-emerald-100 font-mono">
              ₹{totalBaseSalary} Base {allowancesNum > 0 && `+ ₹${allowancesNum} Allow`} {deductionsNum > 0 && `- ₹${deductionsNum} Ded`} {advanceDeductedNum > 0 && `- ₹${advanceDeductedNum} Adv`}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold tracking-tight">
              ₹{netSalary.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Payment Mode *"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            options={PAYMENT_MODES}
          />

          <Input
            label="Transaction / Reference No."
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
            placeholder="e.g. UTR123456 / Cheque #001"
          />
        </div>

        <Input
          label="Remarks / Notes"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Paid via direct bank transfer for Q2"
        />

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button type="submit" variant="primary" loading={loading}>
            Record & Generate Salary Slip
          </Button>
        </div>
      </form>
    </Modal>
  );
};
