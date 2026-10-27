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
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';

export const QuickActionsSection = () => {
  const actions = [
    {
      label: 'Collect Fee',
      subtitle: 'Counter & Pos',
      path: '/app/fees/collect',
      icon: CreditCard,
      gradient: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-500/25',
      hoverBorder: 'hover:border-emerald-300 hover:bg-emerald-50/20',
      tagColor: 'text-emerald-700 bg-emerald-50',
    },
    {
      label: 'Add Student',
      subtitle: 'New Admission',
      path: '/app/students/new',
      icon: UserPlus,
      gradient: 'from-indigo-500 to-violet-600',
      shadow: 'shadow-indigo-500/25',
      hoverBorder: 'hover:border-indigo-300 hover:bg-indigo-50/20',
      tagColor: 'text-indigo-700 bg-indigo-50',
    },
    {
      label: 'Add Staff',
      subtitle: 'Directory',
      path: '/app/staff',
      icon: UserCheck,
      gradient: 'from-sky-500 to-blue-600',
      shadow: 'shadow-sky-500/25',
      hoverBorder: 'hover:border-sky-300 hover:bg-sky-50/20',
      tagColor: 'text-sky-700 bg-sky-50',
    },
    {
      label: 'Generate Fees',
      subtitle: 'Monthly Batch',
      path: '/app/fees/generate',
      icon: Zap,
      gradient: 'from-amber-500 to-orange-500',
      shadow: 'shadow-amber-500/25',
      hoverBorder: 'hover:border-amber-300 hover:bg-amber-50/20',
      tagColor: 'text-amber-800 bg-amber-50',
    },
    {
      label: 'Pay Salary',
      subtitle: 'Payroll Run',
      path: '/app/staff/payments',
      icon: DollarSign,
      gradient: 'from-purple-500 to-fuchsia-600',
      shadow: 'shadow-purple-500/25',
      hoverBorder: 'hover:border-purple-300 hover:bg-purple-50/20',
      tagColor: 'text-purple-700 bg-purple-50',
    },
    {
      label: 'Add Expense',
      subtitle: 'Record Outflow',
      path: '/app/finance/expenses',
      icon: Receipt,
      gradient: 'from-rose-500 to-pink-600',
      shadow: 'shadow-rose-500/25',
      hoverBorder: 'hover:border-rose-300 hover:bg-rose-50/20',
      tagColor: 'text-rose-700 bg-rose-50',
    },
    {
      label: 'Add Fund',
      subtitle: 'Treasury Inflow',
      path: '/app/finance/funds',
      icon: PlusCircle,
      gradient: 'from-teal-500 to-cyan-600',
      shadow: 'shadow-teal-500/25',
      hoverBorder: 'hover:border-teal-300 hover:bg-teal-50/20',
      tagColor: 'text-teal-700 bg-teal-50',
    },
  ];

  return (
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Operational Shortcuts
            </CardTitle>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Frequently accessed day-to-day administrative actions
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
          7 Direct Actions
        </span>
      </CardHeader>

      <CardContent className="p-3 sm:p-4.5">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5 md:gap-3">
          {actions.map((act, idx) => {
            const IconComp = act.icon;
            const isLastOnMobile = idx === actions.length - 1;
            return (
              <Link
                key={idx}
                to={act.path}
                className={`group relative flex ${
                  isLastOnMobile
                    ? 'col-span-2 sm:col-span-1 flex-row sm:flex-col justify-start sm:justify-center gap-3 sm:gap-0'
                    : 'flex-col items-center justify-center text-center'
                } p-2.5 sm:p-3.5 rounded-xl border border-slate-200/80 bg-white ${act.hoverBorder} shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] min-h-[58px] sm:min-h-0`}
              >
                {/* Micro hover indicator */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-slate-700" />
                </div>

                {/* Gradient Icon Squircle */}
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${act.gradient} text-white flex items-center justify-center shadow-md ${act.shadow} transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                    isLastOnMobile ? 'mb-0 sm:mb-2' : 'mb-2'
                  }`}
                >
                  <IconComp className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.2} />
                </div>

                {/* Text Container */}
                <div className={isLastOnMobile ? 'text-left sm:text-center min-w-0 flex-1' : 'w-full'}>
                  {/* Title */}
                  <span className="text-xs font-bold text-slate-900 group-hover:text-slate-950 tracking-tight block truncate w-full">
                    {act.label}
                  </span>

                  {/* Subtitle / Micro tag */}
                  <span className="text-[10px] font-medium text-slate-500 mt-0.5 block truncate w-full">
                    {act.subtitle}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActionsSection;
