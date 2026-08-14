import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Wallet,
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  PiggyBank,
} from 'lucide-react';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';

export const FinanceLayout = () => {
  const tabs = [
    { label: 'Overview', path: '/app/finance/overview', icon: LayoutDashboard, end: true },
    { label: 'Transactions', path: '/app/finance/transactions', icon: Receipt },
    { label: 'Expenses', path: '/app/finance/expenses', icon: FileSpreadsheet },
    { label: 'Funds', path: '/app/finance/funds', icon: PiggyBank },
  ];

  return (
    <div className="space-y-6">
      {/* Standardized Module Header */}
      <ModulePageHeader
        icon={Wallet}
        title="Finance & Fund Management"
        description="Unified Financial Ledger, Expense Tracking, Fund Contributions & Cash Flow Analysis"
      />

      {/* Navigation Sub-Header Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-1 shadow-2xs flex items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>

      {/* Page Content */}
      <div>
        <Outlet />
      </div>
    </div>
  );
};
