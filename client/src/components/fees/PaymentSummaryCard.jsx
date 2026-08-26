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
    <div className="bg-slate-900 text-white rounded-xl p-2.5 shadow-xs space-y-1.5 shrink-0">
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
          <h3 className="text-xs font-bold tracking-wide">Summary</h3>
        </div>
        <span className="text-[9px] font-bold bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-500/30">
          {selectedCount} Sel
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-[10px]">Sel Total</span>
          <span className="font-mono font-bold text-white text-xs">
            ₹{selectedBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-300">
          <span className="text-[10px] text-emerald-400 font-semibold">Received</span>
          <span className="font-mono font-extrabold text-emerald-400 text-xs sm:text-sm">
            ₹{payingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-slate-400">
          <span className="text-[10px]">Balance</span>
          <span className={`font-mono font-bold text-xs ${remainingDues > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            ₹{remainingDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentSummaryCard;
