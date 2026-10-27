import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const THEME_CONFIG = {
  indigo: {
    ambientGlow: 'bg-indigo-500/10',
    topHighlight: 'from-indigo-500 to-violet-500',
    iconGradient: 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-50',
    borderHover: 'hover:border-indigo-300',
    actionText: 'text-indigo-600 group-hover:text-indigo-700',
    valueText: 'text-slate-900',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
    bgWash: 'from-indigo-50/30 via-white to-white',
  },
  sky: {
    ambientGlow: 'bg-sky-500/10',
    topHighlight: 'from-sky-400 to-blue-600',
    iconGradient: 'bg-gradient-to-tr from-sky-500 via-blue-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 ring-4 ring-sky-50',
    borderHover: 'hover:border-sky-300',
    actionText: 'text-sky-600 group-hover:text-sky-700',
    valueText: 'text-slate-900',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200/80',
    bgWash: 'from-sky-50/30 via-white to-white',
  },
  amber: {
    ambientGlow: 'bg-amber-500/10',
    topHighlight: 'from-amber-400 to-orange-500',
    iconGradient: 'bg-gradient-to-tr from-amber-500 via-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/25 ring-4 ring-amber-50',
    borderHover: 'hover:border-amber-300',
    actionText: 'text-amber-700 group-hover:text-amber-800',
    valueText: 'text-amber-950',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200/80',
    bgWash: 'from-amber-50/30 via-white to-white',
  },
  rose: {
    ambientGlow: 'bg-rose-500/10',
    topHighlight: 'from-rose-400 to-pink-600',
    iconGradient: 'bg-gradient-to-tr from-rose-500 via-pink-500 to-pink-600 text-white shadow-lg shadow-rose-500/25 ring-4 ring-rose-50',
    borderHover: 'hover:border-rose-300',
    actionText: 'text-rose-600 group-hover:text-rose-700',
    valueText: 'text-rose-950',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200/80',
    bgWash: 'from-rose-50/30 via-white to-white',
  },
  emerald: {
    ambientGlow: 'bg-emerald-500/10',
    topHighlight: 'from-emerald-400 to-teal-600',
    iconGradient: 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-50',
    borderHover: 'hover:border-emerald-300',
    actionText: 'text-emerald-700 group-hover:text-emerald-800',
    valueText: 'text-slate-900',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    bgWash: 'from-emerald-50/30 via-white to-white',
  },
};

export const DashboardMetricCard = ({
  title,
  value,
  secondary,
  badge,
  icon: Icon,
  theme = 'indigo',
  actionUrl,
  actionText = 'View',
  valueClass,
  className = '',
}) => {
  const cfg = THEME_CONFIG[theme] || THEME_CONFIG.indigo;
  const resolvedValueClass = valueClass || cfg.valueText;

  const content = (
    <div
      className={`group relative bg-gradient-to-b ${cfg.bgWash} rounded-2xl sm:rounded-3xl border border-slate-200/80 ${cfg.borderHover} p-3.5 sm:p-5 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full overflow-hidden hover:-translate-y-1 ${
        actionUrl ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      {/* Top Colorful Gradient Highlight Line */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${cfg.topHighlight} opacity-90`} />

      {/* Ambient Floating Soft Glow in the Corner */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${cfg.ambientGlow} blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500`}
      />

      {/* Card Header & Number */}
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 tracking-wider uppercase font-sans">
                {title}
              </span>
              {badge && <div className="shrink-0">{badge}</div>}
            </div>

            <p className={`text-xl sm:text-2xl md:text-3xl lg:text-[28px] font-black tracking-tight font-mono leading-tight pt-0.5 truncate ${resolvedValueClass}`}>
              {value}
            </p>
          </div>

          {Icon && (
            <div
              className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-2 ${cfg.iconGradient}`}
            >
              <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5 md:w-5.5 md:h-5.5" strokeWidth={2.2} />
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Secondary Info & Action */}
      <div className="relative z-10 flex items-center justify-between pt-2.5 sm:pt-3.5 mt-2.5 sm:mt-3.5 border-t border-slate-100/90 text-xs gap-1.5 sm:gap-2 min-w-0">
        <div className="text-slate-600 font-medium truncate flex-1 min-w-0">
          {typeof secondary === 'string' ? (
            <span className="truncate block font-semibold text-[10px] sm:text-[11px] text-slate-500">{secondary}</span>
          ) : (
            secondary
          )}
        </div>

        {actionUrl && (
          <span
            className={`${cfg.actionText} font-bold text-[11px] sm:text-xs flex items-center gap-0.5 shrink-0 transition-all ml-auto pl-1 group-hover:underline`}
          >
            <span className="hidden sm:inline">{actionText}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </span>
        )}
      </div>
    </div>
  );

  if (actionUrl) {
    return (
      <Link
        to={actionUrl}
        className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-3xl"
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default DashboardMetricCard;
