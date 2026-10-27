import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CreditCard, Users, CheckCircle2, ChevronRight, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';

export const NeedsAttentionSection = ({ items = [] }) => {
  if (!items || items.length === 0) {
    return (
      <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between">
        <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/40 via-white to-slate-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Operational Health
            </CardTitle>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            ALL CLEAR
          </span>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 text-center flex-1 flex flex-col items-center justify-center">
          <div className="relative mb-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/10 to-teal-500/20 border border-emerald-200/70 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white"></div>
          </div>
          <h4 className="text-sm font-bold text-slate-900">All Operations Running Smoothly</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            No critical blockers, expired subscriptions, or overdue alerts require your immediate intervention today.
          </p>
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

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'danger':
        return {
          cardBg: 'bg-rose-50/40 border-rose-200 hover:border-rose-300',
          iconBg: 'bg-gradient-to-tr from-rose-500 to-pink-600 text-white shadow-rose-500/25',
          titleColor: 'text-rose-950',
          badgeVariant: 'danger',
          actionBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20',
        };
      case 'warning':
      default:
        return {
          cardBg: 'bg-amber-50/40 border-amber-200 hover:border-amber-300',
          iconBg: 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/25',
          titleColor: 'text-amber-950',
          badgeVariant: 'warning',
          actionBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
        };
    }
  };

  return (
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/40 via-white to-slate-50/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/20">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Needs Attention
            </CardTitle>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Urgent tasks and items requiring administrator action
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
          {items.length} Action{items.length === 1 ? '' : 's'}
        </span>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-4.5 space-y-2.5">
        {items.map((item, idx) => {
          const IconComp = getIcon(item.category);
          const style = getSeverityStyle(item.severity);

          return (
            <div
              key={item.id || idx}
              className={`p-3 sm:p-3.5 rounded-xl border ${style.cardBg} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-2xs transition-all duration-150 hover:shadow-xs`}
            >
              <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${style.iconBg} flex items-center justify-center shrink-0 shadow-sm mt-0.5`}
                >
                  <IconComp className="w-4 h-4 sm:w-4.5 sm:h-4.5" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <h4 className={`text-xs font-bold tracking-tight ${style.titleColor}`}>
                      {item.title}
                    </h4>
                    {item.category && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/80 border border-slate-200/80 text-slate-600 uppercase font-mono">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {item.actionUrl && (
                <Link
                  to={item.actionUrl}
                  className={`self-end sm:self-center px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1 shadow-xs active:scale-95 ${style.actionBtn}`}
                >
                  <span>{item.actionLabel || 'Resolve'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default NeedsAttentionSection;
