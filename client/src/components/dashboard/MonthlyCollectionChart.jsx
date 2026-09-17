import React, { useState } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { formatCurrency } from '../../utils/formatters.js';

export const MonthlyCollectionChart = ({ data = [] }) => {
  const [activePointIndex, setActivePointIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <Card className="border-slate-200 bg-white shadow-2xs rounded-xl">
        <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Monthly Collection
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 text-center text-xs text-slate-500 space-y-1">
          <AlertCircle className="w-5 h-5 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700">No Monthly Collection Data</p>
          <p className="text-[11px] text-slate-400">Monthly stats will appear when payments are recorded.</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary metrics
  const totalPeriodCollection = data.reduce((acc, d) => acc + (d.totalAmount || 0), 0);
  const highestMonth = data.reduce((max, d) => (d.totalAmount > max.totalAmount ? d : max), data[0]);
  const lastMonth = data[data.length - 1];

  // SVG dimensions & margins for compact card view
  const width = 500;
  const height = 150;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 20;
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
    <Card className="border-slate-200 bg-white shadow-2xs rounded-xl overflow-hidden">
      {/* Header */}
      <CardHeader className="py-2.5 px-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Monthly Collection
          </CardTitle>
        </div>
        <Badge variant="success" size="sm" className="text-[10px] py-0">
          UP TO {lastMonth?.label?.toUpperCase()}
        </Badge>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2.5">
        {/* Top Summary Row */}
        <div className="flex items-center justify-between text-xs px-1">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Period</span>
            <span className="font-mono font-bold text-emerald-700">{formatCurrency(totalPeriodCollection)}</span>
          </div>
          {activePoint ? (
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {activePoint.fullLabel || activePoint.label}
              </span>
              <span className="font-mono font-bold text-slate-900">{formatCurrency(activePoint.totalAmount)}</span>
            </div>
          ) : (
            highestMonth && (
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peak ({highestMonth.label})</span>
                <span className="font-mono font-bold text-slate-800">{formatCurrency(highestMonth.totalAmount)}</span>
              </div>
            )
          )}
        </div>

        {/* SVG Line Chart Container */}
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            <defs>
              <linearGradient id="compactCollectionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
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
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 6}
                  y={t.y + 3.5}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono font-medium"
                >
                  {t.val >= 1000 ? `₹${Math.round(t.val / 1000)}k` : `₹${t.val}`}
                </text>
              </g>
            ))}

            {/* Area Fill */}
            <path d={areaPathD} fill="url(#compactCollectionGradient)" />

            {/* Line Path */}
            <path
              d={linePathD}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points & Interactive Triggers */}
            {points.map((p, idx) => {
              const isActive = activePointIndex === idx || (activePointIndex === null && idx === points.length - 1);
              return (
                <g
                  key={idx}
                  className="cursor-pointer group"
                  onMouseEnter={() => setActivePointIndex(idx)}
                  onClick={() => setActivePointIndex(idx)}
                >
                  {/* Invisible Larger Touch Area */}
                  <circle cx={p.x} cy={p.y} r="12" fill="transparent" />

                  {/* Outer Pulse Ring when Active */}
                  {isActive && (
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="6"
                      fill="#10b981"
                      fillOpacity="0.3"
                      className="animate-ping"
                    />
                  )}

                  {/* Data Point Dot */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? '4.5' : '3'}
                    fill={isActive ? '#047857' : '#10b981'}
                    stroke="#ffffff"
                    strokeWidth="1.8"
                    className="transition-all"
                  />

                  {/* X-axis Month Label */}
                  <text
                    x={p.x}
                    y={height - 8}
                    textAnchor="middle"
                    className={`text-[10px] font-semibold transition-colors ${
                      isActive ? 'fill-slate-900 font-bold' : 'fill-slate-400'
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
