import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CreditCard, Users, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';

export const NeedsAttentionSection = ({ items = [] }) => {
  if (!items || items.length === 0) {
    return (
      <Card className="border-slate-200 bg-white shadow-2xs">
        <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-500" />
            <CardTitle className="text-sm font-bold text-slate-900">Needs Attention</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 text-center">
          <div className="flex flex-col items-center justify-center py-3 text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
            <p className="text-xs font-semibold text-slate-800">All Systems Operational</p>
            <p className="text-[11px] text-slate-400 mt-0.5">No immediate items require administrative attention.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (category) => {
    switch (category) {
      case 'FEE':
        return CreditCard;
      case 'PAYROLL':
        return Users;
      default:
        return AlertCircle;
    }
  };

  return (
    <Card className="border-slate-200 bg-white shadow-2xs">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <CardTitle className="text-sm font-bold text-slate-900">Needs Attention</CardTitle>
        </div>
        <Badge variant="warning" size="sm">
          {items.length} Item{items.length === 1 ? '' : 's'}
        </Badge>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 divide-y divide-slate-100">
        {items.map((item) => {
          const IconComp = getIcon(item.category);
          const isDanger = item.severity === 'danger';

          return (
            <div
              key={item.id}
              className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-lg transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isDanger ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">{item.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.description}</p>
                </div>
              </div>

              {item.actionUrl && (
                <Link
                  to={item.actionUrl}
                  className={`text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors ${
                    isDanger ? 'text-rose-600 hover:text-rose-700' : 'text-indigo-600 hover:text-indigo-700'
                  }`}
                >
                  <span>{item.actionLabel || 'Action →'}</span>
                </Link>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
