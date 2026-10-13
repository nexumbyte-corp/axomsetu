import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CreditCard, Users, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';

export const NeedsAttentionSection = ({ items = [] }) => {
  if (!items || items.length === 0) {
    return (
      <Card className="border-slate-200/80 bg-white shadow-2xs rounded-xl sm:rounded-2xl">
        <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Needs Attention
            </CardTitle>
          </div>
          <Badge variant="success" size="sm" className="text-[10px]">
            ALL CLEAR
          </Badge>
        </CardHeader>
        <CardContent className="p-5 text-center">
          <div className="flex flex-col items-center justify-center py-4 text-slate-500">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-slate-800">All Operations Running Smoothly</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
              No urgent issues, pending approvals, or overdue fee/payroll items currently.
            </p>
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
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-xl sm:rounded-2xl">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            Needs Attention
          </CardTitle>
        </div>
        <Badge variant="warning" size="sm" className="font-mono text-[10px]">
          {items.length} {items.length === 1 ? 'ITEM' : 'ITEMS'}
        </Badge>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-2">
        {items.map((item) => {
          const IconComp = getIcon(item.category);
          const isDanger = item.severity === 'danger';

          return (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/30 hover:bg-white transition-all shadow-2xs group"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isDanger ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.actionUrl && (
                <Link
                  to={item.actionUrl}
                  className={`self-end sm:self-center text-xs font-semibold flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg transition-colors ${
                    isDanger
                      ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                      : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
                  }`}
                >
                  <span>{item.actionLabel || 'Action'}</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

