import React from 'react';
import { ShoppingBag } from 'lucide-react';

export const PaymentSummaryCard = ({
  selectedCount = 0,
  selectedTotalBalance = 0,
  totalPayingAmount = 0,
}) => {
  const selectedBal = Number(selectedTotalBalance) || 0;
  const payingAmt = Number(totalPayingAmount) || 0;
  const remainingDues = Math.max(0, selectedBal - payingAmt);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2 shrink-0">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
          <h3 className="text-xs font-bold text-slate-900 tracking-tight">Summary</h3>
        </div>
        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
          {selectedCount} selected
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-slate-600">
          <span className="text-[11px]">Selected Dues</span>
          <span className="font-mono font-semibold text-slate-800 text-xs">
            ₹{selectedBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700">Paying Now</span>
          <span className="font-mono font-bold text-emerald-600 text-sm">
            ₹{payingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-slate-500">
          <span className="text-[11px]">Remaining Bal</span>
          <span className={`font-mono font-semibold text-xs ${remainingDues > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
            ₹{remainingDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryCard;
