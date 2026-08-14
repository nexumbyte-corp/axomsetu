import React from 'react';
import { Checkbox } from '../ui/Checkbox.jsx';
import { Badge } from '../ui/Badge.jsx';

export const OutstandingChargesTable = ({
  charges = [],
  selectedChargeIds = [],
  paymentAmounts = {},
  onToggleCharge,
  onToggleAll,
  onUpdatePaymentAmount,
  isLoading = false,
}) => {
  const payableCharges = charges.filter(
    (c) => c.status === 'UNPAID' || c.status === 'PARTIAL'
  );

  const isAllSelected =
    payableCharges.length > 0 &&
    payableCharges.every((c) => selectedChargeIds.includes(c.id));

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <Badge variant="success" size="sm">PAID</Badge>;
      case 'PARTIAL':
        return <Badge variant="warning" size="sm">PARTIAL</Badge>;
      case 'WAIVED':
        return <Badge variant="neutral" size="sm">WAIVED</Badge>;
      case 'VOID':
        return <Badge variant="neutral" size="sm">VOID</Badge>;
      default:
        return <Badge variant="danger" size="sm">UNPAID</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 shadow-2xs">
        <div className="h-4 w-36 bg-slate-200 rounded animate-pulse" />
        <div className="space-y-1.5 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (charges.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center shadow-2xs space-y-1">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto font-bold text-sm">
          ✓
        </div>
        <h3 className="text-xs font-bold text-slate-900">No Outstanding Charges</h3>
        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
          All fee charges for this student have been cleared.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
        <h3 className="text-xs font-bold text-slate-900">Outstanding Fee Charges</h3>

        {payableCharges.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={isAllSelected}
              onChange={onToggleAll}
              id="select-all-charges"
            />
            <label htmlFor="select-all-charges" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
              Select All ({payableCharges.length})
            </label>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2 px-3 w-8 text-center">Select</th>
              <th className="py-2 px-3">Description</th>
              <th className="py-2 px-3">Month</th>
              <th className="py-2 px-3 text-right">Charge</th>
              <th className="py-2 px-3 text-right">Paid</th>
              <th className="py-2 px-3 text-right">Balance</th>
              <th className="py-2 px-3 text-right w-32">Pay Amount (₹)</th>
              <th className="py-2 px-3 text-center w-20">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {charges.map((charge) => {
              const isPayable = charge.status === 'UNPAID' || charge.status === 'PARTIAL';
              const isSelected = selectedChargeIds.includes(charge.id);
              const totalAmt = Number(charge.chargeAmount ?? charge.amount ?? 0);
              const paidAmt = Number(charge.paidAmount ?? 0);
              const remainingBal = charge.balance !== undefined && charge.balance !== null
                ? Number(charge.balance)
                : Math.max(0, totalAmt - paidAmt);
              const currentPayVal = paymentAmounts[charge.id] !== undefined
                ? paymentAmounts[charge.id]
                : remainingBal;

              const isOver = Number(currentPayVal) > remainingBal;

              return (
                <tr
                  key={charge.id}
                  className={`transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/40 font-medium'
                      : !isPayable
                      ? 'bg-slate-50/50 opacity-60'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="py-2 px-3 text-center">
                    <Checkbox
                      checked={isSelected}
                      disabled={!isPayable}
                      onChange={() => onToggleCharge(charge.id, remainingBal)}
                    />
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-900">
                    {charge.title}
                    {charge.feeType?.name && (
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({charge.feeType.name})
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-700 text-[11px]">
                    {charge.month}{charge.year ? ` ${charge.year}` : ''}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-700">
                    ₹{totalAmt.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold">
                    ₹{paidAmt.toFixed(2)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                    ₹{remainingBal.toFixed(2)}
                  </td>
                  <td className="py-1 px-2 text-right">
                    {isSelected ? (
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={remainingBal}
                          value={currentPayVal}
                          onChange={(e) => onUpdatePaymentAmount(charge.id, e.target.value)}
                          className={`w-full text-right py-1 px-2 rounded-lg border font-mono font-bold text-xs focus:outline-none transition-all ${
                            isOver
                              ? 'border-rose-500 bg-rose-50 text-rose-700'
                              : 'border-indigo-300 bg-white text-indigo-900 focus:ring-1 focus:ring-indigo-300'
                          }`}
                        />
                        {isOver && (
                          <span className="text-[8px] text-rose-600 block text-right font-semibold">
                            Exceeds bal
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 font-mono text-[11px]">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-center">{getStatusBadge(charge.status)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OutstandingChargesTable;
