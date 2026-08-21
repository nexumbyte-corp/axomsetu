import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  RotateCcw,
  Receipt,
  Plus,
} from 'lucide-react';
import { DashboardCards } from '../../components/fees/DashboardCards.jsx';
import { ReceiptTable } from '../../components/fees/ReceiptTable.jsx';
import { usePaymentsList, useDashboardSummary } from '../../hooks/usePaymentEngine.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { formatDateForInput, formatCurrency, formatNumber } from '../../utils/formatters.js';

export const ReceiptsListPage = () => {
  const navigate = useNavigate();
  const { selectedYearId } = useAcademicYear();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);

  // Debounce search input (350ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const queryParams = {
    page,
    limit: 15, // Higher compact page limit for high-density view
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
    ...(selectedYearId && { academicYearId: selectedYearId }),
    ...(paymentMode && { paymentMode }),
    ...(status && { status }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data: dashboardRes, isLoading: isLoadingDashboard } = useDashboardSummary({
    ...(selectedYearId && { academicYearId: selectedYearId }),
  });
  const { data: paymentsRes, isLoading: isLoadingPayments, refetch } = usePaymentsList(queryParams);

  const dashboardSummary = dashboardRes?.data || dashboardRes || {};
  const payments = paymentsRes?.data || paymentsRes?.payments || [];
  const pagination = paymentsRes?.pagination || { page: 1, totalPages: 1, total: 0, limit: 15 };

  // Calculate live inline stats for the current filtered view
  const currentViewStats = useMemo(() => {
    let totalAmount = 0;
    const modeCounts = {};

    payments.forEach((p) => {
      if (p.status !== 'VOID') {
        const amt = Number(p.receivedAmount || p.amount || 0);
        totalAmount += amt;
        const mode = p.paymentMode || 'OTHER';
        modeCounts[mode] = (modeCounts[mode] || 0) + amt;
      }
    });

    return { totalAmount, modeCounts };
  }, [payments]);

  const hasActiveFilters = Boolean(
    searchTerm || paymentMode || status || startDate || endDate
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setPaymentMode('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const todayStr = formatDateForInput(new Date());

  const handleSetToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
    setPage(1);
  };

  const handleSetYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yestStr = formatDateForInput(d);
    setStartDate(yestStr);
    setEndDate(yestStr);
    setPage(1);
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(formatDateForInput(firstDay));
    setEndDate(formatDateForInput(now));
    setPage(1);
  };

  const PAYMENT_MODE_OPTIONS = [
    { value: '', label: 'All Payment Modes' },
    { value: 'CASH', label: 'Cash' },
    { value: 'UPI', label: 'UPI / QR' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'DEMAND_DRAFT', label: 'Demand Draft' },
  ];

  const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'SUCCESS', label: 'SUCCESS' },
    { value: 'VOID', label: 'VOID' },
  ];

  return (
    <div className="space-y-4">
      {/* Top Financial Dashboard Overview Cards */}
      <DashboardCards summary={dashboardSummary} isLoading={isLoadingDashboard} />

      {/* Main Business Filter Toolbar Card */}
      <Card className="p-4 bg-white border border-slate-200 shadow-2xs space-y-3.5">
        {/* Header Row: Title, Inline Metrics & Primary Action */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900">Receipts & Search Register</h2>
                <Badge variant="indigo" size="sm" className="font-mono text-[10px]">
                  {formatNumber(pagination.total)} Records
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Comprehensive cashier ledger, receipt search, and audit control
              </p>
            </div>
          </div>

          {/* Quick Actions Header Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/app/fees/collect')}
              className="text-xs font-bold"
            >
              Collect Fee
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={isLoadingPayments}
              onClick={() => refetch()}
              title="Refresh dataset"
            />
          </div>
        </div>

        {/* Dense Multi-Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Search Input (spans 2 cols) */}
          <div className="lg:col-span-2">
            <Input
              placeholder="Search receipt #, student, adm code, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
              className="text-xs py-1.5"
            />
          </div>

          {/* Payment Mode */}
          <Select
            value={paymentMode}
            onChange={(e) => {
              setPaymentMode(e.target.value);
              setPage(1);
            }}
            options={PAYMENT_MODE_OPTIONS}
            className="text-xs py-1.5"
          />

          {/* Status */}
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            options={STATUS_OPTIONS}
            className="text-xs py-1.5"
          />

          {/* Date Range Pickers */}
          <DatePicker
            value={startDate}
            onChange={(val) => {
              setStartDate(val);
              setPage(1);
            }}
            placeholder="From Date"
            className="text-xs py-1.5"
          />

          <DatePicker
            value={endDate}
            onChange={(val) => {
              setEndDate(val);
              setPage(1);
            }}
            placeholder="To Date"
            className="text-xs py-1.5"
          />
        </div>

        {/* Quick Date Range Bar & Filter Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-100 bg-slate-50/60 -mx-4 -mb-4 p-3 rounded-b-xl">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Presets:</span>
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                startDate === todayStr && endDate === todayStr
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleSetYesterday}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={handleSetThisMonth}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              This Month
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2.5 py-1 text-xs font-bold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1 ml-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </button>
            )}
          </div>

          {/* Current Page Revenue Summary Indicator */}
          {payments.length > 0 && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">Page Revenue Total:</span>
              <span className="font-mono font-extrabold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-200 shadow-2xs">
                {formatCurrency(currentViewStats.totalAmount)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* High-Density Compact Receipt Table */}
      <ReceiptTable payments={payments} isLoading={isLoadingPayments} />

      {/* Compact Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs text-xs">
          <div className="text-slate-500 font-medium font-mono text-[11px]">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} receipts
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};

export default ReceiptsListPage;
