import { useState } from 'react';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button.jsx';
import { DatePicker } from '../ui/DatePicker.jsx';

export const PaymentForm = ({
  onSubmit,
  isSubmitting = false,
  isDisabled = false,
  totalSelectedAmount = 0,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isCash = paymentMode === 'CASH';

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isCash && (!referenceNumber || referenceNumber.trim() === '')) {
      const modeLabel = paymentMode === 'UPI' ? 'UPI UTR / Ref' : paymentMode === 'CHEQUE' ? 'Cheque No.' : 'Ref No.';
      setErrorMsg(`${modeLabel} required for ${paymentMode}.`);
      return;
    }

    if (totalSelectedAmount <= 0) {
      setErrorMsg('Select at least one fee charge.');
      return;
    }

    onSubmit({
      paymentDate,
      paymentMode,
      referenceNumber: referenceNumber.trim() || null,
      remarks: remarks.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
          <span>Payment Details</span>
        </h3>
        <span className="text-[10px] text-slate-400 font-medium">Cashier Entry</span>
      </div>

      {errorMsg && (
        <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] font-semibold text-rose-700">
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
            onChange={(e) => {
              setPaymentMode(e.target.value);
              setErrorMsg('');
            }}
            className="w-full py-1.5 px-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-900"
          >
            <option value="CASH">💵 CASH</option>
            <option value="UPI">📱 UPI</option>
            <option value="BANK_TRANSFER">🏦 BANK</option>
            <option value="CHEQUE">📑 CHEQUE</option>
            <option value="DEMAND_DRAFT">📄 DD</option>
          </select>
        </div>
      </div>

      {/* Reference Number */}
      <div>
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
          Ref / Transaction No. {!isCash && <span className="text-rose-500">*</span>}
        </label>
        <input
          type="text"
          value={referenceNumber}
          onChange={(e) => {
            setReferenceNumber(e.target.value);
            if (errorMsg) setErrorMsg('');
          }}
          placeholder={isCash ? 'Optional' : 'UTR / Cheque No / Ref'}
          className={`w-full py-1.5 px-2 text-xs bg-white border rounded-lg focus:outline-none font-mono text-slate-900 ${
            !isCash && !referenceNumber ? 'border-amber-400 bg-amber-50/40' : 'border-slate-300'
          }`}
        />
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Remarks</label>
        <input
          type="text"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Optional note..."
          className="w-full py-1.5 px-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none text-slate-900"
        />
      </div>

      {/* Submit Button */}
      <div className="pt-1">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          fullWidth
          disabled={isDisabled || isSubmitting || totalSelectedAmount <= 0}
          isLoading={isSubmitting}
          loadingText="Collecting..."
        >
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          Collect ₹{totalSelectedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </Button>
      </div>
    </form>
  );
};

export default PaymentForm;
