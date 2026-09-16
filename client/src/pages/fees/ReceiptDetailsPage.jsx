import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Ban, Loader2, Lock } from 'lucide-react';
import { ReceiptCard } from '../../components/fees/ReceiptCard.jsx';
import { usePaymentDetails, useVoidPayment } from '../../hooks/usePaymentEngine.js';
import { Button } from '../../components/ui/Button.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';

export const ReceiptDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { canVoidReceipt } = usePermission();

  const { data: receiptRes, isLoading, refetch } = usePaymentDetails(id);
  const voidMutation = useVoidPayment();

  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  const receipt = receiptRes?.data || receiptRes;

  useEffect(() => {
    if (searchParams.get('print') === 'true' && receipt) {
      const timer = setTimeout(() => {
        window.print();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [searchParams, receipt]);

  const handleVoidPayment = async () => {
    if (!voidReason || voidReason.trim().length === 0) {
      toast.error('Reason for voiding payment is required.');
      return;
    }

    try {
      await voidMutation.mutateAsync({
        id,
        data: { reason: voidReason.trim() },
      });
      toast.success('Receipt voided successfully.');
      setIsVoidModalOpen(false);
      setVoidReason('');
      refetch();
    } catch (err) {
      toast.error(err.message || 'Unable to void receipt.');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading receipt details...</p>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs space-y-3">
        <p className="text-sm font-bold text-slate-900">Unable to load receipt</p>
        <p className="text-xs text-slate-500">The requested payment receipt was not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/fees/receipts')}>
          Back to Receipts
        </Button>
      </div>
    );
  }

  const isVoid = receipt.status === 'VOID';
  const filename = `Receipt_${receipt.receiptNumber || 'RCPT'}.pdf`;

  return (
    <div className="space-y-4">
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 px-4 rounded-xl border border-slate-200 shadow-2xs print:hidden">
        <button
          onClick={() => navigate('/app/fees/receipts')}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Receipts</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <DocumentActions
            templateId="receipt"
            data={receipt}
            filename={filename}
            title={`Fee Receipt #${receipt.receiptNumber || 'RCPT'}`}
            options={{ copyLabel: 'Student Copy' }}
          />

          {!isVoid && canVoidReceipt && (
            <Button variant="danger" size="sm" onClick={() => setIsVoidModalOpen(true)}>
              <Ban className="w-3.5 h-3.5 mr-1.5" />
              Void Receipt
            </Button>
          )}
          {!isVoid && !canVoidReceipt && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg cursor-not-allowed" title="Only Owner or School Admin can void receipts">
              <Lock className="w-3.5 h-3.5" />
              Void Receipt
            </span>
          )}
        </div>
      </div>

      {/* On-Screen Card Preview */}
      <div>
        <ReceiptCard receipt={receipt} copyLabel="Student Copy" />
      </div>

      {/* Void Receipt Confirmation Modal */}
      <Modal
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
        title="Void Receipt Confirmation"
        size="md"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium space-y-1">
            <p className="font-bold">Warning: Void this payment?</p>
            <p>
              This action will mark receipt <span className="font-mono font-bold">{receipt.receiptNumber}</span> as VOID, ignore its allocations, and restore the student's fee charge balances.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Reason for Voiding <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Specify audit reason for voiding payment (e.g. Returned cheque, Entry mistake)..."
              className="w-full py-2 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsVoidModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleVoidPayment}
              isLoading={voidMutation.isPending}
              loadingText="Voiding..."
            >
              Confirm Void Payment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReceiptDetailsPage;
