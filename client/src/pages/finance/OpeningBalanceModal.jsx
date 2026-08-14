import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { financeService } from '../../services/financeService.js';
import { Landmark, ArrowUpRight } from 'lucide-react';

export const OpeningBalanceModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    paymentMode: 'BANK_TRANSFER',
    referenceNumber: '',
    remarks: '',
    transactionDate: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const paymentModes = [
    { label: 'Bank Account', value: 'BANK_TRANSFER' },
    { label: 'Cash In Hand', value: 'CASH' },
    { label: 'UPI / Online Wallet', value: 'UPI' },
    { label: 'Cheque Account', value: 'CHEQUE' },
    { label: 'Demand Draft', value: 'DEMAND_DRAFT' },
    { label: 'Other Account', value: 'OTHER' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Opening balance amount must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      await financeService.recordOpeningBalance(formData);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to record opening balance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Opening Financial Balance" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-indigo-50 border border-indigo-100 p-3.5 rounded-xl flex items-start gap-3 text-xs text-indigo-900">
          <Landmark className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Initial Balance Entry</p>
            <p className="text-indigo-700 text-[11px] mt-0.5">
              Establishes initial cash/bank balance when starting with the SaaS. Automatically recorded as an immutable <span className="font-bold">OPENING_BALANCE CREDIT</span>.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Amount (₹) *"
            type="number"
            min="1"
            step="any"
            placeholder="e.g. 50000"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            required
          />

          <Select
            label="Account / Payment Mode *"
            value={formData.paymentMode}
            onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
            options={paymentModes}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Transaction Date *"
            type="date"
            value={formData.transactionDate}
            onChange={(e) => setFormData({ ...formData, transactionDate: e.target.value })}
            required
          />

          <Input
            label="Reference Number / Acc No"
            placeholder="e.g. ACC-2026-001"
            value={formData.referenceNumber}
            onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
          />
        </div>

        <Textarea
          label="Remarks / Note"
          placeholder="e.g. Initial school operating cash balance"
          rows={2}
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
        />

        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={ArrowUpRight}>
            {loading ? 'Saving Balance...' : 'Record Opening Balance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
