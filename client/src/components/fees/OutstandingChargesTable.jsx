import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Checkbox } from '../ui/Checkbox.jsx';
import { Badge } from '../ui/Badge.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';
import { usePermission } from '../../hooks/usePermission.js';

export const OutstandingChargesTable = ({
  charges = [],
  selectedChargeIds = [],
  paymentAmounts = {},
  onToggleCharge,
  onToggleAll,
  onUpdatePaymentAmount,
  onDeleteCharge,
  isDeleting = false,
  isLoading = false,
}) => {
  const [chargeToDelete, setChargeToDelete] = useState(null);
  const { isOwner, isSchoolAdmin, hasFullAccess } = usePermission();
  const canDeleteCharge = isOwner || isSchoolAdmin || hasFullAccess;

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

  const handleConfirmDelete = async () => {
    if (!chargeToDelete || !onDeleteCharge) return;
    try {
      await onDeleteCharge(chargeToDelete);
    } finally {
      setChargeToDelete(null);
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
    <>
      <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="shrink-0 px-3 py-2 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-900">Fee Dues</h3>

          {payableCharges.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Checkbox
                checked={isAllSelected}
                onChange={onToggleAll}
                id="select-all-charges"
              />
              <label htmlFor="select-all-charges" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                All ({payableCharges.length})
              </label>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100/90 backdrop-blur-xs text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-1.5 px-2.5 w-7 text-center">[ ]</th>
                <th className="py-1.5 px-2.5">Fee Title</th>
                <th className="py-1.5 px-2.5">Month</th>
                <th className="py-1.5 px-2.5 text-right">Amount</th>
                <th className="py-1.5 px-2.5 text-right">Paid</th>
                <th className="py-1.5 px-2.5 text-right">Bal</th>
                <th className="py-1.5 px-2.5 text-right w-28">Pay (₹)</th>
                <th className="py-1.5 px-2.5 text-center w-16">Status</th>
                {canDeleteCharge && <th className="py-1.5 px-2.5 text-center w-10">Del</th>}
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
                const isDeletable = canDeleteCharge && charge.status === 'UNPAID' && paidAmt === 0;

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
                    <td className="py-1.5 px-2 text-center">
                      <Checkbox
                        checked={isSelected}
                        disabled={!isPayable}
                        onChange={() => onToggleCharge(charge.id, remainingBal)}
                      />
                    </td>
                    <td className="py-1.5 px-2.5 font-bold text-slate-900">
                      {charge.title}
                      {charge.feeType?.name && (
                        <span className="text-[9px] text-slate-400 font-normal ml-1">
                          ({charge.feeType.name})
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-700 text-[11px]">
                      {charge.month}{charge.year ? ` ${charge.year}` : ''}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-slate-700">
                      ₹{totalAmt.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-emerald-600 font-semibold">
                      ₹{paidAmt.toFixed(2)}
                    </td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                      ₹{remainingBal.toFixed(2)}
                    </td>
                    <td className="py-1 px-1.5 text-right">
                      {isSelected ? (
                        <div className="relative">
                          <input
                            type="number"
                            autoComplete="off"
                            step="0.01"
                            min="0.01"
                            max={remainingBal}
                            value={currentPayVal}
                            onChange={(e) => onUpdatePaymentAmount(charge.id, e.target.value)}
                            className={`w-full text-right py-0.5 px-1.5 rounded-md border font-mono font-bold text-xs focus:outline-none transition-all ${
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
                    <td className="py-1.5 px-2 text-center">{getStatusBadge(charge.status)}</td>
                    {canDeleteCharge && (
                      <td className="py-1.5 px-2 text-center">
                        {isDeletable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChargeToDelete(charge);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center justify-center"
                            title="Delete Unpaid Fee Charge"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {chargeToDelete && (
        <ConfirmDialog
          isOpen={Boolean(chargeToDelete)}
          onClose={() => setChargeToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Unpaid Fee Charge"
          message={`Are you sure you want to permanently delete '${chargeToDelete.title}' (${chargeToDelete.month}) of amount ₹${Number(chargeToDelete.amount || chargeToDelete.chargeAmount || 0).toFixed(2)}? This action cannot be undone.`}
          confirmText="Delete Charge"
          variant="danger"
          loading={isDeleting}
        />
      )}
    </>
  );
};

export default OutstandingChargesTable;
