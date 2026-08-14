import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, Printer, PlusCircle } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';

export const ReceiptSuccessModal = ({ isOpen, onClose, resultData, onCollectAnother }) => {
  const navigate = useNavigate();

  if (!resultData) return null;

  const { paymentId, receiptNumber, receivedAmount, paymentMode } = resultData;
  const amount = Number(receivedAmount || 0);

  const handleViewReceipt = () => {
    onClose();
    navigate(`/app/fees/receipts/${paymentId}`);
  };

  const handlePrintReceipt = () => {
    onClose();
    navigate(`/app/fees/receipts/${paymentId}?print=true`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" showCloseButton={false}>
      <div className="text-center p-6 space-y-5">
        {/* Success Icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        {/* Title */}
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Payment Collected Successfully</h2>
          <p className="text-xs text-slate-500 mt-1">
            Transaction completed and receipt generated.
          </p>
        </div>

        {/* Receipt Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Receipt Number</span>
            <span className="font-mono font-bold text-indigo-700 text-sm bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {receiptNumber}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Amount Collected</span>
            <span className="font-mono font-extrabold text-slate-900 text-base">
              ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500">Payment Mode</span>
            <Badge variant="info" size="sm">{paymentMode}</Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <Button variant="outline" size="sm" onClick={handleViewReceipt}>
            <FileText className="w-4 h-4 mr-1.5" />
            View Receipt
          </Button>

          <Button variant="secondary" size="sm" onClick={handlePrintReceipt}>
            <Printer className="w-4 h-4 mr-1.5" />
            Print Receipt
          </Button>

          <Button variant="primary" size="sm" onClick={onCollectAnother}>
            <PlusCircle className="w-4 h-4 mr-1.5" />
            New Payment
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReceiptSuccessModal;
