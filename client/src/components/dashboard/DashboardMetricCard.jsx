import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const DashboardMetricCard = ({
  title,
  value,
  secondary,
  icon: Icon,
  iconBg = 'bg-indigo-50 text-indigo-600',
  actionUrl,
  actionText = 'View',
  valueClass = 'text-slate-900',
  className = '',
}) => {
  const content = (
    <div className={`group relative bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 hover:border-slate-300 p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-all duration-150 flex flex-col justify-between h-full ${actionUrl ? 'cursor-pointer active:scale-[0.99]' : ''} ${className}`}>
      {/* Top: Title & Icon */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="space-y-0.5 min-w-0">
          <span className="text-[11px] sm:text-xs font-medium text-slate-500 block truncate">
            {title}
          </span>
          <p className={`text-lg sm:text-2xl font-bold font-mono tracking-tight truncate ${valueClass}`}>
            {value}
          </p>
        </div>

        {Icon && (
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${iconBg}`}>
            <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          </div>
        )}
      </div>

      {/* Bottom: Secondary info & Action prompt */}
      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-[11px] sm:text-xs gap-1.5 min-w-0">
        <span className="text-slate-500 font-normal truncate max-w-full">
          {secondary}
        </span>

        {actionUrl && (
          <span className="text-indigo-600 group-hover:text-indigo-700 font-semibold flex items-center gap-0.5 shrink-0 transition-colors ml-auto">
            <span className="hidden sm:inline">{actionText}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        )}
      </div>
    </div>
  );

  if (actionUrl) {
    return (
      <Link to={actionUrl} className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-xl sm:rounded-2xl">
        {content}
      </Link>
    );
  }

  return content;
};

