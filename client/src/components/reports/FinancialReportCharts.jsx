import React, { useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Calendar,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Scale,
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters.js';

export const FinancialReportCharts = ({ chartData, loading }) => {
  const { summaryCards, monthlyChartData = [], expenseDistribution = [] } = chartData || {};

  // Max value calculation for bar chart relative scaling
  const maxBarValue = useMemo(() => {
    if (!monthlyChartData || monthlyChartData.length === 0) return 1000;
    const maxVal = Math.max(
      ...monthlyChartData.flatMap((m) => [m.expectedCollection || 0, m.actualCollection || 0, m.expense || 0])
    );
    return maxVal > 0 ? maxVal * 1.15 : 1000; // 15% head room
  }, [monthlyChartData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
        <div className="h-80 bg-slate-100 rounded-2xl animate-pulse"></div>
      </div>
    );
  }

  const hasData = summaryCards?.hasData;

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. FINANCIAL SUMMARY KPI CARDS                                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Expected Collection Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Expected Collection
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black font-mono text-slate-900">
            {formatCurrency(summaryCards?.expectedCollection || 0)}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Billed Fee Charges</span>
            <span className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-1.5 py-0.5 rounded">
              {summaryCards?.collectionRate || 0}% Realized
            </span>
          </div>
        </div>

        {/* Actual Collection Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              Actual Collection
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black font-mono text-emerald-600">
            {formatCurrency(summaryCards?.actualCollection || 0)}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Received & Allocated</span>
            <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <ArrowUpRight className="w-3 h-3" /> Paid Dues
            </span>
          </div>
        </div>

        {/* School Expenses Card */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs relative overflow-hidden transition-all hover:border-slate-300">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              School Expenses
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-xl font-black font-mono text-rose-600">
            {formatCurrency(summaryCards?.totalExpense || 0)}
          </p>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">Operational Outflows</span>
            <span className="text-rose-700 font-bold text-[10px] bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <ArrowDownRight className="w-3 h-3" /> Outflow
            </span>
          </div>
        </div>

        {/* Net Collection Balance Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-200">
              Net Surplus / Balance
            </span>
            <div className="w-7 h-7 rounded-lg bg-white/10 text-indigo-300 flex items-center justify-center font-bold">
              <Scale className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className={`text-xl font-black font-mono ${(summaryCards?.netBalance || 0) >= 0 ? 'text-emerald-400' : 'text-rose-300'}`}>
            {formatCurrency(summaryCards?.netBalance || 0)}
          </p>
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-indigo-200">
            <span>Actual Collection − Expenses</span>
            <span className="font-bold text-white font-mono">
              Pending: {formatCurrency(summaryCards?.outstandingDues || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. COLLECTION VS EXPENSE COMPARATIVE VISUAL CHART                         */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight">Collection vs Expense Chart</h3>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                Academic Year Month Order
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Monthly breakdown comparing Expected Collection, Actual Collection, and School Expenditure.
            </p>
          </div>

          {/* Chart Legends */}
          <div className="flex items-center gap-3 text-xs font-bold text-slate-600 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-indigo-500"></span>
              <span>Expected Collection</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-emerald-500"></span>
              <span>Actual Collection</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-rose-500"></span>
              <span>School Expense</span>
            </div>
          </div>
        </div>

        {/* Zero-Data Behavior Overlay / Main Chart Bars Container */}
        {!hasData ? (
          <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <AlertCircle className="w-9 h-9 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">No data available for the selected filters</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              There are no fee charges, collections, or active school expense records matching the selected parameters.
            </p>
          </div>
        ) : (
          <div className="pt-4 pb-2">
            {/* Bars Canvas Grid */}
            <div className="grid grid-cols-12 gap-1.5 sm:gap-3 items-end h-64 border-b border-slate-200 pb-2 px-1">
              {monthlyChartData.map((m) => {
                const expHeight = Math.max(4, Math.round(((m.expectedCollection || 0) / maxBarValue) * 100));
                const actHeight = Math.max(4, Math.round(((m.actualCollection || 0) / maxBarValue) * 100));
                const exHeight = Math.max(4, Math.round(((m.expense || 0) / maxBarValue) * 100));

                const isHighlight = m.isSelected;

                return (
                  <div
                    key={m.month}
                    className={`flex flex-col items-center justify-end h-full group relative transition-all rounded-lg p-1 ${
                      isHighlight
                        ? 'bg-indigo-50/80 ring-1 ring-indigo-300'
                        : 'opacity-60 hover:opacity-100 hover:bg-slate-50'
                    }`}
                  >
                    {/* Hover Tooltip Card */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 bg-slate-900 text-white text-[10px] p-2.5 rounded-xl shadow-xl whitespace-nowrap min-w-[140px] pointer-events-none">
                      <p className="font-bold border-b border-slate-700 pb-1 mb-1 text-slate-200">
                        {m.fullLabel || m.label}
                      </p>
                      <div className="space-y-0.5 font-mono">
                        <p className="text-indigo-300">Expected: {formatCurrency(m.expectedCollection)}</p>
                        <p className="text-emerald-300">Actual: {formatCurrency(m.actualCollection)}</p>
                        <p className="text-rose-300">Expense: {formatCurrency(m.expense)}</p>
                      </div>
                    </div>

                    {/* Bar Triplet */}
                    <div className="flex items-end gap-0.5 sm:gap-1 w-full justify-center h-full pt-6">
                      {/* Expected Bar */}
                      <div
                        style={{ height: `${expHeight}%` }}
                        className="w-2 sm:w-3.5 bg-indigo-500 rounded-t-sm transition-all duration-300 group-hover:bg-indigo-600"
                        title={`Expected: ${formatCurrency(m.expectedCollection)}`}
                      ></div>

                      {/* Actual Bar */}
                      <div
                        style={{ height: `${actHeight}%` }}
                        className="w-2 sm:w-3.5 bg-emerald-500 rounded-t-sm transition-all duration-300 group-hover:bg-emerald-600"
                        title={`Actual: ${formatCurrency(m.actualCollection)}`}
                      ></div>

                      {/* Expense Bar */}
                      <div
                        style={{ height: `${exHeight}%` }}
                        className="w-2 sm:w-3.5 bg-rose-500 rounded-t-sm transition-all duration-300 group-hover:bg-rose-600"
                        title={`Expense: ${formatCurrency(m.expense)}`}
                      ></div>
                    </div>

                    {/* X-Axis Month Label */}
                    <span
                      className={`text-[10px] font-extrabold uppercase mt-2 ${
                        isHighlight ? 'text-indigo-700 font-black scale-105' : 'text-slate-500'
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>Academic Year Sequence: April → March</span>
              <span>Hover over bars to inspect detailed values</span>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. EXPENSE DISTRIBUTION & CATEGORY BREAKDOWN                              */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Expense Distribution Chart</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              School operational expenditures grouped by category for the selected scope.
            </p>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
            Category Wise
          </span>
        </div>

        {expenseDistribution.length === 0 ? (
          <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50">
            <PieChart className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-600">No category expenses recorded</p>
            <p className="text-[11px] text-slate-400">No active expense transactions exist for this period.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {expenseDistribution.map((cat, idx) => {
              const colors = [
                'bg-rose-500 text-rose-700',
                'bg-indigo-500 text-indigo-700',
                'bg-emerald-500 text-emerald-700',
                'bg-amber-500 text-amber-700',
                'bg-purple-500 text-purple-700',
                'bg-blue-500 text-blue-700',
              ];
              const barColor = colors[idx % colors.length].split(' ')[0];

              return (
                <div key={cat.categoryName} className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${barColor}`}></span>
                      {cat.categoryName}
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-900">{formatCurrency(cat.amount)}</span>
                      <span className="text-[11px] text-slate-400 font-sans">({cat.percentage}%)</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.max(2, cat.percentage)}%` }}
                      className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
