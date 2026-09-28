import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Printer,
  Download,
  Eye,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { Modal } from '../ui/Modal.jsx';
import { toast } from '../ui/Toast.jsx';
import { formatDate } from '../../utils/formatters.js';
import { paymentService } from '../../services/payment.service.js';
import { printPdfDocument, downloadPdfDocument } from '../../core/documents/documentEngine.js';
import { DocumentActions } from '../documents/DocumentActions.jsx';
import { ReceiptCard } from './ReceiptCard.jsx';

export const LedgerTimeline = ({ charges = [] }) => {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState([]);
  const [viewingPaymentId, setViewingPaymentId] = useState(null);
  const [receiptDetails, setReceiptDetails] = useState(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  const [rowAction, setRowAction] = useState({ id: null, type: null }); // type: 'print' | 'download'

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handlePrintReceipt = async (p, e) => {
    if (e) e.stopPropagation();
    const paymentId = p.paymentId || p.id;
    if (!paymentId) {
      toast.error('Payment ID not available');
      return;
    }
    setRowAction({ id: paymentId, type: 'print' });
    try {
      const res = await paymentService.getReceiptReprint(paymentId);
      const receiptData = res.data || res;
      await printPdfDocument({
        templateId: 'receipt',
        data: receiptData,
        options: { copyLabel: 'Dual Copy' },
      });
    } catch (err) {
      console.error('Failed to print receipt:', err);
      toast.error('Unable to print receipt. Please try again.');
    } finally {
      setRowAction({ id: null, type: null });
    }
  };

  const handleDownloadReceipt = async (p, e) => {
    if (e) e.stopPropagation();
    const paymentId = p.paymentId || p.id;
    if (!paymentId) {
      toast.error('Payment ID not available');
      return;
    }
    setRowAction({ id: paymentId, type: 'download' });
    try {
      const res = await paymentService.getReceiptReprint(paymentId);
      const receiptData = res.data || res;
      const filename = `Receipt_${p.receiptNumber || 'RCPT'}.pdf`;
      await downloadPdfDocument({
        templateId: 'receipt',
        data: receiptData,
        filename,
        options: { copyLabel: 'Dual Copy' },
      });
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to download receipt:', err);
      toast.error('Unable to download receipt. Please try again.');
    } finally {
      setRowAction({ id: null, type: null });
    }
  };

  const handleViewReceipt = async (p, e) => {
    if (e) e.stopPropagation();
    const paymentId = p.paymentId || p.id;
    if (!paymentId) {
      toast.error('Payment ID not available');
      return;
    }
    setViewingPaymentId(paymentId);
    setIsLoadingReceipt(true);
    try {
      const res = await paymentService.getReceiptDetails(paymentId);
      setReceiptDetails(res.data || res);
    } catch (err) {
      console.error('Failed to load receipt details:', err);
      toast.error('Unable to load receipt details.');
      setViewingPaymentId(null);
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleCloseModal = () => {
    setViewingPaymentId(null);
    setReceiptDetails(null);
    setIsLoadingReceipt(false);
  };

  if (!charges || charges.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-2xs space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto font-bold">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No Fee Records Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No generated fee charges exist for this student yet.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {charges.map((charge) => {
          const isExpanded = expandedIds.includes(charge.id);
          const payments = charge.payments || charge.allocations || [];
          const isPaid = charge.status === 'PAID';
          const isPartial = charge.status === 'PARTIAL';

          return (
            <div
              key={charge.id}
              className={`bg-white rounded-2xl border transition-all shadow-2xs overflow-hidden ${
                isPaid
                  ? 'border-emerald-200'
                  : isPartial
                  ? 'border-amber-200'
                  : 'border-slate-200'
              }`}
            >
              {/* Header Summary Row */}
              <div
                onClick={() => toggleExpand(charge.id)}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-700'
                        : isPartial
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {charge.month ? charge.month.substring(0, 3) : 'FEE'}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900">{charge.title}</h4>
                      <Badge
                        variant={
                          isPaid ? 'success' : isPartial ? 'warning' : charge.status === 'WAIVED' ? 'neutral' : 'danger'
                        }
                        size="sm"
                      >
                        {charge.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Month: <span className="font-semibold text-slate-700">{charge.month}{charge.year ? ` ${charge.year}` : ''}</span>
                      {charge.feeType?.name && ` • Type: ${charge.feeType.name}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 text-xs border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Charge</span>
                    <span className="font-mono font-bold text-slate-900">₹{Number(charge.amount).toFixed(2)}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Paid</span>
                    <span className="font-mono font-bold text-emerald-600">₹{Number(charge.paidAmount || 0).toFixed(2)}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance</span>
                    <span className={`font-mono font-extrabold ${charge.balance > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      ₹{Number(charge.balance || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-slate-400 hover:text-slate-600">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expandable Payments Breakdown */}
              {isExpanded && (
                <div className="bg-slate-50 p-4 border-t border-slate-200 space-y-3">
                  <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Allocated Payments History ({payments.length})
                  </h5>

                  {payments.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No payments allocated to this charge yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {payments.map((p, idx) => {
                        const paymentId = p.paymentId || p.id;
                        const isActionDisabled = rowAction.id === paymentId;

                        return (
                          <div
                            key={idx}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-medium hover:border-slate-300 transition-colors shadow-2xs"
                          >
                            {/* Receipt Details & Mode */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => handleViewReceipt(p, e)}
                                  className="font-mono font-bold text-indigo-700 hover:text-indigo-900 hover:underline cursor-pointer"
                                  title="View Receipt Details"
                                >
                                  {p.receiptNumber}
                                </button>
                                <span className="text-slate-300">•</span>
                                <span className="text-slate-600 font-mono text-[11px]">
                                  {formatDate(p.paymentDate)}
                                </span>
                                <span className="text-slate-300">•</span>
                                <Badge variant="info" size="sm" className="text-[10px] py-0 px-1.5">
                                  {p.paymentMode}
                                </Badge>
                              </div>
                            </div>

                            {/* Amount & Actions */}
                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                              <div className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                                +₹{Number(p.allocatedAmount).toFixed(2)}
                              </div>

                              <div className="flex items-center gap-1">
                                {/* Print Dual Copy */}
                                <button
                                  type="button"
                                  onClick={(e) => handlePrintReceipt(p, e)}
                                  disabled={isActionDisabled}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                  title="Print Dual Copy Receipt"
                                  aria-label="Print Dual Copy Receipt"
                                >
                                  {rowAction.id === paymentId && rowAction.type === 'print' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                  ) : (
                                    <Printer className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* Download PDF */}
                                <button
                                  type="button"
                                  onClick={(e) => handleDownloadReceipt(p, e)}
                                  disabled={isActionDisabled}
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                  title="Download Receipt PDF"
                                  aria-label="Download Receipt PDF"
                                >
                                  {rowAction.id === paymentId && rowAction.type === 'download' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* View Receipt Details */}
                                <button
                                  type="button"
                                  onClick={(e) => handleViewReceipt(p, e)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-indigo-600 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                  title="View Receipt Details"
                                  aria-label="View Receipt Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="hidden xs:inline">View</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Receipt View & Print Modal (uses exact ReceiptCard and DocumentActions from Receipt Details) */}
      {viewingPaymentId && (
        <Modal
          isOpen={Boolean(viewingPaymentId)}
          onClose={handleCloseModal}
          title={
            receiptDetails ? (
              <div className="flex items-center gap-2">
                <span>Fee Receipt #{receiptDetails.receiptNumber}</span>
                <Badge
                  variant={receiptDetails.status === 'VOID' ? 'danger' : 'success'}
                  size="sm"
                >
                  {receiptDetails.status}
                </Badge>
              </div>
            ) : (
              'Fee Receipt Details'
            )
          }
          size="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => navigate(`/app/fees/receipts/${viewingPaymentId}`)}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200 inline-flex items-center gap-1.5 cursor-pointer"
                title="Open receipt in full dedicated page"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open in Full Page</span>
                <span className="sm:hidden">Full Page</span>
              </button>

              <div className="flex items-center gap-2">
                {receiptDetails && (
                  <DocumentActions
                    templateId="receipt"
                    data={receiptDetails}
                    filename={`Receipt_${receiptDetails.receiptNumber || 'RCPT'}.pdf`}
                    title={`Fee Receipt #${receiptDetails.receiptNumber || 'RCPT'}`}
                    options={{ copyLabel: 'Student Copy' }}
                    size="sm"
                  />
                )}
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg transition-colors border border-slate-200 hover:bg-slate-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          }
        >
          {isLoadingReceipt ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading receipt details...</p>
            </div>
          ) : receiptDetails ? (
            <div className="overflow-y-auto max-h-[70vh] py-1 px-0.5">
              <ReceiptCard receipt={receiptDetails} copyLabel="Student Copy" />
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 text-xs">
              Unable to load receipt details.
            </div>
          )}
        </Modal>
      )}
    </>
  );
};

export default LedgerTimeline;

