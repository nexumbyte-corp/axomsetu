import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  DollarSign,
  Wallet,
  AlertCircle,
  RefreshCw,
  Crown,
  Sparkles,
  Calendar,
  ArrowRight,
  TrendingUp,
  School as SchoolIcon,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useAcademicYear } from '../hooks/useAcademicYear.js';
import { dashboardService } from '../services/dashboard.service.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent } from '../components/ui/Card.jsx';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton.jsx';
import { DashboardMetricCard } from '../components/dashboard/DashboardMetricCard.jsx';
import { TodayCollectionSection } from '../components/dashboard/TodayCollectionSection.jsx';
import { MonthlyCollectionChart } from '../components/dashboard/MonthlyCollectionChart.jsx';
import { NeedsAttentionSection } from '../components/dashboard/NeedsAttentionSection.jsx';
import {
  RecentFeeCollections,
  RecentExpenses,
  RecentSalaryPayments,
} from '../components/dashboard/RecentActivityTables.jsx';
import { QuickActionsSection } from '../components/dashboard/QuickActionsSection.jsx';
import { formatCurrency, formatNumber, formatDate } from '../utils/formatters.js';

export const DashboardPage = () => {
  useDocumentTitle('Dashboard');
  const { user } = useAuth();
  const { selectedYear, selectedYearId } = useAcademicYear();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getSummary({
        academicYearId: selectedYearId || undefined,
      });

      if (res?.success && res?.data) {
        setDashboardData(res.data);
      } else {
        throw new Error(res?.message || 'Failed to fetch dashboard summary');
      }
    } catch (err) {
      console.error('Error loading dashboard summary:', err);
      setError(err.message || 'Unable to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [selectedYearId]);

  useEffect(() => {
    fetchDashboardSummary();
  }, [fetchDashboardSummary]);

  if (loading && !dashboardData) {
    return <DashboardSkeleton />;
  }

  const userName = user?.name || 'Administrator';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTodayFormatted = () => {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date());
  };

  if (error && !dashboardData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <ModulePageHeader
          icon={LayoutDashboard}
          title={`Welcome, ${userName}`}
          description="Overview of your school's students, fees, payroll, and finances."
        />
        <Card className="border-rose-200/80 bg-rose-50/40 rounded-3xl">
          <CardContent className="p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Unable to load Dashboard</h3>
              <p className="text-xs text-slate-600 mt-1 max-w-sm mx-auto">{error}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchDashboardSummary}
              className="text-xs font-semibold"
            >
              Retry Loading
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { school, subscription, metrics, needsAttention, recentActivity, monthlyCollections } =
    dashboardData || {};

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Standard Module Page Header (Registers to top navigation bar & mobile inline header) */}
      <ModulePageHeader
        icon={LayoutDashboard}
        title={`Welcome, ${userName}`}
        description={`Overview of ${school?.name || 'school workspace'} operations today.`}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={fetchDashboardSummary}
            className="text-xs h-8 text-slate-600 hover:text-slate-900 border-slate-200"
          >
            Refresh
          </Button>
        }
      />

      {/* Fresh, Luminous Executive Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/60 p-5 sm:p-6 border border-indigo-100/90 shadow-xs">
        {/* Soft Colorful Aurora Glow Orbs */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-gradient-to-br from-indigo-300/20 to-violet-300/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-52 -bottom-10 w-52 h-52 bg-gradient-to-br from-pink-300/15 to-rose-300/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/4 -top-8 w-44 h-44 bg-gradient-to-br from-teal-300/15 to-emerald-300/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          {/* Top Row: Meta Pills & Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2 min-w-0">
              {/* Context Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/90 text-slate-800 border border-indigo-200/80 shadow-2xs backdrop-blur-md">
                  <SchoolIcon className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{school?.name || 'Workspace'}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
                </span>

                {school?.code && (
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-100/70 text-indigo-800 border border-indigo-200/60">
                    {school.code}
                  </span>
                )}

                <span className="inline-flex items-center gap-1 text-xs font-bold text-violet-800 bg-violet-100/70 px-2.5 py-1 rounded-full border border-violet-200/60">
                  <Calendar className="w-3 h-3 text-violet-600" />
                  AY {selectedYear?.name || 'Current'}
                </span>

                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white/80 px-2.5 py-1 rounded-full border border-slate-200/70 shadow-2xs">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {getTodayFormatted()}
                </span>
              </div>

              {/* Main Heading */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <span>
                    {getGreeting()},{' '}
                    <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
                      {userName}
                    </span>
                  </span>
                  <span className="text-2xl sm:text-3xl">👋</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 font-medium">
                  Live operational pulse, student enrollments, and day-to-day finances.
                </p>
              </div>
            </div>

            {/* Quick Primary Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Link
                to="/app/fees/collect"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-500/25 transition-all hover:scale-105 active:scale-95 min-h-[38px]"
              >
                <CreditCard className="w-4 h-4" />
                <span>Collect Fee</span>
              </Link>

              <Link
                to="/app/students/new"
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95 min-h-[38px]"
              >
                <Users className="w-4 h-4" />
                <span>New Admission</span>
              </Link>

              <button
                type="button"
                onClick={fetchDashboardSummary}
                disabled={loading}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200/90 shadow-2xs transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 min-h-[38px] shrink-0"
                title="Refresh Live Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Bottom Highlights Mini Ribbon */}
          <div className="pt-3 border-t border-indigo-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs">
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-4 text-slate-600 font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                <span className="truncate">
                  <span className="font-bold text-slate-900">{formatNumber(metrics?.students?.total || 0)}</span> Total Students
                </span>
              </span>

              <span className="text-slate-300 hidden sm:inline">&bull;</span>

              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">
                  <span className="font-bold text-emerald-800">{formatNumber(metrics?.students?.active || 0)}</span> Active ({metrics?.students?.total ? ((metrics.students.active / metrics.students.total) * 100).toFixed(1) : 100}%)
                </span>
              </span>

              <span className="text-slate-300 hidden sm:inline">&bull;</span>

              <span className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                <span className="truncate">
                  <span className="font-bold text-slate-900">{formatNumber(metrics?.staff?.active || 0)}</span> Active Staff
                </span>
              </span>
            </div>

            <div className="w-full sm:w-auto text-center sm:text-left font-mono text-xs font-bold text-indigo-900 bg-white/80 px-2.5 py-1.5 sm:py-1 rounded-xl border border-indigo-100/80 shadow-2xs">
              Treasury: <span className="text-emerald-700">{formatCurrency(metrics?.financialBalance?.currentBalance || 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fresh Subscription Status Banner */}
      {subscription && (
        <div className="print:hidden bg-gradient-to-r from-violet-50/70 via-indigo-50/40 to-sky-50/40 rounded-3xl p-4 sm:p-4.5 border border-indigo-100/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 ring-4 ring-white">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                  {subscription.planName} Plan
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase font-mono ${
                    subscription.status === 'ACTIVE' && subscription.remainingDays > 0
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : subscription.status === 'SUSPENDED'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      subscription.status === 'ACTIVE' && subscription.remainingDays > 0
                        ? 'bg-emerald-500 animate-pulse'
                        : 'bg-rose-500'
                    }`}
                  />
                  {subscription.status === 'ACTIVE' && subscription.remainingDays > 0
                    ? 'ACTIVE'
                    : subscription.status}
                </span>
                <span className="text-xs font-mono font-bold text-indigo-900 bg-white/90 px-2.5 py-0.5 rounded-lg border border-indigo-100 shadow-2xs">
                  {subscription.remainingDays} days remaining
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Subscription valid until {formatDate(subscription.endDate)} &bull; {school?.name}
              </p>
            </div>
          </div>

          <a
            href="/app/subscription"
            className="w-full sm:w-auto justify-center px-4 py-2.5 sm:py-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs transition-all shadow-sm shadow-indigo-600/25 shrink-0 flex items-center gap-1.5 hover:scale-[1.02] sm:hover:scale-105 active:scale-95 text-center min-h-[38px]"
          >
            <span>Manage Subscription</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Primary 5 Operational Metric Cards Grid (2-col mobile, 3-col tablet, 5-col desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* 1. Total Students */}
        <DashboardMetricCard
          title="Total Students"
          value={formatNumber(metrics?.students?.total || 0)}
          theme="indigo"
          badge={
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase font-mono">
              Enrolled
            </span>
          }
          secondary={
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {formatNumber(metrics?.students?.active || 0)} Active
              </span>
              {(metrics?.students?.total || 0) > (metrics?.students?.active || 0) && (
                <span className="text-[11px] text-slate-400 font-mono hidden xl:inline">
                  ({formatNumber((metrics?.students?.total || 0) - (metrics?.students?.active || 0))} left)
                </span>
              )}
            </div>
          }
          icon={Users}
          actionUrl="/app/students"
          actionText="Students"
        />

        {/* 2. Active Staff */}
        <DashboardMetricCard
          title="Active Staff"
          value={formatNumber(metrics?.staff?.active || 0)}
          theme="sky"
          badge={
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 uppercase font-mono">
              Staff
            </span>
          }
          secondary={
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded-lg text-[10px] sm:text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
                Teach: {metrics?.staff?.teaching || 0}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 sm:px-2 rounded-lg text-[10px] sm:text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                Other: {metrics?.staff?.nonTeaching || 0}
              </span>
            </div>
          }
          icon={Briefcase}
          actionUrl="/app/staff"
          actionText="Directory"
        />

        {/* 3. Pending Fee */}
        <DashboardMetricCard
          title="Pending Fees"
          value={formatCurrency(metrics?.pendingFees?.amount || 0)}
          theme="amber"
          badge={
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 uppercase font-mono">
              Dues
            </span>
          }
          secondary={
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 rounded-full text-[10px] sm:text-xs font-bold truncate max-w-full ${
                metrics?.pendingFees?.amount > 0
                  ? 'bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {metrics?.pendingFees?.amount > 0
                ? `${formatNumber(metrics?.pendingFees?.studentsCount || 0)} due`
                : '✓ Cleared'}
            </span>
          }
          icon={CreditCard}
          actionUrl="/app/fees"
          actionText="Fee Dues"
        />

        {/* 4. Pending Salary */}
        <DashboardMetricCard
          title="Pending Payroll"
          value={formatCurrency(metrics?.pendingSalary?.amount || 0)}
          theme="rose"
          badge={
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 uppercase font-mono">
              Salaries
            </span>
          }
          secondary={
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 rounded-full text-[10px] sm:text-xs font-bold truncate max-w-full ${
                metrics?.pendingSalary?.amount > 0
                  ? 'bg-rose-50 text-rose-700 border border-rose-200/90 shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {metrics?.pendingSalary?.amount > 0
                ? `${formatNumber(metrics?.pendingSalary?.staffCount || 0)} pending`
                : '✓ Disbursed'}
            </span>
          }
          icon={DollarSign}
          actionUrl="/app/staff/payments"
          actionText="Payroll"
        />

        {/* 5. Current Financial Balance */}
        <DashboardMetricCard
          title="Current Balance"
          value={formatCurrency(metrics?.financialBalance?.currentBalance || 0)}
          theme="emerald"
          badge={
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase font-mono">
              Ledger
            </span>
          }
          secondary={
            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-mono font-bold flex-wrap">
              <span className="text-emerald-700">↑ {formatCurrency(metrics?.financialBalance?.totalCredit || 0)}</span>
              <span className="text-slate-300">|</span>
              <span className="text-rose-600">↓ {formatCurrency(metrics?.financialBalance?.totalDebit || 0)}</span>
            </div>
          }
          icon={Wallet}
          actionUrl="/app/finance"
          actionText="Treasury"
          className="col-span-2 md:col-span-2 lg:col-span-1"
        />
      </div>

      {/* Quick Actions Control Center */}
      <QuickActionsSection />

      {/* Daily Cashflow & Collection Tracker with Stepper & DatePicker */}
      <TodayCollectionSection selectedYearId={selectedYearId} />

      {/* Monthly Collection Trend & Needs Attention Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <MonthlyCollectionChart data={monthlyCollections} />
        <NeedsAttentionSection items={needsAttention} />
      </div>

      {/* Recent Fee Collections & Recent Expenses Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <RecentFeeCollections collections={recentActivity?.feeCollections} />
        <RecentExpenses expenses={recentActivity?.expenses} />
      </div>

      {/* Recent Salary Payments */}
      <RecentSalaryPayments payments={recentActivity?.salaryPayments} />
    </div>
  );
};

export default DashboardPage;
