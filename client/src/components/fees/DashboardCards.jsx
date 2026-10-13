import React from 'react';
import { DollarSign, Calendar, AlertCircle, FileCheck } from 'lucide-react';

export const DashboardCards = ({ summary = {}, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 sm:h-22 bg-white rounded-xl border border-slate-200/80 p-3 sm:p-3.5 animate-pulse flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-16 sm:w-20 bg-slate-100 rounded" />
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-slate-100 rounded-lg" />
            </div>
            <div>
              <div className="h-4 sm:h-5 w-20 sm:w-28 bg-slate-200/80 rounded" />
              <div className="h-2.5 sm:h-3 w-14 sm:w-20 bg-slate-100 rounded mt-1.5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const {
    todayCollection = 0,
    monthCollection = 0,
    outstanding = 0,
    totalReceipts = 0,
    studentsPaidToday = 0,
    studentsWithDue = 0,
  } = summary;

  const cards = [
    {
      title: "Today's Collection",
      value: `₹${todayCollection.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      subtitle: `${studentsPaidToday} paid today`,
      icon: DollarSign,
      iconColor: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Monthly Collection',
      value: `₹${monthCollection.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      subtitle: 'This calendar month',
      icon: Calendar,
      iconColor: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Outstanding Dues',
      value: `₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      subtitle: `${studentsWithDue} with dues`,
      icon: AlertCircle,
      iconColor: 'bg-rose-50 text-rose-600',
    },
    {
      title: 'Total Receipts',
      value: totalReceipts.toLocaleString('en-IN'),
      subtitle: 'Lifetime issued',
      icon: FileCheck,
      iconColor: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      {cards.map((card, idx) => {
        const IconComp = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all p-3 sm:p-3.5 flex flex-col justify-between min-w-0"
          >
            {/* Top row: Title and Icon */}
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <span className="text-[11px] sm:text-xs font-medium text-slate-500 truncate">
                {card.title}
              </span>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 ${card.iconColor}`}>
                <IconComp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>

            {/* Bottom row: Value and Subtitle */}
            <div>
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 font-mono tracking-tight truncate">
                {card.value}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-normal truncate mt-0.5">
                {card.subtitle}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardCards;
