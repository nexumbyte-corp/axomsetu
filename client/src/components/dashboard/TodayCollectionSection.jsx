import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Wallet,
  HandCoins,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboard.service.js';
import { DatePicker } from '../ui/DatePicker.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Card, CardContent } from '../ui/Card.jsx';
import { formatCurrency, formatNumber, formatDate, formatDateForInput } from '../../utils/formatters.js';

export const TodayCollectionSection = ({ selectedYearId }) => {
  const getTodayString = () => formatDateForInput(new Date());
  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return formatDateForInput(d);
  };

  const todayStr = getTodayString();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [collectionData, setCollectionData] = useState(null);
  const [expenseData, setExpenseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isToday = selectedDate === todayStr;
  const isYesterday = selectedDate === getYesterdayString();

  const fetchDailyData = useCallback(async (dateValue) => {
    setLoading(true);
    setError(null);
    try {
      const [colRes, expRes] = await Promise.allSettled([
        dashboardService.getDailyCollection({
          date: dateValue,
          academicYearId: selectedYearId || undefined,
        }),
        dashboardService.getDailyExpenses({
          date: dateValue,
          academicYearId: selectedYearId || undefined,
        }),
      ]);

      let colData = null;
      let expData = null;

      if (colRes.status === 'fulfilled' && colRes.value?.success && colRes.value?.data) {
        colData = colRes.value.data;
        // Fallback to attached expenses if separate endpoint is unavailable
        if (colData.expenses && (!expRes.value || !expRes.value.success)) {
          expData = colData.expenses;
        }
      }

      if (expRes.status === 'fulfilled' && expRes.value?.success && expRes.value?.data) {
        expData = expRes.value.data;
      }

      if (!colData && !expData) {
        throw new Error('Failed to fetch daily financial data');
      }

      setCollectionData(
        colData || { totalAmount: 0, transactionCount: 0, studentCount: 0, modeBreakdown: [] }
      );
      setExpenseData(
        expData || { totalAmount: 0, expenseCount: 0, categoryCount: 0, modeBreakdown: [] }
      );
    } catch (err) {
      console.error('Error fetching daily finance data:', err);
      setError(err.message || 'Unable to load daily financial metrics');
    } finally {
      setLoading(false);
    }
  }, [selectedYearId]);

  useEffect(() => {
    fetchDailyData(selectedDate);
  }, [selectedDate, fetchDailyData]);

  const handleDateChange = (newVal) => {
    if (!newVal) {
      setSelectedDate(todayStr);
    } else {
      setSelectedDate(newVal);
    }
  };

  const setPresetToday = () => {
    setSelectedDate(todayStr);
  };

  const setPresetYesterday = () => {
    setSelectedDate(getYesterdayString());
  };

  // Helper for mode amounts
  const getModeAmt = (modesArray, targetMode) => {
    if (!Array.isArray(modesArray)) return 0;
    const match = modesArray.find((m) => m.mode === targetMode);
    return Number(match?.amount || 0);
  };

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

  // ==========================================
  // FRONTEND "IN HAND" CALCULATIONS
  // ==========================================
  const netInHand = totalCollection - totalExpenses;

  // Cash In Hand (Physical Cash in drawer)
  const cashCollection = getModeAmt(collectionModes, 'CASH');
  const cashExpenses = getModeAmt(expenseModes, 'CASH');
  const cashInHand = cashCollection - cashExpenses;

  // All Digital & Other Non-Cash In Hand
  const digitalCollection = collectionModes
    .filter((m) => m.mode !== 'CASH')
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);
  const digitalExpenses = expenseModes
    .filter((m) => m.mode !== 'CASH')
    .reduce((sum, m) => sum + Number(m.amount || 0), 0);
  const digitalInHand = digitalCollection - digitalExpenses;

  // List of all active payment modes across collection and expenses
  const allActiveModes = useMemo(() => {
    const modesSet = new Set([
      ...collectionModes.map((m) => m.mode),
      ...expenseModes.map((m) => m.mode),
    ]);
    return Array.from(modesSet).filter(Boolean);
  }, [collectionData, expenseData]);

  const getModeBadgeVariant = (mode) => {
    switch (mode) {
      case 'CASH':
        return 'success';
      case 'UPI':
      case 'ONLINE':
        return 'info';
      case 'BANK_TRANSFER':
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

  const formatSignedCurrency = (val) => {
    if (val < 0) {
      return `-${formatCurrency(Math.abs(val))}`;
    }
    return formatCurrency(val);
  };

  return (
    <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden transition-all">
      {/* Top Header with Title, DatePicker & Presets */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {isToday ? "Today's Finances & Cashflow" : 'Daily Finances & Cashflow'}
              </h2>
              <Badge variant={isToday ? 'success' : isYesterday ? 'warning' : 'neutral'}>
                {isToday ? 'TODAY' : isYesterday ? 'YESTERDAY' : formatDate(selectedDate)}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Real-time daily collection, daily expenses, and calculated in-hand closing for{' '}
              <span className="font-semibold text-slate-700">{formatDate(selectedDate)}</span>
            </p>
          </div>
        </div>

        {/* Date Selector & Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={setPresetToday}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                isToday
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={setPresetYesterday}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                isYesterday
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Yesterday
            </button>
          </div>

          <div className="w-44">
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
              placeholder="Select date"
              clearable={false}
              className="py-1 text-xs"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={() => fetchDailyData(selectedDate)}
            className="text-slate-500 hover:text-slate-800"
            title="Refresh finance data"
          />
        </div>
      </div>

      <CardContent className="p-5 space-y-6">
        {/* Loading Overlay State */}
        {loading && !collectionData && !expenseData ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading daily financial details...</p>
          </div>
        ) : error && !collectionData && !expenseData ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-2">
            <p className="text-xs font-bold text-rose-700">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchDailyData(selectedDate)}>
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* ======================================================== */}
            {/* FRONTEND CALCULATED "IN HAND" SUMMARY CARDS              */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Total In Hand (Net Daily Cashflow) */}
              <div
                className={`p-4 rounded-2xl border shadow-2xs transition-all relative overflow-hidden ${
                  netInHand >= 0
                    ? 'bg-gradient-to-br from-indigo-500/10 via-indigo-50/40 to-violet-50/20 border-indigo-200/90'
                    : 'bg-gradient-to-br from-rose-500/10 via-rose-50/40 to-amber-50/20 border-rose-200/90'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider block">
                        Total In Hand
                      </span>
                      <Badge variant={netInHand >= 0 ? 'success' : 'danger'} className="text-[10px] py-0 px-1.5">
                        {netInHand >= 0 ? 'Surplus' : 'Deficit'}
                      </Badge>
                    </div>
                    <h3
                      className={`text-2xl font-black mt-1 font-mono tracking-tight ${
                        netInHand >= 0 ? 'text-indigo-950' : 'text-rose-700'
                      }`}
                    >
                      {formatSignedCurrency(netInHand)}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-600 mt-1 flex items-center gap-1">
                      <span>Collection {formatCurrency(totalCollection)}</span>
                      <span>−</span>
                      <span>Expenses {formatCurrency(totalExpenses)}</span>
                    </p>
                  </div>
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                      netInHand >= 0 ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'
                    }`}
                  >
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* 2. Cash In Hand (Physical Cash in Counter/Drawer) */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50/40 to-teal-50/20 border border-emerald-200/90 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Cash In Hand
                      </span>
                      <Badge variant="success" className="text-[10px] py-0 px-1.5">
                        Cash Drawer
                      </Badge>
                    </div>
                    <h3
                      className={`text-2xl font-black mt-1 font-mono tracking-tight ${
                        cashInHand >= 0 ? 'text-emerald-950' : 'text-rose-700'
                      }`}
                    >
                      {formatSignedCurrency(cashInHand)}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-600 mt-1 flex items-center gap-1">
                      <span>In: {formatCurrency(cashCollection)}</span>
                      <span>&bull;</span>
                      <span>Out: {formatCurrency(cashExpenses)}</span>
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <HandCoins className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* 3. Digital & Bank Net In Hand */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-500/10 via-sky-50/40 to-blue-50/20 border border-sky-200/90 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block">
                        Digital & Bank Net
                      </span>
                      <Badge variant="info" className="text-[10px] py-0 px-1.5">
                        UPI / Bank
                      </Badge>
                    </div>
                    <h3
                      className={`text-2xl font-black mt-1 font-mono tracking-tight ${
                        digitalInHand >= 0 ? 'text-sky-950' : 'text-rose-700'
                      }`}
                    >
                      {formatSignedCurrency(digitalInHand)}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-600 mt-1 flex items-center gap-1">
                      <span>In: {formatCurrency(digitalCollection)}</span>
                      <span>&bull;</span>
                      <span>Out: {formatCurrency(digitalExpenses)}</span>
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ArrowRightLeft className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* SIDE-BY-SIDE: DAILY COLLECTION & DAILY EXPENSES          */}
            {/* ======================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* -------------------------------------------------------- */}
              {/* LEFT COLUMN: DAILY FEE COLLECTION                        */}
              {/* -------------------------------------------------------- */}
              <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/20 p-5 space-y-4 shadow-2xs">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Daily Fee Collection
                        <Badge variant="success" className="text-[10px] py-0 px-1.5 font-bold">
                          INFLOW
                        </Badge>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Student fee receipts collected on {formatDate(selectedDate)}
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

                {/* Collection 4 Operational Sub-Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Total Collection */}
                  <div className="p-3 bg-white rounded-xl border border-emerald-200/70 shadow-2xs">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                      Total
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatCurrency(totalCollection)}
                    </span>
                    <span className="text-[10px] font-medium text-emerald-600 block mt-0.5">
                      {transactionCount} receipt{transactionCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Receipts Issued */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Receipts
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatNumber(transactionCount)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                      Issued today
                    </span>
                  </div>

                  {/* Students Paid */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Students
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatNumber(studentCount)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                      Accounts paid
                    </span>
                  </div>

                  {/* Avg Receipt */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Avg Receipt
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatCurrency(avgPerReceipt)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                      Per transaction
                    </span>
                  </div>
                </div>

                {/* Collection Payment Modes Breakdown */}
                <div className="bg-white/80 rounded-xl p-3 border border-emerald-200/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-emerald-800">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Collection By Payment Mode:
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-emerald-700">
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
                          <Badge variant={getModeBadgeVariant(mb.mode)} className="text-[10px] py-0 px-1.5">
                            {mb.mode.replace(/_/g, ' ')}
                          </Badge>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(mb.amount)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({mb.count})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-1">
                      No fee receipts recorded on this date.
                    </p>
                  )}
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* RIGHT COLUMN: DAILY EXPENSES                             */}
              {/* -------------------------------------------------------- */}
              <div className="rounded-2xl border border-rose-200/90 bg-rose-50/20 p-5 space-y-4 shadow-2xs">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-2xs">
                      <TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
                        Daily Expenses
                        <Badge variant="danger" className="text-[10px] py-0 px-1.5 font-bold">
                          OUTFLOW
                        </Badge>
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Operational expense vouchers recorded on {formatDate(selectedDate)}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/app/finance/expenses"
                    className="text-[11px] font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1 hover:underline"
                  >
                    Expenses Page <ArrowDownRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Expense 4 Operational Sub-Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Total Expenses */}
                  <div className="p-3 bg-white rounded-xl border border-rose-200/70 shadow-2xs">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                      Total
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatCurrency(totalExpenses)}
                    </span>
                    <span className="text-[10px] font-medium text-rose-600 block mt-0.5">
                      {expenseCount} voucher{expenseCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Vouchers Count */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Vouchers
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatNumber(expenseCount)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                      Recorded today
                    </span>
                  </div>

                  {/* Categories */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Categories
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatNumber(categoryCount)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                      Expense heads
                    </span>
                  </div>

                  {/* Avg Expense */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Avg Voucher
                    </span>
                    <span className="text-base sm:text-lg font-extrabold text-slate-900 font-mono block mt-0.5">
                      {formatCurrency(avgPerExpense)}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500 block mt-0.5">
                      Per voucher
                    </span>
                  </div>
                </div>

                {/* Expense Payment Modes Breakdown */}
                <div className="bg-white/80 rounded-xl p-3 border border-rose-200/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5 uppercase text-[11px] tracking-wider text-rose-800">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                      Expenses By Payment Mode:
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-rose-700">
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
                          <Badge variant={getModeBadgeVariant(mb.mode)} className="text-[10px] py-0 px-1.5">
                            {mb.mode.replace(/_/g, ' ')}
                          </Badge>
                          <span className="font-mono font-bold text-slate-900">{formatCurrency(mb.amount)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({mb.count})</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-1">
                      No expense vouchers recorded on this date.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ======================================================== */}
            {/* IN HAND RECONCILIATION SUMMARY BAR                       */}
            {/* ======================================================== */}
            {allActiveModes.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                    In Hand Mode Reconciliation:
                  </span>
                  <span className="text-[11px] text-slate-500 font-medium">
                    (Inflow − Outflow = In Hand)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {allActiveModes.map((mode) => {
                    const inAmt = getModeAmt(collectionModes, mode);
                    const outAmt = getModeAmt(expenseModes, mode);
                    const bal = inAmt - outAmt;

                    return (
                      <div
                        key={mode}
                        className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 flex items-center gap-2 shadow-2xs"
                      >
                        <Badge variant={getModeBadgeVariant(mode)} className="text-[10px] py-0 px-1.5 font-bold">
                          {mode.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-[11px] text-slate-500">
                          {formatCurrency(inAmt)} − {formatCurrency(outAmt)} =
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            bal >= 0 ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {formatSignedCurrency(bal)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const DailyFinanceSection = TodayCollectionSection;
export default TodayCollectionSection;
