import React from 'react';
import { DollarSign, Calendar, AlertCircle, FileCheck } from 'lucide-react';

export const DashboardCards = ({ summary = {}, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 p-3 animate-pulse" />
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
      subtitle: `${studentsPaidToday} students paid today`,
      icon: DollarSign,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      title: 'Monthly Collection',
      value: `₹${monthCollection.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      subtitle: 'This calendar month',
      icon: Calendar,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    },
    {
      title: 'Outstanding Fees',
      value: `₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      subtitle: `${studentsWithDue} students with dues`,
      icon: AlertCircle,
      color: 'bg-rose-50 text-rose-600 border-rose-200',
    },
    {
      title: "Total Receipts",
      value: totalReceipts.toString(),
      subtitle: 'Lifetime processed receipts',
      icon: FileCheck,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {cards.map((card, idx) => {
        const IconComp = card.icon;
        return (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex items-center justify-between gap-3 transition-all hover:shadow-xs"
          >
            <div>
              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">{card.title}</span>
              <h3 className="text-base font-extrabold text-slate-900 font-mono mt-0.5">{card.value}</h3>
              <p className="text-[10px] text-slate-400 font-medium">{card.subtitle}</p>
            </div>

            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${card.color}`}>
              <IconComp className="w-4 h-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardCards;
