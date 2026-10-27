import React, { useState } from 'react';
import { TrendingUp, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { formatCurrency } from '../../utils/formatters.js';

export const MonthlyCollectionChart = ({ data = [] }) => {
  const [activePointIndex, setActivePointIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl">
        <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Monthly Fee Collection
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-8 text-center text-xs text-slate-500 space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-700">No Monthly Collection Data</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Monthly collection trends and revenue charts will appear as soon as student fee receipts are recorded.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary metrics
  const totalPeriodCollection = data.reduce((acc, d) => acc + (d.totalAmount || 0), 0);
  const highestMonth = data.reduce((max, d) => (d.totalAmount > max.totalAmount ? d : max), data[0]);
  const averageMonth = data.length > 0 ? Math.round(totalPeriodCollection / data.length) : 0;
  const lastMonth = data[data.length - 1];

  // SVG dimensions & margins for compact card view
  const width = 500;
  const height = 160;
  const paddingLeft = 48;
  const paddingRight = 16;
  const paddingTop = 22;
  const paddingBottom = 28;

  const maxVal = Math.max(...data.map((d) => d.totalAmount || 0), 1000);
  const yCeil = Math.ceil(maxVal / 1000) * 1000 || 1000;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = data.map((d, idx) => {
    const x =
      data.length === 1
        ? paddingLeft + chartWidth / 2
        : paddingLeft + (idx / (data.length - 1)) * chartWidth;
    const y = paddingTop + (1 - (d.totalAmount || 0) / yCeil) * chartHeight;
    return { x, y, ...d, index: idx };
  });

  // Construct line path & area path
  let linePathD = '';
  let areaPathD = '';

  if (points.length === 1) {
    const p = points[0];
    linePathD = `M ${paddingLeft} ${p.y} L ${width - paddingRight} ${p.y}`;
    areaPathD = `M ${paddingLeft} ${height - paddingBottom} L ${paddingLeft} ${p.y} L ${width - paddingRight} ${p.y} L ${width - paddingRight} ${height - paddingBottom} Z`;
  } else {
    linePathD = points.reduce((acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    const firstP = points[0];
    const lastP = points[points.length - 1];
    areaPathD = `${linePathD} L ${lastP.x} ${height - paddingBottom} L ${firstP.x} ${height - paddingBottom} Z`;
  }

  // Y-axis grid ticks (3 levels)
  const yTicks = [0, 0.5, 1].map((pct) => {
    const val = Math.round(yCeil * pct);
    const y = paddingTop + (1 - pct) * chartHeight;
    return { val, y };
  });

  const activePoint = activePointIndex !== null ? points[activePointIndex] : points[points.length - 1];

  return (
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between">
      {/* Header */}
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/40 via-white to-slate-50/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Monthly Collection Trend
            </CardTitle>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Revenue inflow trajectory across the current academic year
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
          {lastMonth?.label?.toUpperCase() || 'CURRENT'}
        </span>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-5 space-y-4">
        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
          {/* Total Period */}
          <div className="p-1.5 sm:p-2.5 rounded-xl bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-100/80">
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-800 uppercase tracking-wider block truncate">
              Total Inflow
            </span>
            <span className="font-mono font-extrabold text-[11px] sm:text-sm text-emerald-900 block mt-0.5 truncate">
              {formatCurrency(totalPeriodCollection)}
            </span>
          </div>

          {/* Active / Selected Month */}
          <div className="p-1.5 sm:p-2.5 rounded-xl bg-gradient-to-br from-indigo-50/70 to-violet-50/30 border border-indigo-100/80">
            <span className="text-[9px] sm:text-[10px] font-bold text-indigo-800 uppercase tracking-wider block truncate">
              {activePoint ? `${activePoint.label}` : 'Selected'}
            </span>
            <span className="font-mono font-extrabold text-[11px] sm:text-sm text-indigo-900 block mt-0.5 truncate">
              {activePoint ? formatCurrency(activePoint.totalAmount) : '—'}
            </span>
          </div>

          {/* Peak Month */}
          <div className="p-1.5 sm:p-2.5 rounded-xl bg-gradient-to-br from-amber-50/70 to-orange-50/30 border border-amber-100/80">
            <span className="text-[9px] sm:text-[10px] font-bold text-amber-800 uppercase tracking-wider block truncate">
              Peak ({highestMonth?.label || '—'})
            </span>
            <span className="font-mono font-extrabold text-[11px] sm:text-sm text-amber-900 block mt-0.5 truncate">
              {formatCurrency(highestMonth?.totalAmount || 0)}
            </span>
          </div>
        </div>

        {/* SVG Line Chart Container */}
        <div className="w-full overflow-x-auto touch-pan-x pt-1">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            <defs>
              <linearGradient id="vibrantCollectionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
                <stop offset="60%" stopColor="#059669" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* Grid Lines */}
            {yTicks.map((t, idx) => (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={t.y}
                  x2={width - paddingRight}
                  y2={t.y}
                  stroke="#f1f5f9"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={t.y + 3.5}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono font-bold"
                >
                  {t.val >= 1000 ? `₹${Math.round(t.val / 1000)}k` : `₹${t.val}`}
                </text>
              </g>
            ))}

            {/* Area Fill */}
            <path d={areaPathD} fill="url(#vibrantCollectionGradient)" />

            {/* Line Path with Glow Filter */}
            <path
              d={linePathD}
              fill="none"
              stroke="#059669"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#emeraldGlow)"
            />

            {/* Data Points & Interactive Triggers */}
            {points.map((p, idx) => {
              const isActive = activePointIndex === idx || (activePointIndex === null && idx === points.length - 1);
              return (
                <g
                  key={idx}
                  className="cursor-pointer group"
                  onMouseEnter={() => setActivePointIndex(idx)}
                  onTouchStart={() => setActivePointIndex(idx)}
                  onPointerDown={() => setActivePointIndex(idx)}
                  onClick={() => setActivePointIndex(idx)}
                >
                  {/* Invisible Larger Touch Area for Mobile */}
                  <circle cx={p.x} cy={p.y} r="18" fill="transparent" />

                  {/* Outer Pulse Ring when Active */}
                  {isActive && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="7"
                      fill="#10b981"
                      fillOpacity="0.4"
                      className="animate-ping"
                    />
                  )}

                  {/* Data Point Dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? '5' : '3.5'}
                    fill={isActive ? '#047857' : '#10b981'}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="transition-all"
                  />

                  {/* X-axis Month Label */}
                  <text
                    x={p.x}
                    y={height - 8}
                    textAnchor="middle"
                    className={`text-[10px] font-semibold transition-colors ${
                      isActive ? 'fill-emerald-800 font-extrabold text-[11px]' : 'fill-slate-500 font-medium'
                    }`}
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyCollectionChart;
