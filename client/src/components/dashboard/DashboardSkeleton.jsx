import React from 'react';
import { Skeleton } from '../ui/Skeleton.jsx';

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header Skeleton */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="space-y-2">
          <Skeleton className="h-6 w-44 rounded-lg" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Primary 5 Metric Cards Skeleton (2 cols mobile, 3 cols tablet, 5 cols desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 space-y-3 shadow-2xs ${
              i === 4 ? 'col-span-2 md:col-span-2 lg:col-span-1' : ''
            }`}
          >
            <div className="flex justify-between items-start">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="h-6 sm:h-7 w-28 rounded" />
            <div className="pt-2 border-t border-slate-100 flex justify-between">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-10 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-2xs">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`h-11 sm:h-16 rounded-xl ${i === 6 ? 'col-span-2 sm:col-span-1' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Daily Cashflow Skeleton */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-8 w-48 rounded" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>

      {/* Chart & Needs Attention Row Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-4 shadow-2xs">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-40 w-full rounded" />
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-3 shadow-2xs">
          <Skeleton className="h-5 w-40 rounded" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </div>

      {/* Recent Activity Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-3 shadow-2xs">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-3 shadow-2xs">
          <Skeleton className="h-5 w-44 rounded" />
          <Skeleton className="h-36 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
};

