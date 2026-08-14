import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../ui/Card.jsx';

export const DashboardMetricCard = ({
  title,
  value,
  secondary,
  icon: Icon,
  iconBg = 'bg-indigo-50 text-indigo-600',
  actionUrl,
  actionText = 'View →',
  valueClass = 'text-slate-900',
}) => {
  return (
    <Card className="hover:border-slate-300 transition-all border-slate-200 shadow-2xs bg-white">
      <CardContent className="p-4 sm:p-4 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <span className="text-xs font-semibold text-slate-500 block truncate">{title}</span>
            <p className={`text-xl sm:text-2xl font-bold font-mono tracking-tight ${valueClass}`}>
              {value}
            </p>
          </div>

          {Icon && (
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs gap-2">
          <span className="text-slate-500 font-medium truncate">{secondary}</span>

          {actionUrl && (
            <Link
              to={actionUrl}
              className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1 shrink-0 group transition-colors"
            >
              <span>{actionText}</span>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
