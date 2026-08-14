import React from 'react';
import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { CreditCard, CalendarCheck, FileSpreadsheet, History, Settings, Receipt, DollarSign } from 'lucide-react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { usePermission } from '../../hooks/usePermission.js';

export const FeeManagementLayout = () => {
  const location = useLocation();
  const { selectedYear } = useAcademicYear();
  const { can } = usePermission();

  const tabs = [
    { label: 'Collect Fees ⭐', path: '/app/fees/collect', icon: DollarSign, permission: 'FEES_COLLECT' },
    { label: 'Generate Fees', path: '/app/fees/generate', icon: CalendarCheck, permission: 'FEES_GENERATE' },
    { label: 'Fee Templates', path: '/app/fees/templates', icon: FileSpreadsheet, permission: 'FEES_MANAGE_STRUCTURE' },
    { label: 'Generated History', path: '/app/fees/generated', icon: History, permission: 'FEES_VIEW' },
    { label: 'Receipts & Search', path: '/app/fees/receipts', icon: Receipt, permission: 'FEES_VIEW' },
    { label: 'Settings', path: '/app/fees/settings/types', icon: Settings, permission: 'FEES_MANAGE_STRUCTURE' },
  ].filter((t) => !t.permission || can(t.permission));

  // If user hits exactly /app/fees, redirect to first available tab
  if (location.pathname === '/app/fees' || location.pathname === '/app/fees/') {
    const firstPath = tabs.length > 0 ? tabs[0].path : '/app';
    return <Navigate to={firstPath} replace />;
  }

  return (
    <div className="space-y-6">
      {/* Standardized Module Header */}
      <ModulePageHeader
        icon={CreditCard}
        title="Fee Management"
        description="Manage Fee Structures, Student Collections, Dues, Payments & Receipts"
        actions={
          selectedYear && (
            <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 text-xs font-semibold text-slate-700">
              <span className="text-[11px] text-slate-400">Year:</span>
              <span className="text-indigo-600 font-bold text-xs">{selectedYear.name}</span>
              {selectedYear.isCurrent && (
                <Badge variant="success" size="sm">
                  Current
                </Badge>
              )}
              {selectedYear.isLocked && (
                <Badge variant="neutral" size="sm">
                  Locked
                </Badge>
              )}
            </div>
          )
        }
      />

      {/* Sub Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-1 overflow-x-auto pb-px scrollbar-none">
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = tab.label === 'Settings'
              ? location.pathname.startsWith('/app/fees/settings')
              : location.pathname === tab.path;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={
                  `flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${isActive
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/60 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                  }`
                }
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Child Tab Content */}
      <div>
        <Outlet />
      </div>
    </div>
  );
};
