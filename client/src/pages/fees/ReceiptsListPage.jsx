import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  RefreshCw,
  RotateCcw,
  Receipt,
  Plus,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DashboardCards } from '../../components/fees/DashboardCards.jsx';
import { ReceiptTable } from '../../components/fees/ReceiptTable.jsx';
import { usePaymentsList, useDashboardSummary } from '../../hooks/usePaymentEngine.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { academicService } from '../../services/academic.service.js';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { formatDateForInput, formatCurrency, formatNumber } from '../../utils/formatters.js';

const FEE_RECEIPTS_FILTERS_STORAGE_KEY = 'fee_receipts_filters';

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
    limit: 15, // Higher compact page limit for high-density view
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

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

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
    { value: 'SUCCESS', label: 'SUCCESS' },
    { value: 'VOID', label: 'VOID' },
  ];

  return (
    <div className="min-h-full flex flex-col space-y-2 sm:space-y-2.5 w-full pb-6 md:pb-0 md:h-full md:overflow-hidden">
      {/* Top Financial Dashboard Overview Cards */}
      <div className="shrink-0">
        <DashboardCards summary={dashboardSummary} isLoading={isLoadingDashboard} />
      </div>

      {/* Main Business Filter Toolbar Card */}
      <Card className="shrink-0 p-3 sm:p-3.5 bg-white border border-slate-200 shadow-2xs space-y-2.5">
        {/* Header Row: Title, Inline Metrics & Primary Action */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                  Receipts & Search Register
                </h2>
                <Badge variant="indigo" size="sm" className="font-mono text-[9px] shrink-0">
                  {formatNumber(pagination.total)}
                </Badge>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate hidden sm:block">
                Comprehensive cashier ledger, receipt search, and audit control
              </p>
            </div>
          </div>

          {/* Quick Actions Header Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/app/fees/collect')}
              className="text-xs font-bold py-1 px-2.5 sm:px-3"
            >
              <span>Collect Fee</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={isLoadingPayments}
              onClick={() => refetch()}
              title="Refresh dataset"
              className="p-1.5"
            />
          </div>
        </div>

        {/* Mobile Search & Filter Toggle Bar (< md) */}
        <div className="md:hidden flex items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search receipt #, student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
              className="text-xs py-1"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 h-[34px] rounded-lg border text-xs font-bold transition-all shrink-0 ${
              isMobileFiltersOpen || activeFilterCount > 0
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-mono font-bold">
                {activeFilterCount}
              </span>
            )}
            {isMobileFiltersOpen ? (
              <ChevronUp className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            )}
          </button>
        </div>

        {/* Mobile Collapsible Filters Grid */}
        {isMobileFiltersOpen && (
          <div className="md:hidden grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {/* Class Filter */}
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

            {/* Medium Filter */}
            <Select
              value={selectedMediumId}
              onChange={(e) => {
                setSelectedMediumId(e.target.value);
                setPage(1);
              }}
              options={[
                { label: 'All Medium', value: '' },
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

            {/* Date Range Pickers */}
            <DatePicker
              value={startDate}
              onChange={(val) => {
                setStartDate(val);
                setPage(1);
              }}
              placeholder="From Date"
              className="text-xs py-1"
            />

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

        {/* Desktop Multi-Filter Grid (>= md) */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-7 gap-2">
          {/* Search Input */}
          <div className="lg:col-span-1">
            <Input
              placeholder="Search receipt #, student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
              className="text-xs py-1"
            />
          </div>

          {/* Class Filter */}
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

          {/* Medium Filter */}
          <Select
            value={selectedMediumId}
            onChange={(e) => {
              setSelectedMediumId(e.target.value);
              setPage(1);
            }}
            options={[
              { label: 'All Medium', value: '' },
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

          {/* Date Range Pickers */}
          <DatePicker
            value={startDate}
            onChange={(val) => {
              setStartDate(val);
              setPage(1);
            }}
            placeholder="From Date"
            className="text-xs py-1"
          />

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

        {/* Quick Date Range Bar & Filter Summary Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 bg-slate-50/60 -mx-3 -mb-3 sm:-mx-3.5 sm:-mb-3.5 p-2 sm:p-2.5 rounded-b-xl">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-0.5">Presets:</span>
            <button
              type="button"
              onClick={handleSetToday}
              className={`px-2 py-0.5 text-[11px] font-bold rounded-md transition-colors ${
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
              className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={handleSetThisMonth}
              className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              This Month
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-2 py-0.5 text-[11px] font-bold rounded-md text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Current Page Revenue Summary Indicator */}
          {payments.length > 0 && (
            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-semibold text-slate-700 shrink-0">
              <span className="text-[10px] text-slate-500 font-medium">Page Total:</span>
              <span className="font-mono font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs text-xs">
                {formatCurrency(currentViewStats.totalAmount)}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* High-Density Compact Receipt Table & Mobile Cards */}
      <div className="flex-1 flex flex-col min-h-0 md:overflow-hidden">
        <ReceiptTable payments={payments} isLoading={isLoadingPayments} />
      </div>

      {/* Compact Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="shrink-0">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            itemsPerPage={pagination.limit}
            onPageChange={(p) => setPage(p)}
            className="rounded-xl border border-slate-200 shadow-2xs"
          />
        </div>
      )}
    </div>
  );
};

export default ReceiptsListPage;
