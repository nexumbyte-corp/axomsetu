import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  Plus,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DashboardCards } from '../../components/fees/DashboardCards.jsx';
import { ReceiptTable } from '../../components/fees/ReceiptTable.jsx';
import { usePaymentsList, useDashboardSummary } from '../../hooks/usePaymentEngine.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { academicService } from '../../services/academic.service.js';
import { Select } from '../../components/ui/Select.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { formatDateForInput, formatCurrency, formatNumber } from '../../utils/formatters.js';

const FEE_RECEIPTS_FILTERS_STORAGE_KEY = 'fee_receipts_filters';
const EMPTY_PAYMENTS = Object.freeze([]);

const loadSavedFeeReceiptFilters = () => {
  try {
    const saved = localStorage.getItem(FEE_RECEIPTS_FILTERS_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed loading saved fee receipt filters:', err);
  }
  return null;
};

export const ReceiptsListPage = () => {
  const navigate = useNavigate();
  const { selectedYearId } = useAcademicYear();

  const savedFilters = useMemo(() => loadSavedFeeReceiptFilters(), []);

  // Academic Dropdown States
  const [classes, setClasses] = useState([]);
  const [mediums, setMediums] = useState([]);

  // Filter States
  const [searchTerm, setSearchTerm] = useState(() => savedFilters?.searchTerm || '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => savedFilters?.searchTerm || '');
  const [selectedClassId, setSelectedClassId] = useState(() => savedFilters?.selectedClassId || '');
  const [selectedMediumId, setSelectedMediumId] = useState(() => savedFilters?.selectedMediumId || '');
  const [paymentMode, setPaymentMode] = useState(() => savedFilters?.paymentMode || '');
  const [status, setStatus] = useState(() => savedFilters?.status || '');
  const [startDate, setStartDate] = useState(() => savedFilters?.startDate || '');
  const [endDate, setEndDate] = useState(() => savedFilters?.endDate || '');
  const [page, setPage] = useState(() => savedFilters?.page || 1);

  // Filter Bar Drawer / Collapsible State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Persist filter values to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        FEE_RECEIPTS_FILTERS_STORAGE_KEY,
        JSON.stringify({
          searchTerm,
          selectedClassId,
          selectedMediumId,
          paymentMode,
          status,
          startDate,
          endDate,
          page,
        })
      );
    } catch (err) {
      console.error('Failed saving fee receipt filters:', err);
    }
  }, [searchTerm, selectedClassId, selectedMediumId, paymentMode, status, startDate, endDate, page]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [clsRes, medRes] = await Promise.allSettled([
          academicService.getClasses(),
          academicService.getMediums(),
        ]);
        if (clsRes.status === 'fulfilled' && clsRes.value?.success) {
          setClasses(clsRes.value.data || []);
        }
        if (medRes.status === 'fulfilled' && medRes.value?.success) {
          setMediums(medRes.value.data || []);
        }
      } catch (err) {
        console.error('Failed to load classes or mediums for receipts filter', err);
      }
    };
    fetchOptions();
  }, []);

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
    limit: 15,
    ...(debouncedSearch.trim() && { search: debouncedSearch.trim() }),
    ...(selectedYearId && { academicYearId: selectedYearId }),
    ...(selectedClassId && { classId: selectedClassId }),
    ...(selectedMediumId && { mediumId: selectedMediumId }),
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
  const payments = paymentsRes?.data || paymentsRes?.payments || EMPTY_PAYMENTS;
  const pagination = paymentsRes?.pagination || { page: 1, totalPages: 1, total: 0, limit: 15 };

  // Calculate live inline stats for the current view
  const currentViewStats = useMemo(() => {
    let totalAmount = 0;
    payments.forEach((p) => {
      if (p.status !== 'VOID') {
        totalAmount += Number(p.receivedAmount || p.amount || 0);
      }
    });
    return { totalAmount };
  }, [payments]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedClassId) count++;
    if (selectedMediumId) count++;
    if (paymentMode) count++;
    if (status) count++;
    if (startDate) count++;
    if (endDate) count++;
    return count;
  }, [selectedClassId, selectedMediumId, paymentMode, status, startDate, endDate]);

  const hasActiveFilters = Boolean(
    searchTerm || selectedClassId || selectedMediumId || paymentMode || status || startDate || endDate
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedClassId('');
    setSelectedMediumId('');
    setPaymentMode('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    try {
      localStorage.removeItem(FEE_RECEIPTS_FILTERS_STORAGE_KEY);
    } catch {}
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

  const handleClearDatePreset = () => {
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const isTodayActive = startDate === todayStr && endDate === todayStr;
  const isYesterdayActive = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = formatDateForInput(d);
    return startDate === y && endDate === y;
  })();
  const isThisMonthActive = (() => {
    const now = new Date();
    const firstDay = formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));
    const today = formatDateForInput(now);
    return startDate === firstDay && endDate === today;
  })();
  const isAllDatesActive = !startDate && !endDate;

  const PAYMENT_MODE_OPTIONS = [
    { value: '', label: 'All Payment Modes' },
    { value: 'CASH', label: 'Cash' },
    { value: 'UPI', label: 'UPI / Online' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
    { value: 'DEMAND_DRAFT', label: 'Demand Draft' },
    { value: 'POS', label: 'POS Card' },
    { value: 'OTHER', label: 'Other' },
  ];

  const STATUS_OPTIONS = [
    { value: '', label: 'All Statuses' },
    { value: 'SUCCESS', label: 'Success' },
    { value: 'VOID', label: 'Void' },
  ];

  return (
    <div className="h-full flex flex-col space-y-2.5 w-full overflow-hidden">
      {/* Top Financial Metric Cards */}
      <div className="shrink-0">
        <DashboardCards summary={dashboardSummary} isLoading={isLoadingDashboard} />
      </div>

      {/* Main Filter & Action Card */}
      <Card className="shrink-0 p-3 sm:p-3.5 bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
        {/* Top Action Header: Title, Total Badge, Quick Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Fee Receipts
            </h2>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px] text-slate-600 bg-slate-100">
              {formatNumber(pagination.total)} records
            </Badge>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/app/fees/collect')}
              className="text-xs font-semibold py-1 px-3"
            >
              Collect Fee
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={isLoadingPayments}
              onClick={() => refetch()}
              title="Refresh receipts"
              className="p-1.5"
            />
          </div>
        </div>

        {/* Search, Presets & Filter Toggle Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
          {/* Left: Search Box */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search receipt #, student name, admission no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Right: Quick Date Presets & Filter Toggle */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Segmented Presets */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50/70 p-0.5 text-xs">
              <button
                type="button"
                onClick={handleClearDatePreset}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isAllDatesActive
                    ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={handleSetToday}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isTodayActive
                    ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleSetYesterday}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isYesterdayActive
                    ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Yesterday
              </button>
              <button
                type="button"
                onClick={handleSetThisMonth}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isThisMonthActive
                    ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>
            </div>

            {/* Filters Toggle Button */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                showAdvancedFilters || activeFilterCount > 0
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Clear Filters Button (shown only when filters active) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium px-1.5 py-1 hover:underline"
                title="Reset all filters"
              >
                Reset
              </button>
            )}

            {/* Live Page Total Metric */}
            <div className="hidden sm:inline-flex items-center gap-1.5 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/60 text-xs">
              <span className="text-slate-400 text-[10px] font-medium uppercase">Page Total:</span>
              <span className="font-mono font-bold text-slate-800">
                {formatCurrency(currentViewStats.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Collapsible Secondary Filter Bar */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2.5 border-t border-slate-100">
            {/* Class */}
            <Select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setPage(1);
              }}
              options={[
                { label: 'All Classes', value: '' },
                ...classes.map((cls) => ({ label: `Class ${cls.name}`, value: cls.id })),
              ]}
              className="text-xs py-1"
            />

            {/* Medium */}
            <Select
              value={selectedMediumId}
              onChange={(e) => {
                setSelectedMediumId(e.target.value);
                setPage(1);
              }}
              options={[
                { label: 'All Mediums', value: '' },
                ...mediums.map((med) => ({
                  label: med.name ? med.name.replace(/\s*medium$/i, '').trim() : '',
                  value: med.id,
                })),
              ]}
              className="text-xs py-1"
            />

            {/* Payment Mode */}
            <Select
              value={paymentMode}
              onChange={(e) => {
                setPaymentMode(e.target.value);
                setPage(1);
              }}
              options={PAYMENT_MODE_OPTIONS}
              className="text-xs py-1"
            />

            {/* Status */}
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
              className="text-xs py-1"
            />

            {/* From Date */}
            <DatePicker
              value={startDate}
              onChange={(val) => {
                setStartDate(val);
                setPage(1);
              }}
              placeholder="From Date"
              className="text-xs py-1"
            />

            {/* To Date */}
            <DatePicker
              value={endDate}
              onChange={(val) => {
                setEndDate(val);
                setPage(1);
              }}
              placeholder="To Date"
              className="text-xs py-1"
            />
          </div>
        )}
      </Card>

      {/* Receipts Table Container */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <ReceiptTable
          payments={payments}
          isLoading={isLoadingPayments}
        />
      </div>

      {/* Minimalist Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="shrink-0 bg-white rounded-xl border border-slate-200/80 px-3 py-2 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium text-[11px]">
            Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} receipts
          </span>
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
