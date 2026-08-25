import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, XCircle, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { formatDate } from '../../utils/formatters.js';

export const SuperAdminDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await adminService.getDashboardSummary();
      setData(res.data);
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to load platform dashboard metrics' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" label="Loading platform dashboard metrics..." />
      </div>
    );
  }

  const {
    schoolStats = {},
    userStats: _userStats = {},
    growthStats: _growthStats = {},
    financialSummary = { currentMonthRevenue: 0, previousMonthRevenue: 0 },
    expiringSoon: _expiringSoon = [],
    recentPayments = [],
    recentSchools = [],
  } = data || {};

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <ModulePageHeader
        title="Dashboard"
        description="Platform operational overview, subscription revenue metrics, and active tenant summary."
        actions={
          <button
            onClick={fetchDashboardData}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Refresh</span>
          </button>
        }
      />

      {/* 5 Key Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Schools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Schools</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 font-mono">{schoolStats.total || 0}</h3>
            <span className="text-[11px] text-slate-400 font-medium">Registered Tenants</span>
          </div>
        </div>

        {/* Active Schools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Schools</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-600 font-mono">{schoolStats.active || 0}</h3>
            <span className="text-[11px] text-emerald-700 font-medium">Operational Tenants</span>
          </div>
        </div>

        {/* Inactive Schools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Inactive Schools</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-700 font-mono">
              {(schoolStats.inactive || 0) + (schoolStats.suspended || 0)}
            </h3>
            <span className="text-[11px] text-slate-500 font-medium">Suspended / Inactive</span>
          </div>
        </div>

        {/* Trial Schools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Trial Schools</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-600 font-mono">{schoolStats.trial || 0}</h3>
            <span className="text-[11px] text-amber-700 font-medium">On Active Free Trial</span>
          </div>
        </div>

        {/* Subscription Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Subscription Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl font-bold text-slate-900 font-mono">
              {formatCurrency(financialSummary.currentMonthRevenue)}
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Current Month Revenue</span>
          </div>
        </div>
      </div>

      {/* Platform Information Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Registered Schools */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recently Registered Schools</h3>
            <Link to="/admin/schools" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View All
            </Link>
          </div>

          <div className="table-responsive-wrapper">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="pb-2">School</th>
                  <th className="pb-2">Code</th>
                  <th className="pb-2">Owner</th>
                  <th className="pb-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSchools.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400">
                      No schools registered yet.
                    </td>
                  </tr>
                ) : (
                  recentSchools.map((sch) => (
                    <tr key={sch.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5">
                        <Link to={`/admin/schools/${sch.id}`} className="font-bold text-slate-900 hover:text-indigo-600">
                          {sch.name}
                        </Link>
                      </td>
                      <td className="py-2.5 font-mono text-slate-600 font-semibold">{sch.code}</td>
                      <td className="py-2.5 text-slate-600">{sch.ownerName || '-'}</td>
                      <td className="py-2.5 text-right font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            sch.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {sch.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Subscription Payments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Recent Subscription Payments</h3>
            <Link to="/admin/subscriptions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
              View All
            </Link>
          </div>

          <div className="table-responsive-wrapper">
            <table className="w-full text-left text-xs min-w-[500px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="pb-2">School</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400">
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-bold text-slate-900">{p.schoolName}</td>
                      <td className="py-2.5 text-slate-600 font-medium">{p.planName}</td>
                      <td className="py-2.5 font-mono text-slate-500">{formatDate(p.date)}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600 font-mono">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
