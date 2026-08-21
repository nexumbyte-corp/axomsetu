import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '../ui/Badge.jsx';
import { formatDate } from '../../utils/formatters.js';

export const LedgerTimeline = ({ charges = [] }) => {
  const [expandedIds, setExpandedIds] = useState([]);

  const toggleExpand = (id) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
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
                    {payments.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs font-medium"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-mono font-bold text-indigo-700">{p.receiptNumber}</span>
                            <span className="text-slate-400 mx-1.5">•</span>
                            <span className="text-slate-600 font-mono">
                              {formatDate(p.paymentDate)}
                            </span>
                            <span className="text-slate-400 mx-1.5">•</span>
                            <Badge variant="info" size="sm">{p.paymentMode}</Badge>
                          </div>
                        </div>

                        <div className="font-mono font-bold text-emerald-700 text-xs">
                          +₹{Number(p.allocatedAmount).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LedgerTimeline;
