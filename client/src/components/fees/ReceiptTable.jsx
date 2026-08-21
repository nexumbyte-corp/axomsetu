import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  FileText,
  Printer,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Tag,
} from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { toast } from '../ui/Toast.jsx';
import { formatDate, formatCurrency } from '../../utils/formatters.js';
import { paymentService } from '../../services/payment.service.js';
import { printPdfDocument, downloadPdfDocument } from '../../core/documents/documentEngine.js';

export const ReceiptTable = ({ payments = [], isLoading = false, onSelectReceipt: _onSelectReceipt }) => {
  const navigate = useNavigate();
  const [rowAction, setRowAction] = useState({ id: null, type: null }); // type: 'print' | 'download'
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRowExpanded = (id, e) => {
    if (e) e.stopPropagation();
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePrintReceipt = async (p, e) => {
    if (e) e.stopPropagation();
    setRowAction({ id: p.id, type: 'print' });
    try {
      const res = await paymentService.getReceiptReprint(p.id);
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
    setRowAction({ id: p.id, type: 'download' });
    try {
      const res = await paymentService.getReceiptReprint(p.id);
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

  const getModeBadgeVariant = (mode) => {
    switch (mode) {
      case 'CASH':
        return 'success';
      case 'UPI':
      case 'ONLINE':
        return 'info';
      case 'BANK_TRANSFER':
        return 'primary';
      case 'CHEQUE':
      case 'DEMAND_DRAFT':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2.5 shadow-2xs">
        <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center shadow-2xs space-y-2">
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <FileText className="w-5 h-5" />
        </div>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">No Receipts Found</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No fee receipts matched your search, date range, or status criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 w-8"></th>
              <th className="py-2.5 px-3">Receipt / Ref #</th>
              <th className="py-2.5 px-3">Student & Class</th>
              <th className="py-2.5 px-3">Payment Date</th>
              <th className="py-2.5 px-3 text-center">Mode</th>
              <th className="py-2.5 px-3 text-right">Amount</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {payments.map((p) => {
              const isVoid = p.status === 'VOID';
              const isExpanded = Boolean(expandedRows[p.id]);
              const allocations = p.allocations || [];
              const receiverName = p.receivedByName || p.receivedBy?.name || 'System';
              const studentName = p.studentName || p.student?.name || 'Student';

              // Extract Class / Section / Medium / Stream info
              const enr =
                p.student?.enrollment ||
                p.student?.enrollments?.find((e) => e.academicYearId === p.academicYear?.id && e.status === 'ACTIVE') ||
                p.student?.enrollments?.find((e) => e.academicYearId === p.academicYear?.id) ||
                p.student?.enrollments?.find((e) => e.status === 'ACTIVE') ||
                p.student?.enrollments?.[0];

              const className = p.className || p.student?.className || enr?.class?.name;
              const sectionName = p.sectionName || p.student?.sectionName || enr?.section?.name;
              const mediumName = p.mediumName || p.student?.mediumName || enr?.medium?.name;
              const streamName = p.streamName || p.student?.streamName || enr?.stream?.name;

              const isActionDisabled = rowAction.id === p.id;

              return (
                <React.Fragment key={p.id}>
                  <tr
                    className={`hover:bg-slate-50/90 transition-colors ${
                      isVoid ? 'bg-rose-50/30 text-slate-500' : isExpanded ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    {/* Expand Row Toggle */}
                    <td className="py-2.5 px-2 text-center">
                      {allocations.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => toggleRowExpanded(p.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-200/50 transition-colors"
                          title={isExpanded ? 'Collapse breakdown' : 'View fee breakdown'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </td>

                    {/* Receipt & Ref # */}
                    <td className="py-2.5 px-3 font-mono">
                      <span className="font-extrabold text-indigo-700 text-xs block">
                        #{p.receiptNumber}
                      </span>
                      {p.referenceNumber && (
                        <span className="text-[10px] text-slate-500 block truncate max-w-[130px]" title={`Ref: ${p.referenceNumber}`}>
                          Ref: {p.referenceNumber}
                        </span>
                      )}
                    </td>

                    {/* Student & Class Details (Clean layout without photo) */}
                    <td className="py-2.5 px-3 max-w-[220px]">
                      <div className="font-bold text-slate-900 truncate">
                        {studentName}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                        <span>Adm: {p.admissionNo || p.student?.admissionNo || '-'}</span>
                      </div>
                      {(className || sectionName || streamName || mediumName) && (
                        <div className="text-[10px] text-slate-600 font-medium truncate mt-0.5">
                          {className && <span className="font-bold">{className}</span>}
                          {sectionName && <span> ({sectionName})</span>}
                          {streamName && <span className="text-indigo-600 font-semibold ml-1">· {streamName}</span>}
                          {mediumName && <span className="text-slate-400 font-normal"> · {mediumName}</span>}
                        </div>
                      )}
                    </td>

                    {/* Payment Date & Cashier */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-mono text-xs text-slate-800 font-medium">
                        {formatDate(p.paymentDate || p.createdAt)}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{receiverName}</span>
                      </div>
                    </td>

                    {/* Payment Mode */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <Badge variant={getModeBadgeVariant(p.paymentMode)} size="sm" className="text-[10px] py-0.5">
                        {p.paymentMode?.replace('_', ' ')}
                      </Badge>
                    </td>

                    {/* Amount */}
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-xs whitespace-nowrap">
                      <span className={isVoid ? 'line-through text-rose-400' : 'text-slate-900'}>
                        {formatCurrency(p.receivedAmount || p.amount)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <Badge variant={isVoid ? 'danger' : 'success'} size="sm" className="text-[10px]">
                        {p.status}
                      </Badge>
                    </td>

                    {/* Quick Actions */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {/* Print Receipt */}
                        <button
                          type="button"
                          onClick={(e) => handlePrintReceipt(p, e)}
                          disabled={isActionDisabled}
                          title="Print Dual Copy Receipt"
                          aria-label="Print Receipt"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors disabled:opacity-50"
                        >
                          {rowAction.id === p.id && rowAction.type === 'print' ? (
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
                          title="Download PDF Receipt"
                          aria-label="Download PDF Receipt"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors disabled:opacity-50"
                        >
                          {rowAction.id === p.id && rowAction.type === 'download' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* View Full Details */}
                        <button
                          type="button"
                          onClick={() => navigate(`/app/fees/receipts/${p.id}`)}
                          title="View Receipt Details"
                          aria-label="View Receipt Details"
                          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Breakdown Sub-Row */}
                  {isExpanded && (
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <td colSpan={8} className="p-3 pl-10">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-indigo-600" />
                              Allocated Fee Heads Breakdown
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-600">
                              Receipt #{p.receiptNumber}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {allocations.map((alloc, idx) => {
                              const paidNow = Number(alloc.allocatedAmount || alloc.amount || 0);
                              const prevPaid = Number(alloc.previouslyPaidAmount || 0);
                              return (
                                <div
                                  key={alloc.id || idx}
                                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <span className="font-bold text-slate-800 block">
                                      {alloc.charge?.title || alloc.title || 'Fee Head'}
                                    </span>
                                    <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 font-mono mt-0.5">
                                      {alloc.charge?.month && <span>Month: {alloc.charge.month}</span>}
                                      {prevPaid > 0 && <span className="text-amber-700">Prev Paid: ₹{prevPaid.toFixed(2)}</span>}
                                    </div>
                                  </div>
                                  <span className="font-mono font-extrabold text-emerald-700 text-xs ml-2">
                                    +₹{paidNow.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {p.remarks && (
                            <div className="pt-1 text-[11px] text-slate-600 italic">
                              <span className="font-bold not-italic text-slate-700">Remarks:</span> {p.remarks}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceiptTable;
