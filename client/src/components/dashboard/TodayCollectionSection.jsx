import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Receipt,
  Users,
  CreditCard,
  RefreshCw,
  Search,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Printer,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { dashboardService } from '../../services/dashboard.service.js';
import { DatePicker } from '../ui/DatePicker.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Card, CardContent } from '../ui/Card.jsx';
import { formatCurrency, formatNumber, formatDate, formatDateTime, formatDateForInput } from '../../utils/formatters.js';

export const TodayCollectionSection = ({ selectedYearId }) => {
  const navigate = useNavigate();

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);

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
    payments = [],
  } = collectionData || {};

  const avgPerReceipt = transactionCount > 0 ? totalAmount / transactionCount : 0;

  // Filter payments by search query
  const filteredPayments = payments.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.receiptNumber?.toLowerCase().includes(q) ||
      p.studentName?.toLowerCase().includes(q) ||
      p.admissionNo?.toLowerCase().includes(q) ||
      p.classSection?.toLowerCase().includes(q) ||
      p.paymentMode?.toLowerCase().includes(q)
    );
  });

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
              Real-time fee collection breakdown & transaction audit for{' '}
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

            {/* Transactions Section Header & Search */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    Collection Transactions ({filteredPayments.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 ml-2"
                  >
                    {isExpanded ? (
                      <>
                        Collapse <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Expand <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>

                {transactionCount > 0 && isExpanded && (
                  <div className="flex items-center gap-2">
                    <div className="relative w-full sm:w-60">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search receipt, student, class..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/app/fees/collect')}
                      className="text-xs shrink-0"
                    >
                      + Collect Fee
                    </Button>
                  </div>
                )}
              </div>

              {/* Transactions Table */}
              {isExpanded && (
                <>
                  {filteredPayments.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-200/80 shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3">Receipt No</th>
                            <th className="py-2.5 px-3">Student Name</th>
                            <th className="py-2.5 px-3">Class / Sec</th>
                            <th className="py-2.5 px-3">Time</th>
                            <th className="py-2.5 px-3">Mode</th>
                            <th className="py-2.5 px-3">Received By</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-medium">
                          {filteredPayments.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                                #{p.receiptNumber}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-bold text-slate-900">{p.studentName}</div>
                                <div className="text-[10px] text-slate-400">Adm: {p.admissionNo}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{p.classSection}</td>
                              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                                {p.paymentDate ? formatDateTime(p.paymentDate).split(', ')[1] || '-' : '-'}
                              </td>
                              <td className="py-2.5 px-3">
                                <Badge variant={getModeBadgeVariant(p.paymentMode)} className="text-[10px] py-0.5">
                                  {p.paymentMode?.replace('_', ' ')}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {p.receivedByName}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                                {formatCurrency(p.receivedAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/app/fees/receipts`)}
                                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="View Receipt"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">
                          {searchQuery
                            ? 'No matching transactions found'
                            : `No fee collections recorded for ${formatDate(selectedDate)}`}
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          {searchQuery
                            ? 'Try searching with a different student name or receipt number.'
                            : 'Fees collected on this date will appear here in real-time.'}
                        </p>
                      </div>
                      {!searchQuery && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={ArrowRight}
                          onClick={() => navigate('/app/fees/collect')}
                          className="mt-2 text-xs"
                        >
                          Collect Fee Now
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayCollectionSection;
