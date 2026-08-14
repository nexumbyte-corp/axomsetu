import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CreditCard,
  DollarSign,
  Wallet,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAcademicYear } from '../hooks/useAcademicYear.js';
import { dashboardService } from '../services/dashboard.service.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { BRAND_CONFIG } from '../config/brandConfig.js';
import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardContent } from '../components/ui/Card.jsx';
import { DashboardSkeleton } from '../components/dashboard/DashboardSkeleton.jsx';
import { DashboardMetricCard } from '../components/dashboard/DashboardMetricCard.jsx';
import { NeedsAttentionSection } from '../components/dashboard/NeedsAttentionSection.jsx';
import {
  RecentFeeCollections,
  RecentExpenses,
  RecentSalaryPayments,
} from '../components/dashboard/RecentActivityTables.jsx';
import { QuickActionsSection } from '../components/dashboard/QuickActionsSection.jsx';
import { formatCurrency, formatNumber } from '../utils/formatters.js';

export const DashboardPage = () => {
  useDocumentTitle('Dashboard');
  const { selectedYear, selectedYearId } = useAcademicYear();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardSummary = useCallback(async () => {
    if (!dashboardData) setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.getSummary({
        academicYearId: selectedYearId || undefined,
      });

      if (res.success && res.data) {
        setDashboardData(res.data);
      } else {
        throw new Error(res.message || 'Failed to fetch dashboard summary');
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

  if (error && !dashboardData) {
    return (
      <div className="space-y-6">
        <ModulePageHeader
          icon={LayoutDashboard}
          title="Dashboard"
          description="Overview of your school's students, fees, payroll and finances."
        />
        <Card className="border-rose-200 bg-rose-50/40">
          <CardContent className="p-6 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Unable to load Dashboard</h3>
              <p className="text-xs text-slate-600 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchDashboardSummary}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { school, subscription, metrics, needsAttention, recentActivity } = dashboardData || {};

  return (
    <div className="space-y-6">
      {/* Subscription Status Banner Widget */}
      {subscription && (
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">{school?.name}</span>
                <Badge
                  variant={
                    subscription.status === 'ACTIVE' && subscription.remainingDays > 0
                      ? 'success'
                      : subscription.status === 'SUSPENDED'
                      ? 'warning'
                      : 'danger'
                  }
                >
                  {subscription.status === 'ACTIVE' && subscription.remainingDays > 0
                    ? 'ACTIVE'
                    : subscription.status}
                </Badge>
              </div>
              <p className="text-sm font-extrabold text-white mt-0.5">
                {subscription.planName} Plan &bull;{' '}
                <span className="text-indigo-300 font-normal text-xs font-mono">
                  {subscription.remainingDays} Days Remaining
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right hidden md:block">
              <span className="text-slate-400 block text-[11px]">Expires / Next Date</span>
              <span className="font-semibold text-slate-200 font-mono">
                {subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('en-IN') : '-'}
              </span>
            </div>
            <a
              href="/app/subscription"
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-xs"
            >
              Manage Subscription
            </a>
          </div>
        </div>
      )}

      {/* Primary 5 Operational Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 1. Total Students */}
        <DashboardMetricCard
          title="Total Students"
          value={formatNumber(metrics?.students?.total || 0)}
          secondary={`Active: ${formatNumber(metrics?.students?.active || 0)}`}
          icon={Users}
          iconBg="bg-indigo-50 text-indigo-600"
          actionUrl="/app/students"
          actionText="View Students →"
        />

        {/* 2. Active Staff */}
        <DashboardMetricCard
          title="Active Staff"
          value={formatNumber(metrics?.staff?.active || 0)}
          secondary={`Teaching: ${metrics?.staff?.teaching || 0} | Non-teaching: ${metrics?.staff?.nonTeaching || 0}`}
          icon={Briefcase}
          iconBg="bg-sky-50 text-sky-600"
          actionUrl="/app/staff"
          actionText="View Staff →"
        />

        {/* 3. Pending Fee */}
        <DashboardMetricCard
          title="Pending Fee"
          value={formatCurrency(metrics?.pendingFees?.amount || 0)}
          secondary={`Students with Due: ${formatNumber(metrics?.pendingFees?.studentsCount || 0)}`}
          icon={CreditCard}
          iconBg="bg-amber-50 text-amber-600"
          actionUrl="/app/fees"
          actionText="View Pending Fees →"
          valueClass={metrics?.pendingFees?.amount > 0 ? 'text-amber-700' : 'text-slate-900'}
        />

        {/* 4. Pending Salary */}
        <DashboardMetricCard
          title="Pending Salary"
          value={formatCurrency(metrics?.pendingSalary?.amount || 0)}
          secondary={`Staff with Pending Salary: ${formatNumber(metrics?.pendingSalary?.staffCount || 0)}`}
          icon={DollarSign}
          iconBg="bg-rose-50 text-rose-600"
          actionUrl="/app/staff"
          actionText="View Pending Salary →"
          valueClass={metrics?.pendingSalary?.amount > 0 ? 'text-rose-600' : 'text-slate-900'}
        />

        {/* 5. Current Financial Balance */}
        <DashboardMetricCard
          title="Current Balance"
          value={formatCurrency(metrics?.financialBalance?.currentBalance || 0)}
          secondary={`Credit: ${formatCurrency(metrics?.financialBalance?.totalCredit || 0)} | Debit: ${formatCurrency(metrics?.financialBalance?.totalDebit || 0)}`}
          icon={Wallet}
          iconBg="bg-emerald-50 text-emerald-600"
          actionUrl="/app/finance"
          actionText="View Finance →"
          valueClass="text-slate-900"
        />
      </div>

      {/* Items Requiring Attention */}
      <NeedsAttentionSection items={needsAttention} />

      {/* Recent Fee Collections & Recent Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentFeeCollections collections={recentActivity?.feeCollections} />
        <RecentExpenses expenses={recentActivity?.expenses} />
      </div>

      {/* Recent Salary Payments & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentSalaryPayments payments={recentActivity?.salaryPayments} />
        <QuickActionsSection />
      </div>
    </div>
  );
};
