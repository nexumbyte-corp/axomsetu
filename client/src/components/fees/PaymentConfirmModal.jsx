import React from 'react';
import { DollarSign, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';

export const PaymentConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  student,
  paymentDetails,
}) => {
  if (!isOpen || !student || !paymentDetails) return null;

  const { paymentMode, totalSelectedAmount } = paymentDetails;
  const formattedAmount = Number(totalSelectedAmount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
  });

  return (
    <Modal isOpen={isOpen} onClose={isSubmitting ? undefined : onClose} size="sm">
      <div className="p-4 space-y-4 text-center">
        {/* Icon */}
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
          <DollarSign className="w-6 h-6" />
        </div>

        {/* Confirmation Question */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900">Confirm Fee Collection</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to collect <strong className="text-emerald-700 font-mono text-sm">₹{formattedAmount}</strong> via <strong className="text-slate-900">{paymentMode?.replace(/_/g, ' ')}</strong> for student <strong className="text-slate-900">{student.name}</strong> ({student.admissionNo})?
          </p>
        </div>

        {/* Buttons */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isSubmitting}
            loadingText="Collecting..."
            className="flex-1"
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PaymentConfirmModal;
