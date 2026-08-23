import React from 'react';
import { NavLink } from 'react-router-dom';
import { Users, CreditCard, CalendarCheck, HandCoins, DollarSign, History } from 'lucide-react';

export const StaffSubNav = () => {
  const tabs = [
    { label: 'Staff List', path: '/app/staff', icon: Users, end: true },
    { label: 'Salary Payments', path: '/app/staff/payments', icon: CreditCard },
    { label: 'Salary Preparation', path: '/app/payroll', icon: CalendarCheck },
    { label: 'Advances', path: '/app/staff/advances', icon: HandCoins },
    { label: 'Salary Setup', path: '/app/staff/salary', icon: DollarSign },
    { label: 'History & Slips', path: '/app/staff/history', icon: History },
  ];

  return (
    <div className="bg-white border-b border-slate-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-6 overflow-x-auto no-scrollbar">
      <nav className="flex space-x-1 sm:space-x-4 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 py-3 px-3 border-b-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};
