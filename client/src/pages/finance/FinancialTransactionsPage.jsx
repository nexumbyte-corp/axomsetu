import React, { useState, useEffect } from 'react';
import { financeService } from '../../services/financeService.js';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { formatDate } from '../../utils/formatters.js';
import { Search, FileText } from 'lucide-react';

export const FinancialTransactionsPage = () => {
  const { user } = useAuth();
  const schoolHeader = user?.schoolAdmins?.[0]?.school || {};
  const { selectedYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Filters State
  const [search, setSearch] = useState('');
  const [type, setType] = useState('ALL');
  const [sourceType, setSourceType] = useState('ALL');
  const [paymentMode, setPaymentMode] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        ...(selectedYearId && { academicYearId: selectedYearId }),
        ...(search && { search }),
        ...(type !== 'ALL' && { type }),
        ...(sourceType !== 'ALL' && { sourceType }),
        ...(paymentMode !== 'ALL' && { paymentMode }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };

      const res = await financeService.getTransactions(params);
      const txnsData = res.data?.transactions || res.transactions || [];
      const pagData = res.data?.pagination || res.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

      setTransactions(txnsData);
      setPagination(pagData);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [selectedYearId, type, sourceType, paymentMode, startDate, endDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setType('ALL');
    setSourceType('ALL');
    setPaymentMode('ALL');
    setStartDate('');
    setEndDate('');
    fetchTransactions(1);
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const sourceTypes = [
    { label: 'All Sources', value: 'ALL' },
    { label: 'Fee Collection', value: 'FEE_COLLECTION' },
    { label: 'Fund Added', value: 'FUND_ADDED' },
    { label: 'Salary Payment', value: 'SALARY_PAYMENT' },
    { label: 'Expense', value: 'EXPENSE' },
    { label: 'Staff Advance', value: 'STAFF_ADVANCE' },
    { label: 'Advance Recovery', value: 'ADVANCE_RECOVERY' },
    { label: 'Fee Refund', value: 'FEE_REFUND' },
    { label: 'Opening Balance', value: 'OPENING_BALANCE' },
    { label: 'Other', value: 'OTHER' },
  ];

  const paymentModes = [
    { label: 'All Payment Modes', value: 'ALL' },
    { label: 'Cash', value: 'CASH' },
    { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
    { label: 'UPI', value: 'UPI' },
    { label: 'Cheque', value: 'CHEQUE' },
    { label: 'Demand Draft', value: 'DEMAND_DRAFT' },
    { label: 'Other', value: 'OTHER' },
  ];

  return (
    <div className="space-y-5">
      {/* Header & Filter Toolbar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Unified Financial Ledger</h2>
            <p className="text-xs text-slate-500">Immutable single source of truth for all school financial movements</p>
          </div>

          <div className="flex items-center gap-2">
            <DocumentActions
              templateId="financialLedger"
              data={{ schoolHeader, transactions }}
              filename="Financial_Ledger_Statement.pdf"
              title="Financial Ledger Statement"
            />
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ref #, description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">Search</Button>
            </form>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100">
          <Select
            label="Transaction Type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            options={[
              { label: 'All Types (Credit & Debit)', value: 'ALL' },
              { label: 'CREDIT (Inflow)', value: 'CREDIT' },
              { label: 'DEBIT (Outflow)', value: 'DEBIT' },
            ]}
          />

          <Select
            label="Source Type"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            options={sourceTypes}
          />

          <Select
            label="Payment Mode"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            options={paymentModes}
          />

          <DatePicker
            label="From Date"
            value={startDate}
            onChange={(val) => setStartDate(val)}
          />

          <DatePicker
            label="To Date"
            value={endDate}
            onChange={(val) => setEndDate(val)}
          />
        </div>

        <div className="flex justify-end gap-2 text-xs">
          <Button variant="ghost" size="sm" onClick={handleResetFilters}>Reset Filters</Button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            title="No Financial Transactions Found"
            description="No entries matched your search query or selected filters."
            icon={FileText}
          />
        ) : (
          <div className="table-responsive-wrapper">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Date</th>
                  <th className="p-3.5">Description & Reference</th>
                  <th className="p-3.5 whitespace-nowrap">Source</th>
                  <th className="p-3.5 whitespace-nowrap">Type</th>
                  <th className="p-3.5 whitespace-nowrap">Payment Mode</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 whitespace-nowrap text-slate-600 font-mono">
                      {formatDate(t.transactionDate)}
                    </td>

                    <td className="p-3.5 max-w-sm">
                      <div className="font-semibold text-slate-900 truncate">
                        {t.description || t.sourceType}
                      </div>
                      {t.referenceNumber && (
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Ref: {t.referenceNumber}
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {t.sourceType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={t.type === 'CREDIT' ? 'success' : 'danger'} size="sm">
                          {t.type}
                        </Badge>
                        {t.isReversal && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded">
                            REVERSAL
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {t.paymentMode}
                    </td>

                    <td className={`p-3.5 text-right whitespace-nowrap font-mono font-bold text-sm ${t.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'CREDIT' ? '+' : '-'}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => fetchTransactions(p)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
