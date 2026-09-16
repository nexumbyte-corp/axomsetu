import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  RefreshCw,
  Plus,
  Package,
  CreditCard,
  Receipt,
  FileText,
  Settings,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { formatDate } from '../../utils/formatters.js';

export const SuperAdminDashboardPage = () => {
  const navigate = useNavigate();
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
        <Spinner size="lg" label="Loading platform metrics..." />
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

  const quickActions = [
    { label: 'Register School', icon: Building2, action: () => navigate('/admin/schools?action=create'), color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100' },
    { label: 'Create Plan', icon: Package, action: () => navigate('/admin/plans/new'), color: 'text-purple-600 bg-purple-50 border-purple-100 hover:bg-purple-100' },
    { label: 'Subscriptions', icon: CreditCard, action: () => navigate('/admin/subscriptions'), color: 'text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-100' },
    { label: 'Payment Ledger', icon: Receipt, action: () => navigate('/admin/payments'), color: 'text-blue-600 bg-blue-50 border-blue-100 hover:bg-blue-100' },
    { label: 'Audit Logs', icon: FileText, action: () => navigate('/admin/audit-logs'), color: 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100' },
    { label: 'Platform Config', icon: Settings, action: () => navigate('/admin/platform'), color: 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100' },
  ];

  return (
    <div className="space-y-5">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Header Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight">Super Admin Dashboard</h1>
            <p className="text-xs text-slate-500 font-medium">Real-time tenant metrics, financial performance & subscription statuses</p>
          </div>
        </div>

        <button
          onClick={fetchDashboardData}
          className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
        {/* Total Schools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Schools</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-2xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">{schoolStats.total || 0}</h3>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                REGISTERED TENANTS
              </span>
            </div>
          </div>
        </div>

        {/* Active Schools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Schools</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-2xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-extrabold text-emerald-600 font-mono tracking-tight">{schoolStats.active || 0}</h3>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                OPERATIONAL
              </span>
            </div>
          </div>
        </div>

        {/* Trial Schools */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trial Schools</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-extrabold text-amber-600 font-mono tracking-tight">{schoolStats.trial || 0}</h3>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                ACTIVE TRIALS
              </span>
            </div>
          </div>
        </div>

        {/* Inactive / Suspended */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suspended</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center shadow-2xs">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-extrabold text-rose-600 font-mono tracking-tight">
              {(schoolStats.inactive || 0) + (schoolStats.suspended || 0)}
            </h3>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                ACTION REQUIRED
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shadow-2xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
              {formatCurrency(financialSummary.currentMonthRevenue)}
            </h3>
            <div className="mt-1 flex items-center gap-1">
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                CURRENT MONTH
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Icon-Oriented Quick Action Command Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <span>Quick Operations Command Bar</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickActions.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <button
                key={idx}
                onClick={item.action}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all text-left shadow-2xs ${item.color}`}
              >
                <div className="p-1 rounded bg-white/80 shrink-0">
                  <IconComp className="w-4 h-4" />
                </div>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform Information Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recently Registered Schools */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Recent Registered Schools</h3>
            </div>
            <Link to="/admin/schools" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">School</th>
                  <th className="pb-2">Code</th>
                  <th className="pb-2">Owner</th>
                  <th className="pb-2 text-center">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentSchools.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                      No schools registered yet.
                    </td>
                  </tr>
                ) : (
                  recentSchools.map((sch) => (
                    <tr key={sch.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5">
                        <Link to={`/admin/schools/${sch.id}`} className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-slate-100 text-slate-600 flex items-center justify-center font-extrabold text-[10px]">
                            {sch.name.charAt(0)}
                          </div>
                          <span className="truncate max-w-[150px]">{sch.name}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 font-mono text-slate-600 text-[11px]">{sch.code}</td>
                      <td className="py-2.5 text-slate-600 text-xs truncate max-w-[120px]">{sch.ownerName || '-'}</td>
                      <td className="py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            sch.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {sch.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <Link
                          to={`/admin/schools/${sch.id}`}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 inline-block"
                          title="Manage School"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Subscription Payments */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Recent Subscription Payments</h3>
            </div>
            <Link to="/admin/subscriptions" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800">
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[480px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2">School</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2">Date</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-slate-400 text-xs">
                      No payment transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 font-bold text-slate-900 truncate max-w-[150px]">{p.schoolName}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {p.planName}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-500 text-[11px]">{formatDate(p.date)}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-600 font-mono text-xs">
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
