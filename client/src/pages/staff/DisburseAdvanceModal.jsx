import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { staffService } from '../../services/staff.service.js';
import { AlertCircle } from 'lucide-react';

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'UPI', label: 'UPI / Online' },
  { value: 'CHEQUE', label: 'Cheque' },
];

export const DisburseAdvanceModal = ({ isOpen, onClose, staff, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (staff.status !== 'ACTIVE' && staff.status !== 'ON_LEAVE') {
      setError('Cannot disburse advance to inactive or non-operational staff member.');
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError('Please enter a valid positive advance amount.');
      return;
    }

    setLoading(true);
    try {
      const response = await staffService.disburseAdvance(staff.id, {
        amount: amountNum,
        advanceDate,
        paymentMode,
        referenceNo,
        remarks,
      });

      if (onSuccess) onSuccess(response.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to disburse advance payment.');
    } finally {
      setLoading(false);
    }
  };

  if (!staff) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Disburse Advance Payment - ${staff.name}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
          <p className="font-bold">Advance Payment Note:</p>
          <p>
            Current Outstanding Advance Balance for {staff.name}:{' '}
            <span className="font-bold">₹{Number(staff.advanceBalance || 0).toLocaleString('en-IN')}</span>.
            Disbursing an advance will increase this balance.
          </p>
        </div>

        <Input
          label="Advance Amount (₹) *"
          type="number"
          min="100"
          step="500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 5000"
          required
        />

        <Input
          label="Disbursement Date *"
          type="date"
          value={advanceDate}
          onChange={(e) => setAdvanceDate(e.target.value)}
          required
        />

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
          placeholder="e.g. Ref #12345"
        />

        <Input
          label="Reason / Remarks"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Personal emergency advance request"
        />

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 mt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>

          <Button type="submit" variant="primary" loading={loading}>
            Disburse Advance
          </Button>
        </div>
      </form>
    </Modal>
  );
};
