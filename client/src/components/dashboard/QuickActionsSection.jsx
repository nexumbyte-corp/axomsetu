import React from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  UserCheck,
  Zap,
  CreditCard,
  DollarSign,
  Receipt,
  PlusCircle,
  Sparkles,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';

export const QuickActionsSection = () => {
  const actions = [
    {
      label: 'Collect Fee',
      path: '/app/fees/collect',
      icon: CreditCard,
      color: 'text-emerald-600 bg-emerald-50/80 group-hover:bg-emerald-100',
    },
    {
      label: 'Add Student',
      path: '/app/students/new',
      icon: UserPlus,
      color: 'text-indigo-600 bg-indigo-50/80 group-hover:bg-indigo-100',
    },
    {
      label: 'Add Staff',
      path: '/app/staff',
      icon: UserCheck,
      color: 'text-sky-600 bg-sky-50/80 group-hover:bg-sky-100',
    },
    {
      label: 'Generate Fees',
      path: '/app/fees/generate',
      icon: Zap,
      color: 'text-amber-600 bg-amber-50/80 group-hover:bg-amber-100',
    },
    {
      label: 'Pay Salary',
      path: '/app/staff/payments',
      icon: DollarSign,
      color: 'text-violet-600 bg-violet-50/80 group-hover:bg-violet-100',
    },
    {
      label: 'Add Expense',
      path: '/app/finance/expenses',
      icon: Receipt,
      color: 'text-rose-600 bg-rose-50/80 group-hover:bg-rose-100',
    },
    {
      label: 'Add Fund',
      path: '/app/finance/funds',
      icon: PlusCircle,
      color: 'text-teal-600 bg-teal-50/80 group-hover:bg-teal-100',
    },
  ];

  return (
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-xl sm:rounded-2xl">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            Quick Actions
          </CardTitle>
        </div>
        <span className="text-[11px] font-medium text-slate-400">Frequently used shortcuts</span>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
          {actions.map((act, idx) => {
            const IconComp = act.icon;
            return (
              <Link
                key={idx}
                to={act.path}
                className="group flex sm:flex-col items-center sm:justify-center gap-2.5 sm:gap-2 p-2.5 sm:p-3 rounded-xl border border-slate-200/70 hover:border-slate-300 bg-slate-50/40 hover:bg-white text-slate-700 hover:text-slate-900 shadow-2xs hover:shadow-xs transition-all duration-150 min-h-[44px] active:scale-[0.98]"
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${act.color}`}
                >
                  <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
                <span className="text-xs font-semibold text-slate-800 group-hover:text-slate-900 tracking-tight text-left sm:text-center truncate w-full">
                  {act.label}
                </span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

