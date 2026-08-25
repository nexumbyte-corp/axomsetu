import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminService } from '../../../services/adminService.js';
import { ModulePageHeader } from '../../../components/ui/ModulePageHeader.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Toast } from '../../../components/ui/Toast.jsx';

export const SuperAdminGrowthReportPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await adminService.getGrowthReport();
      setData(res.data);
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to fetch growth report' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const { totalSchools = 0, activeSchools = 0, monthlyGrowth = [] } = data || {};

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <ModulePageHeader
        title="School Growth & Expansion Report"
        description="New school registrations, tenant acquisition rates, and platform expansion trends over the past 12 months."
        actions={
          <button
            onClick={fetchReport}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
            <span>Refresh Growth</span>
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" label="Loading growth analytics..." />
        </div>
      ) : (

        <div className="space-y-6">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Registered Schools</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalSchools}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Active Operational Schools</span>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeSchools}</h3>
            </div>
          </div>

          {/* Monthly Growth Table & Bar Visualization */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Monthly School Registration Trend (Last 12 Months)
            </h3>

            <div className="space-y-3">
              {monthlyGrowth.map((item) => {
                const maxNew = Math.max(...monthlyGrowth.map((m) => m.newSchools), 1);
                const barWidth = Math.round((item.newSchools / maxNew) * 100);

                return (
                  <div key={item.month} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 text-xs p-2 sm:p-0 rounded-lg bg-slate-50 sm:bg-transparent border border-slate-100 sm:border-none">
                    <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto sm:shrink-0">
                      <span className="w-auto sm:w-24 font-bold text-slate-800 text-[11px] sm:text-xs">{item.month}</span>
                      <span className="sm:hidden font-mono text-slate-500 text-[10px]">
                        Total: <strong>{item.totalSchools}</strong>
                      </span>
                    </div>
                    <div className="flex-1 bg-slate-100 h-6 rounded-lg overflow-hidden relative flex items-center w-full">
                      <div
                        className="bg-indigo-600 h-full rounded-lg transition-all duration-500"
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                      <span className="absolute left-2 text-[11px] font-bold text-slate-900 z-10">
                        +{item.newSchools} new school{item.newSchools === 1 ? '' : 's'}
                      </span>
                    </div>
                    <span className="hidden sm:block w-28 text-right font-mono text-slate-500 text-[11px] shrink-0">
                      Total: <strong>{item.totalSchools}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
