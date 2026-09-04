import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeService } from '../../services/financeService.js';

import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { OpeningBalanceModal } from './OpeningBalanceModal.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';
import { formatDate } from '../../utils/formatters.js';
import { TrendingUp, TrendingDown, Scale, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, Landmark, Calendar } from 'lucide-react';

export const FinanceOverviewPage = () => {
  const navigate = useNavigate();
  const { selectedYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [recentTxns, setRecentTxns] = useState([]);
  const [isOpeningBalanceModalOpen, setIsOpeningBalanceModalOpen] = useState(false);
  const [backfilling, setBackfilling] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const params = selectedYearId ? { academicYearId: selectedYearId } : {};
      const [overviewRes, txnsRes] = await Promise.all([
        financeService.getOverview(params),
        financeService.getTransactions({ ...params, limit: 5 }),
      ]);
      const overviewData = overviewRes.data !== undefined ? overviewRes.data : overviewRes;
      const txnsData = txnsRes.data?.transactions || txnsRes.transactions || [];
      setData(overviewData);
      setRecentTxns(txnsData);
    } catch (err) {
      console.error('Failed to fetch finance overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedYearId]);

  const handleBackfill = async () => {
    setBackfilling(true);
    try {
      await financeService.backfillLedger();
      await fetchOverview();
    } catch (err) {
      console.error('Backfill failed:', err);
    } finally {
      setBackfilling(false);
    }
  };

  const { user } = useAuth();
  const schoolHeader = user?.schoolAdmins?.[0]?.school || {};

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const { totalCredit = 0, totalDebit = 0, currentBalance = 0, currentMonth = {} } = data || {};

  return (
    <div className="space-y-6">
      {/* Top Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Calendar className="w-4 h-4 text-indigo-600" />
          <span>Real-time Financial Balance Engine</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <DocumentActions
            templateId="financialLedger"
            data={{ schoolHeader, transactions: recentTxns, overview: data || {} }}
            filename="Financial_Statement.pdf"
            title="Financial Statement"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackfill}
            loading={backfilling}
            icon={RefreshCw}
          >
            {backfilling ? 'Syncing...' : 'Sync History'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpeningBalanceModalOpen(true)}
            icon={Landmark}
          >
            Set Opening Balance
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/app/finance/funds')}
            icon={Plus}
          >
            Add Fund
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/finance/expenses')}
            icon={Plus}
          >
            Add Expense
          </Button>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Net Balance Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Current Net Balance</span>
            <div className="p-2 rounded-xl bg-white/10 text-indigo-300">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono tracking-tight">
            {formatCurrency(currentBalance)}
          </div>
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span>Single Ledger Truth</span>
            <span className="font-semibold text-indigo-300">Updated Real-Time</span>
          </div>
        </div>

        {/* Total Credit Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Credit Inflow</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600">
            {formatCurrency(totalCredit)}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Fee Collections + Funds + Recoveries</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        {/* Total Debit Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Debit Outflow</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600">
            {formatCurrency(totalDebit)}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Salaries + Expenses + Advances + Refunds</span>
            <ArrowDownRight className="w-4 h-4 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Current Month Financial Movement</h3>
            <p className="text-xs text-slate-500">Itemized breakdown for the active month</p>
          </div>
          <Badge variant="indigo" size="md">
            This Month Net: {formatCurrency(currentMonth.netFlow)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase text-slate-400">Fee Collection</p>
            <p className="text-lg font-bold font-mono text-emerald-600 mt-1">{formatCurrency(currentMonth.feeCollection)}</p>
            <span className="text-[10px] text-slate-400">School Fee Revenue</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase text-slate-400">Funds Added</p>
            <p className="text-lg font-bold font-mono text-emerald-600 mt-1">{formatCurrency(currentMonth.fundAdded)}</p>
            <span className="text-[10px] text-slate-400">Owner / Management Funds</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase text-slate-400">Salaries Paid</p>
            <p className="text-lg font-bold font-mono text-rose-600 mt-1">{formatCurrency(currentMonth.salaryPayment)}</p>
            <span className="text-[10px] text-slate-400">Staff Payroll Disbursal</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase text-slate-400">School Expenses</p>
            <p className="text-lg font-bold font-mono text-rose-600 mt-1">{formatCurrency(currentMonth.expense)}</p>
            <span className="text-[10px] text-slate-400">Operational Expenditures</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase text-slate-400">Staff Advances</p>
            <p className="text-lg font-bold font-mono text-rose-600 mt-1">{formatCurrency(currentMonth.staffAdvance)}</p>
            <span className="text-[10px] text-slate-400">Advance Loans Issued</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase text-slate-400">Advance Recoveries</p>
            <p className="text-lg font-bold font-mono text-emerald-600 mt-1">{formatCurrency(currentMonth.advanceRecovery)}</p>
            <span className="text-[10px] text-slate-400">Recovered via Payroll</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase text-slate-400">Fee Refunds</p>
            <p className="text-lg font-bold font-mono text-rose-600 mt-1">{formatCurrency(currentMonth.feeRefund)}</p>
            <span className="text-[10px] text-slate-400">Voided / Refunded Fees</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-[11px] font-bold uppercase text-slate-400">Opening Balance</p>
            <p className="text-lg font-bold font-mono text-indigo-600 mt-1">{formatCurrency(currentMonth.openingBalance)}</p>
            <span className="text-[10px] text-slate-400">Capital Account Setup</span>
          </div>
        </div>
      </div>

      {/* Recent Ledger Activity Table */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">Recent Financial Ledger Activity</h3>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/finance/transactions')}>
            View All Ledger Entries →
          </Button>
        </div>

        <div className="table-responsive-wrapper">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3 whitespace-nowrap">Date</th>
                <th className="p-3">Description</th>
                <th className="p-3 whitespace-nowrap">Source</th>
                <th className="p-3 whitespace-nowrap">Type</th>
                <th className="p-3 whitespace-nowrap">Payment Mode</th>
                <th className="p-3 text-right whitespace-nowrap">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {recentTxns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    No recent transactions found
                  </td>
                </tr>
              ) : (
                recentTxns.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 whitespace-nowrap text-slate-600 font-mono">
                      {formatDate(t.transactionDate)}
                    </td>
                    <td className="p-3 text-slate-900 font-semibold max-w-xs truncate">
                      {t.description || t.sourceType}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {t.sourceType}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge variant={t.type === 'CREDIT' ? 'success' : 'danger'} size="sm">
                        {t.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{t.paymentMode}</td>
                    <td className={`p-3 text-right font-mono font-bold ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Opening Balance Modal */}
      <OpeningBalanceModal
        isOpen={isOpeningBalanceModalOpen}
        onClose={() => setIsOpeningBalanceModalOpen(false)}
        onSuccess={fetchOverview}
        academicYearId={selectedYearId}
      />
    </div>
  );
};
