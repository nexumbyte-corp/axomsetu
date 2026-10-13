import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  DollarSign,
  Wallet,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { useAcademicYear } from '../hooks/useAcademicYear.js';
import { dashboardService } from '../services/dashboard.service.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';
import { Badge } from '../components/ui/Badge.jsx';
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

  if (error && !dashboardData) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <ModulePageHeader
          icon={LayoutDashboard}
          title={`Welcome, ${userName}`}
          description="Overview of your school's students, fees, payroll, and finances."
        />
        <Card className="border-rose-200/80 bg-rose-50/40 rounded-xl sm:rounded-2xl">
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

      {/* Desktop Welcome Banner (Hidden on mobile where ModulePageHeader already renders cleanly) */}
      <div className="hidden md:flex items-center justify-between gap-4 bg-white p-4.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Welcome back, <span className="text-indigo-600">{userName}</span></span>
            <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Here is your daily pulse for <strong className="text-slate-700">{school?.name || 'your workspace'}</strong>.
            Academic Year: <span className="font-semibold text-slate-700">{selectedYear?.name || 'Current'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            loading={loading}
            onClick={fetchDashboardSummary}
            className="text-xs h-8.5 px-3 border-slate-200 text-slate-700 hover:text-slate-900 shadow-2xs font-semibold"
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Minimalist Subscription Status Card */}
      {subscription && (
        <div className="print:hidden bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900 truncate">{subscription.planName} Plan</span>
                <Badge
                  variant={
                    subscription.status === 'ACTIVE' && subscription.remainingDays > 0
                      ? 'success'
                      : subscription.status === 'SUSPENDED'
                        ? 'warning'
                        : 'danger'
                  }
                  size="sm"
                  className="text-[10px] py-0 px-1.5"
                >
                  {subscription.status === 'ACTIVE' && subscription.remainingDays > 0
                    ? 'ACTIVE'
                    : subscription.status}
                </Badge>
                <span className="text-[11px] font-mono text-slate-500">
                  &bull; {subscription.remainingDays} days remaining
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                Valid until {formatDate(subscription.endDate)} &bull; {school?.name}
              </p>
            </div>
          </div>

          <a
            href="/app/subscription"
            className="self-end sm:self-center px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors shrink-0"
          >
            Manage Plan
          </a>
        </div>
      )}

      {/* Primary 5 Operational Metric Cards Grid (2-col mobile, 5-col desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {/* 1. Total Students */}
        <DashboardMetricCard
          title="Total Students"
          value={formatNumber(metrics?.students?.total || 0)}
          secondary={`Active: ${formatNumber(metrics?.students?.active || 0)}`}
          icon={Users}
          iconBg="bg-indigo-50 text-indigo-600"
          actionUrl="/app/students"
          actionText="View"
        />

        {/* 2. Active Staff */}
        <DashboardMetricCard
          title="Active Staff"
          value={formatNumber(metrics?.staff?.active || 0)}
          secondary={`Teaching: ${metrics?.staff?.teaching || 0} • Staff: ${metrics?.staff?.nonTeaching || 0}`}
          icon={Briefcase}
          iconBg="bg-sky-50 text-sky-600"
          actionUrl="/app/staff"
          actionText="View"
        />

        {/* 3. Pending Fee */}
        <DashboardMetricCard
          title="Pending Fee"
          value={formatCurrency(metrics?.pendingFees?.amount || 0)}
          secondary={`Due: ${formatNumber(metrics?.pendingFees?.studentsCount || 0)} students`}
          icon={CreditCard}
          iconBg="bg-amber-50 text-amber-600"
          actionUrl="/app/fees"
          actionText="View"
          valueClass={metrics?.pendingFees?.amount > 0 ? 'text-amber-700' : 'text-slate-900'}
        />

        {/* 4. Pending Salary */}
        <DashboardMetricCard
          title="Pending Salary"
          value={formatCurrency(metrics?.pendingSalary?.amount || 0)}
          secondary={`Staff: ${formatNumber(metrics?.pendingSalary?.staffCount || 0)} pending`}
          icon={DollarSign}
          iconBg="bg-rose-50 text-rose-600"
          actionUrl="/app/staff"
          actionText="View"
          valueClass={metrics?.pendingSalary?.amount > 0 ? 'text-rose-600' : 'text-slate-900'}
        />

        {/* 5. Current Financial Balance (Spans 2 columns on mobile for perfect 2-col balance) */}
        <DashboardMetricCard
          title="Current Balance"
          value={formatCurrency(metrics?.financialBalance?.currentBalance || 0)}
          secondary={`Credit: ${formatCurrency(metrics?.financialBalance?.totalCredit || 0)} | Debit: ${formatCurrency(metrics?.financialBalance?.totalDebit || 0)}`}
          icon={Wallet}
          iconBg="bg-emerald-50 text-emerald-600"
          actionUrl="/app/finance"
          actionText="View"
          valueClass="text-slate-900"
          className="col-span-2 lg:col-span-1"
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

