import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  AlertCircle,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboard.service.js';
import { DatePicker } from '../ui/DatePicker.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Card, CardContent } from '../ui/Card.jsx';
import {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateForInput,
  parseDateSafe,
  getISTTodayString,
} from '../../utils/formatters.js';

export const TodayCollectionSection = ({ selectedYearId }) => {
  const todayStr = getISTTodayString();

  const getYesterdayString = () => {
    const current = parseDateSafe(todayStr) || new Date();
    current.setDate(current.getDate() - 1);
    return formatDateForInput(current);
  };
  const yesterdayStr = getYesterdayString();

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [collectionData, setCollectionData] = useState(null);
  const [expenseData, setExpenseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isToday = selectedDate === todayStr;
  const isYesterday = selectedDate === yesterdayStr;
  const canGoNext = selectedDate < todayStr;

  const handlePreviousDay = () => {
    const current = parseDateSafe(selectedDate) || new Date();
    current.setDate(current.getDate() - 1);
    setSelectedDate(formatDateForInput(current));
  };

  const handleNextDay = () => {
    const current = parseDateSafe(selectedDate) || new Date();
    current.setDate(current.getDate() + 1);
    const nextStr = formatDateForInput(current);
    if (nextStr <= todayStr) {
      setSelectedDate(nextStr);
    }
  };

  useEffect(() => {
    setSelectedDate(getISTTodayString());
  }, []);

  const handleToday = () => {
    setSelectedDate(getISTTodayString());
  };

  const handleDateChange = (newVal) => {
    if (!newVal) {
      setSelectedDate(getISTTodayString());
    } else {
      setSelectedDate(newVal);
    }
  };

  const fetchDailyData = useCallback(
    async (dateValue) => {
      setLoading(true);
      setError(null);
      try {
        const colRes = await dashboardService.getDailyCollection({
          date: dateValue,
          academicYearId: selectedYearId || undefined,
        });

        if (colRes?.success && colRes?.data) {
          const colData = colRes.data;
          setCollectionData(colData);
          setExpenseData(
            colData.expenses || { totalAmount: 0, expenseCount: 0, categoryCount: 0, modeBreakdown: [] }
          );
        } else {
          throw new Error(colRes?.message || 'Failed to fetch daily financial data');
        }
      } catch (err) {
        console.error('Error fetching daily finance data:', err);
        setError(err.message || 'Unable to load daily financial metrics');
      } finally {
        setLoading(false);
      }
    },
    [selectedYearId]
  );

  useEffect(() => {
    fetchDailyData(selectedDate);
  }, [selectedDate, fetchDailyData]);

  // Collection Calculations
  const totalCollection = Number(collectionData?.totalAmount || 0);
  const transactionCount = Number(collectionData?.transactionCount || 0);
  const studentCount = Number(collectionData?.studentCount || 0);
  const collectionModes = collectionData?.modeBreakdown || [];
  const avgPerReceipt = transactionCount > 0 ? totalCollection / transactionCount : 0;

  // Expense Calculations
  const totalExpenses = Number(expenseData?.totalAmount || 0);
  const expenseCount = Number(expenseData?.expenseCount || 0);
  const categoryCount = Number(expenseData?.categoryCount || 0);
  const expenseModes = expenseData?.modeBreakdown || [];
  const avgPerExpense = expenseCount > 0 ? totalExpenses / expenseCount : 0;

  // Net Cashflow
  const netBalance = totalCollection - totalExpenses;

  const getModeBadgeVariant = (mode) => {
    switch (mode) {
      case 'CASH':
        return 'success';
      case 'UPI':
      case 'ONLINE':
        return 'info';
      case 'BANK_TRANSFER':
      case 'BANK':
        return 'primary';
      case 'CHEQUE':
      case 'DEMAND_DRAFT':
      case 'DD':
        return 'warning';
      case 'POS':
      case 'CARD':
        return 'secondary';
      default:
        return 'neutral';
    }
  };

  const [activeTab, setActiveTab] = useState('all'); // 'all', 'inflow', 'outflow'

  return (
    <Card className="border-slate-200/80 shadow-2xs bg-white rounded-xl sm:rounded-2xl overflow-hidden transition-all">
      {/* Header with Title, Net Badge & Streamlined Date Navigator */}
      <div className="p-3.5 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Left: Section Title & Live Context */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                {isToday
                  ? "Today's Finances"
                  : isYesterday
                    ? "Yesterday's Finances"
                    : 'Daily Finance Summary'}
              </h2>
              <Badge variant={isToday ? 'success' : isYesterday ? 'warning' : 'neutral'} size="sm" className="text-[10px]">
                {isToday ? 'TODAY' : isYesterday ? 'YESTERDAY' : formatDate(selectedDate)}
              </Badge>
              {(totalCollection > 0 || totalExpenses > 0) && (
                <Badge
                  variant={netBalance >= 0 ? 'success' : 'danger'}
                  size="sm"
                  className="font-mono text-[10px]"
                >
                  Net: {netBalance >= 0 ? '+' : ''}
                  {formatCurrency(netBalance)}
                </Badge>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-medium truncate">
              Transactions recorded on <span className="text-slate-600 font-semibold">{formatDate(selectedDate)}</span>
            </p>
          </div>
        </div>

        {/* Right: Compact Date Navigation Toolbar */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 flex-wrap">
          {/* Day Stepper Group */}
          <div className="inline-flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/60">
            <button
              type="button"
              onClick={handlePreviousDay}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
              title="Previous Day"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Prev</span>
            </button>

            <button
              type="button"
              onClick={handleToday}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                isToday
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
              title="Jump to Today"
            >
              Today
            </button>

            <button
              type="button"
              disabled={!canGoNext}
              onClick={handleNextDay}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                canGoNext
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-white cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title="Next Day"
            >
              <span className="hidden sm:inline text-[11px]">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Date Picker Input */}
          <div className="w-32 sm:w-36">
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
              placeholder="Date"
              clearable={false}
              maxDate={todayStr}
              size="sm"
            />
          </div>

          {/* Reload Button */}
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={() => fetchDailyData(selectedDate)}
            className="text-slate-400 hover:text-slate-700 h-8 w-8 p-0 shrink-0"
            title="Refresh date metrics"
          />
        </div>
      </div>

      {/* Mobile Tab Switcher (<lg) */}
      <div className="lg:hidden px-3.5 pt-3 pb-0 flex border-b border-slate-100">
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg w-full text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`py-1 rounded-md transition-all text-center ${
              activeTab === 'all' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('inflow')}
            className={`py-1 rounded-md transition-all text-center flex items-center justify-center gap-1 ${
              activeTab === 'inflow' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <span>Inflows</span>
            <span className="font-mono text-[10px]">({formatCurrency(totalCollection)})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('outflow')}
            className={`py-1 rounded-md transition-all text-center flex items-center justify-center gap-1 ${
              activeTab === 'outflow' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'hover:text-slate-900'
            }`}
          >
            <span>Outflows</span>
            <span className="font-mono text-[10px]">({formatCurrency(totalExpenses)})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <CardContent className="p-3.5 sm:p-5">
        {loading && !collectionData && !expenseData ? (
          <div className="py-12 text-center space-y-2.5">
            <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading daily transactions...</p>
          </div>
        ) : error && !collectionData && !expenseData ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-rose-700 font-bold text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchDailyData(selectedDate)}>
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
            {/* ======================================================== */}
            {/* 1. FEE COLLECTION (INFLOW)                               */}
            {/* ======================================================== */}
            {(activeTab === 'all' || activeTab === 'inflow') && (
              <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:border-emerald-300 transition-colors">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                            Fee Collections
                          </h3>
                          <Badge variant="success" size="sm" className="text-[9px] py-0 px-1.5">
                            INFLOW
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Receipts on {formatDate(selectedDate)}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/app/fees"
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 group"
                    >
                      <span>Fees</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>

                  {/* Main Metric */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Collected
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-emerald-800 mt-0.5">
                      {formatCurrency(totalCollection)}
                    </div>
                  </div>

                  {/* Sub-Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <div className="p-2 sm:p-2.5 bg-slate-50/60 rounded-xl border border-slate-100 text-center sm:text-left">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Receipts
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5">
                        {formatNumber(transactionCount)}
                      </span>
                    </div>

                    <div className="p-2 sm:p-2.5 bg-slate-50/60 rounded-xl border border-slate-100 text-center sm:text-left">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Students
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5">
                        {formatNumber(studentCount)}
                      </span>
                    </div>

                    <div className="p-2 sm:p-2.5 bg-slate-50/60 rounded-xl border border-slate-100 text-center sm:text-left">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Avg Receipt
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5 truncate">
                        {formatCurrency(avgPerReceipt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Mode Breakdown */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
                    <span className="uppercase tracking-wider">Payment Breakdown:</span>
                    <span className="font-mono text-emerald-700">
                      {collectionModes.length} mode{collectionModes.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {collectionModes.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {collectionModes.map((mb) => (
                        <div
                          key={mb.mode}
                          className="px-2 py-0.5 bg-slate-50 border border-slate-200/80 rounded-md text-[11px] font-semibold text-slate-800 flex items-center gap-1.5"
                        >
                          <Badge variant={getModeBadgeVariant(mb.mode)} size="sm" className="text-[9px] py-0 px-1 font-bold">
                            {mb.mode.replace(/_/g, ' ')}
                          </Badge>
                          <span className="font-mono font-bold text-slate-900">
                            {formatCurrency(mb.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">({mb.count})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-1">
                      No collections recorded on this date.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* 2. EXPENSES (OUTFLOW)                                    */}
            {/* ======================================================== */}
            {(activeTab === 'all' || activeTab === 'outflow') && (
              <div className="rounded-xl sm:rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:border-rose-300 transition-colors">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <TrendingDown className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                            Expenses
                          </h3>
                          <Badge variant="danger" size="sm" className="text-[9px] py-0 px-1.5">
                            OUTFLOW
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Vouchers on {formatDate(selectedDate)}
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/app/finance/expenses"
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 group"
                    >
                      <span>Expenses</span>
                      <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  </div>

                  {/* Main Metric */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Expenses
                    </span>
                    <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-rose-700 mt-0.5">
                      {formatCurrency(totalExpenses)}
                    </div>
                  </div>

                  {/* Sub-Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                    <div className="p-2 sm:p-2.5 bg-slate-50/60 rounded-xl border border-slate-100 text-center sm:text-left">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Vouchers
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5">
                        {formatNumber(expenseCount)}
                      </span>
                    </div>

                    <div className="p-2 sm:p-2.5 bg-slate-50/60 rounded-xl border border-slate-100 text-center sm:text-left">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Categories
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5">
                        {formatNumber(categoryCount)}
                      </span>
                    </div>

                    <div className="p-2 sm:p-2.5 bg-slate-50/60 rounded-xl border border-slate-100 text-center sm:text-left">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Avg Voucher
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 font-mono block mt-0.5 truncate">
                        {formatCurrency(avgPerExpense)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Mode Breakdown */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-2">
                    <span className="uppercase tracking-wider">Payment Breakdown:</span>
                    <span className="font-mono text-rose-700">
                      {expenseModes.length} mode{expenseModes.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {expenseModes.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {expenseModes.map((mb) => (
                        <div
                          key={mb.mode}
                          className="px-2 py-0.5 bg-slate-50 border border-slate-200/80 rounded-md text-[11px] font-semibold text-slate-800 flex items-center gap-1.5"
                        >
                          <Badge variant={getModeBadgeVariant(mb.mode)} size="sm" className="text-[9px] py-0 px-1 font-bold">
                            {mb.mode.replace(/_/g, ' ')}
                          </Badge>
                          <span className="font-mono font-bold text-slate-900">
                            {formatCurrency(mb.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">({mb.count})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-1">
                      No expense vouchers recorded on this date.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const DailyFinanceSection = TodayCollectionSection;
export default TodayCollectionSection;

