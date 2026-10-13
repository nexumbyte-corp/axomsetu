import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { DatePicker } from '../ui/DatePicker.jsx';
import { getISTTodayString } from '../../utils/formatters.js';

export const PaymentForm = ({
  onSubmit,
  isSubmitting = false,
  isDisabled = false,
  totalSelectedAmount = 0,
}) => {
  const [paymentDate, setPaymentDate] = useState(getISTTodayString);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setPaymentDate(getISTTodayString());
  }, []);

  const isCash = paymentMode === 'CASH';

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isCash && (!referenceNumber || referenceNumber.trim() === '')) {
      const modeLabel =
        paymentMode === 'UPI'
          ? 'UPI UTR / Reference ID'
          : paymentMode === 'CHEQUE'
          ? 'Cheque Number'
          : paymentMode === 'DEMAND_DRAFT'
          ? 'Demand Draft Number'
          : paymentMode === 'POS'
          ? 'Card Approval / Txn Code'
          : paymentMode === 'BANK_TRANSFER'
          ? 'Bank Transfer / UTR Number'
          : 'Reference Number';
      setErrorMsg(`${modeLabel} is required for ${paymentMode.replace(/_/g, ' ')} payment.`);
      return;
    }

    if (totalSelectedAmount < 0) {
      setErrorMsg('Selected amount cannot be negative.');
      return;
    }

    onSubmit({
      paymentDate,
      paymentMode,
      referenceNumber: referenceNumber.trim() || null,
      remarks: remarks.trim() || null,
    });
  };

  const getRefLabel = () => {
    switch (paymentMode) {
      case 'UPI':
        return 'UPI UTR / Ref';
      case 'CHEQUE':
        return 'Cheque No.';
      case 'DEMAND_DRAFT':
        return 'DD Number';
      case 'POS':
        return 'Card Txn / Approval';
      case 'BANK_TRANSFER':
        return 'Bank UTR / Txn';
      default:
        return 'Ref / Txn No.';
    }
  };

  const getRefPlaceholder = () => {
    switch (paymentMode) {
      case 'CASH':
        return 'Optional note/voucher';
      case 'UPI':
        return '12-digit UTR / UPI Ref';
      case 'CHEQUE':
        return '6-digit Cheque No.';
      case 'DEMAND_DRAFT':
        return 'DD Serial Number';
      case 'POS':
        return 'Card Auth / Ref No.';
      case 'BANK_TRANSFER':
        return 'NEFT / RTGS Ref No.';
      default:
        return 'Reference / Txn No.';
    }
  };

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2.5 shrink-0">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">Payment Details</h3>
        </div>
      </div>

      {errorMsg && (
        <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[10px] font-semibold text-rose-700">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Date */}
        <div>
          <DatePicker
            label="Date"
            value={paymentDate}
            onChange={(val) => setPaymentDate(val)}
            required
          />
        </div>

        {/* Mode */}
        <div>
          <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Mode</label>
          <select
            value={paymentMode}
            autoComplete="off"
            onChange={(e) => {
              setPaymentMode(e.target.value);
              setErrorMsg('');
            }}
            className="w-full py-1.5 px-2 text-xs bg-slate-50/80 hover:bg-slate-100/70 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800 transition-colors"
          >
            <option value="CASH">Cash</option>
            <option value="UPI">Online / UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
            <option value="CHEQUE">Cheque</option>
            <option value="DEMAND_DRAFT">Demand Draft</option>
            <option value="POS">POS Card</option>
          </select>
        </div>
      </div>

      {/* Reference Number */}
      <div>
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
          {getRefLabel()} {!isCash && <span className="text-rose-500">*</span>}
        </label>
        <input
          type="text"
          autoComplete="off"
          value={referenceNumber}
          onChange={(e) => {
            setReferenceNumber(e.target.value);
            if (errorMsg) setErrorMsg('');
          }}
          placeholder={getRefPlaceholder()}
          className={`w-full py-1.5 px-2.5 text-xs bg-slate-50/50 border rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 font-mono text-slate-900 transition-colors ${
            !isCash && !referenceNumber ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
          }`}
        />
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Remarks</label>
        <input
          type="text"
          autoComplete="off"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Optional note..."
          className="w-full py-1.5 px-2.5 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-900 transition-colors"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-1">
        <Button
          type="submit"
          variant="primary"
          size="md"
          fullWidth
          disabled={isDisabled || isSubmitting || totalSelectedAmount <= 0}
          isLoading={isSubmitting}
          loadingText="Collecting..."
          className={`py-2.5 text-xs sm:text-sm font-bold transition-all ${
            totalSelectedAmount > 0
              ? 'shadow-xs hover:shadow-sm'
              : 'opacity-50 cursor-not-allowed bg-slate-200 text-slate-500 hover:bg-slate-200'
          }`}
        >
          {totalSelectedAmount > 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Collect ₹{totalSelectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </>
          ) : (
            'Select Charges to Collect'
          )}
        </Button>
      </div>
    </form>
  );
};

export default PaymentForm;
