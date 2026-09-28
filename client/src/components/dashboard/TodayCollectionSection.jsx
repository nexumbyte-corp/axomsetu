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

  return (
    <Card className="border-slate-200/90 shadow-2xs bg-white rounded-2xl overflow-hidden transition-all">
      {/* Header with Title, Date Badges, Previous Day Button & Custom Datepicker */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Section Title & Selected Date Context */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {isToday
                  ? "Today's Collection & Expenses"
                  : isYesterday
                    ? "Yesterday's Collection & Expenses"
                    : 'Daily Collection & Expenses'}
              </h2>
              <Badge variant={isToday ? 'success' : isYesterday ? 'warning' : 'neutral'}>
                {isToday ? 'TODAY' : isYesterday ? 'YESTERDAY' : formatDate(selectedDate)}
              </Badge>
              {totalCollection > 0 || totalExpenses > 0 ? (
                <Badge
                  variant={netBalance >= 0 ? 'success' : 'danger'}
                  className="font-mono text-[11px]"
                >
                  Net: {netBalance >= 0 ? '+' : ''}
                  {formatCurrency(netBalance)}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Based on recorded dates &bull;{' '}
              <span className="font-semibold text-slate-700">{formatDate(selectedDate)}</span>
            </p>
          </div>
        </div>

        {/* Right: Date Navigation & Custom Selection */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Quick Buttons: Previous Day & Today */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              icon={ChevronLeft}
              onClick={handlePreviousDay}
              className="text-xs h-8 px-2.5 font-semibold text-slate-700 hover:text-slate-900 border-slate-200"
              title="Go to previous day"
            >
              Previous Day
            </Button>

            <Button
              variant={isToday ? 'primary' : 'outline'}
              size="sm"
              onClick={handleToday}
              className={`text-xs h-8 px-3 font-bold transition-all ${
                isToday
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 border-slate-200'
              }`}
              title="Jump to today"
            >
              Today
            </Button>

            {canGoNext && (
              <Button
                variant="outline"
                size="sm"
                icon={ChevronRight}
                iconPosition="right"
                onClick={handleNextDay}
                className="text-xs h-8 px-2.5 font-semibold text-slate-700 hover:text-slate-900 border-slate-200"
                title="Go to next day"
              >
                Next Day
              </Button>
            )}
          </div>

          {/* Custom Date Selection */}
          <div className="w-36 sm:w-40">
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
              placeholder="Select date"
              clearable={false}
              maxDate={todayStr}
              size="sm"
            />
          </div>

          {/* Refresh Action */}
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={() => fetchDailyData(selectedDate)}
            className="text-slate-500 hover:text-slate-800 h-8 w-8 p-0"
            title="Refresh recorded data"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <CardContent className="p-4 sm:p-5">
        {loading && !collectionData && !expenseData ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading recorded transactions...</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* ======================================================== */}
            {/* 1. FEE COLLECTION (INFLOW)                               */}
            {/* ======================================================== */}
            <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/40 via-white to-white p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-emerald-100/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Fee Collection
                        <Badge variant="success" className="text-[10px] py-0 px-1.5 font-bold">
                          INFLOW
                        </Badge>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Receipts recorded on {formatDate(selectedDate)}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/app/fees"
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline"
                  >
                    Fees Page <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Main Total Metric */}
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Total Collected
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-emerald-950 mt-1">
                    {formatCurrency(totalCollection)}
                  </div>
                </div>

                {/* Sub-Metrics Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-emerald-100/60">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Receipts
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatNumber(transactionCount)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">issued</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Students
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatNumber(studentCount)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">paid</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Avg Receipt
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatCurrency(avgPerReceipt)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">per receipt</span>
                  </div>
                </div>
              </div>

              {/* Payment Mode Breakdown */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2">
                  <span className="uppercase tracking-wider">Payment Mode Breakdown:</span>
                  <span className="font-mono text-emerald-700">
                    {collectionModes.length} mode{collectionModes.length === 1 ? '' : 's'}
                  </span>
                </div>

                {collectionModes.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {collectionModes.map((mb) => (
                      <div
                        key={mb.mode}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-1.5 shadow-2xs"
                      >
                        <Badge variant={getModeBadgeVariant(mb.mode)} className="text-[10px] py-0 px-1.5 font-bold">
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
                    No fee receipts recorded on this date.
                  </p>
                )}
              </div>
            </div>

            {/* ======================================================== */}
            {/* 2. EXPENSES (OUTFLOW)                                    */}
            {/* ======================================================== */}
            <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-b from-rose-50/40 via-white to-white p-5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-rose-100/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-2xs">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Expenses
                        <Badge variant="danger" className="text-[10px] py-0 px-1.5 font-bold">
                          OUTFLOW
                        </Badge>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Vouchers recorded on {formatDate(selectedDate)}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/app/finance/expenses"
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 hover:underline"
                  >
                    Expenses Page <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Main Total Metric */}
                <div>
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                    Total Expenses
                  </span>
                  <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-rose-950 mt-1">
                    {formatCurrency(totalExpenses)}
                  </div>
                </div>

                {/* Sub-Metrics Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-100/60">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Vouchers
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatNumber(expenseCount)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">recorded</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Categories
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatNumber(categoryCount)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">heads</span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Avg Voucher
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatCurrency(avgPerExpense)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">per voucher</span>
                  </div>
                </div>
              </div>

              {/* Payment Mode Breakdown */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-2">
                  <span className="uppercase tracking-wider">Payment Mode Breakdown:</span>
                  <span className="font-mono text-rose-700">
                    {expenseModes.length} mode{expenseModes.length === 1 ? '' : 's'}
                  </span>
                </div>

                {expenseModes.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {expenseModes.map((mb) => (
                      <div
                        key={mb.mode}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-1.5 shadow-2xs"
                      >
                        <Badge variant={getModeBadgeVariant(mb.mode)} className="text-[10px] py-0 px-1.5 font-bold">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const DailyFinanceSection = TodayCollectionSection;
export default TodayCollectionSection;
