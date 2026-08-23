import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Receipt,
  Users,
  CreditCard,
  RefreshCw,
  TrendingUp,
  Sparkles,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isToday = selectedDate === todayStr;
  const isYesterday = selectedDate === getYesterdayString();

  const fetchDailyCollection = useCallback(async (dateValue) => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getDailyCollection({
        date: dateValue,
        academicYearId: selectedYearId || undefined,
      });

      if (res.success && res.data) {
        setCollectionData(res.data);
      } else {
        throw new Error(res.message || 'Failed to fetch collection data');
      }
    } catch (err) {
      console.error('Error fetching daily collection:', err);
      setError(err.message || 'Unable to load collection data');
    } finally {
      setLoading(false);
    }
  }, [selectedYearId]);

  useEffect(() => {
    fetchDailyCollection(selectedDate);
  }, [selectedDate, fetchDailyCollection]);

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

  const {
    totalAmount = 0,
    transactionCount = 0,
    studentCount = 0,
    modeBreakdown = [],
  } = collectionData || {};

  const avgPerReceipt = transactionCount > 0 ? totalAmount / transactionCount : 0;

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
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <Card className="border-slate-200/80 shadow-xs bg-white rounded-2xl overflow-hidden transition-all">
      {/* Card Header with Title, DatePicker & Presets */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                {isToday ? "Today's Collection" : 'Daily Fee Collection'}
              </h2>
              <Badge variant={isToday ? 'success' : isYesterday ? 'warning' : 'neutral'}>
                {isToday ? 'TODAY' : isYesterday ? 'YESTERDAY' : formatDate(selectedDate)}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Real-time fee collection breakdown & summary for{' '}
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
            onClick={() => fetchDailyCollection(selectedDate)}
            className="text-slate-500 hover:text-slate-800"
            title="Refresh collection data"
          />
        </div>
      </div>

      <CardContent className="p-5 space-y-5">
        {/* Loading Overlay State */}
        {loading && !collectionData ? (
          <div className="py-12 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading collection details...</p>
          </div>
        ) : error && !collectionData ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-2">
            <p className="text-xs font-bold text-rose-700">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchDailyCollection(selectedDate)}>
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* Top 4 Operational Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Total Amount */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-50/50 to-teal-50/30 border border-emerald-200/80 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Total Collection
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                    {formatCurrency(totalAmount)}
                  </h3>
                  <span className="text-[11px] font-medium text-emerald-600 mt-0.5 block">
                    {transactionCount > 0 ? `${transactionCount} transaction${transactionCount > 1 ? 's' : ''}` : 'No transactions'}
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              {/* 2. Receipts Issued */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Receipts
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                    {formatNumber(transactionCount)}
                  </h3>
                  <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
                    Receipts generated
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
              </div>

              {/* 3. Students Paid */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Students Paid
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                    {formatNumber(studentCount)}
                  </h3>
                  <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
                    Unique student accounts
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              {/* 4. Average Receipt Value */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Avg Receipt Size
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1 font-mono">
                    {formatCurrency(avgPerReceipt)}
                  </h3>
                  <span className="text-[11px] font-medium text-slate-500 mt-0.5 block">
                    Average per transaction
                  </span>
                </div>
                <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Payment Mode Breakdown */}
            {modeBreakdown.length > 0 && (
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Mode Breakdown:
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {modeBreakdown.map((mb) => (
                    <div
                      key={mb.mode}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 flex items-center gap-2 shadow-2xs"
                    >
                      <Badge variant={getModeBadgeVariant(mb.mode)} className="text-[10px] py-0 px-1.5">
                        {mb.mode.replace('_', ' ')}
                      </Badge>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(mb.amount)}</span>
                      <span className="text-[11px] text-slate-400 font-normal">({mb.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayCollectionSection;

