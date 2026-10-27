import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Wallet, Users, ChevronRight, ArrowUpRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

const getInitials = (name = '') => {
  if (!name) return 'S';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

export const RecentFeeCollections = ({ collections = [] }) => {
  return (
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/40 via-white to-slate-50/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Recent Fee Collections
            </CardTitle>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Latest receipts verified across counters and online
            </p>
          </div>
        </div>
        <Link
          to="/app/fees/receipts"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 group"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {collections.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No fee collections recorded yet.
          </div>
        ) : (
          <>
            {/* Mobile View: Clean card list (<640px) */}
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-1">
              {collections.map((item) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                      {getInitials(item.studentName)}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.studentName}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="font-mono font-semibold text-slate-600">#{item.receiptNo}</span>
                        <span>&bull;</span>
                        <span>{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-mono font-extrabold text-xs text-emerald-800">
                      {formatCurrency(item.amount)}
                    </div>
                    <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                      {item.paymentMode}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Clean Table (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-mono">Date</th>
                    <th className="py-2.5 px-4 font-mono">Receipt</th>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-center">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {collections.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">{formatDate(item.date)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono text-slate-900 font-bold">
                        #{item.receiptNo}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {getInitials(item.studentName)}
                          </div>
                          <span>{item.studentName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono font-extrabold text-emerald-800">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {item.paymentMode}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const RecentExpenses = ({ expenses = [] }) => {
  return (
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50/40 via-white to-slate-50/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-xs shadow-rose-500/20">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Recent Expenses
            </CardTitle>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Latest school operational payments and vouchers
            </p>
          </div>
        </div>
        <Link
          to="/app/finance/expenses"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 group"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No expenses recorded yet.
          </div>
        ) : (
          <>
            {/* Mobile View: Clean card list (<640px) */}
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-1">
              {expenses.map((item) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl transition-colors">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.categoryName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.description}
                    </p>
                    <span className="text-[10px] text-slate-400 block font-mono">{formatDate(item.date)}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-extrabold text-xs text-rose-700">
                      {formatCurrency(item.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Clean Table (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-mono">Date</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {expenses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">{formatDate(item.date)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-bold text-slate-900">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
                          {item.categoryName}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 truncate max-w-[200px] text-slate-600 font-medium">{item.description}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono font-extrabold text-rose-700">
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export const RecentSalaryPayments = ({ payments = [] }) => {
  return (
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden flex flex-col justify-between">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-violet-50/40 via-white to-slate-50/40">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-purple-600 text-white flex items-center justify-center shadow-xs shadow-violet-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Recent Salary Payments
            </CardTitle>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Staff payroll disbursements and salary receipts
            </p>
          </div>
        </div>
        <Link
          to="/app/staff/payments"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 group"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No salary disbursements recorded yet.
          </div>
        ) : (
          <>
            {/* Mobile View: Clean card list (<640px) */}
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-1">
              {payments.map((item) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 rounded-xl transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-violet-500 to-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                      {getInitials(item.staffName)}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.staffName}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-600">{item.month}</span>
                        <span>&bull;</span>
                        <span className="font-mono">{formatDate(item.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-mono font-extrabold text-xs text-slate-900">
                      {formatCurrency(item.amount)}
                    </div>
                    <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.status || 'PAID'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Clean Table (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-mono">Date</th>
                    <th className="py-2.5 px-4">Staff Member</th>
                    <th className="py-2.5 px-4">Payroll Month</th>
                    <th className="py-2.5 px-4 text-right">Net Disbursed</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {payments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">{formatDate(item.date)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-500 to-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {getInitials(item.staffName)}
                          </div>
                          <span>{item.staffName}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-700 font-semibold">{item.month}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono font-extrabold text-slate-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {item.status || 'PAID'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default { RecentFeeCollections, RecentExpenses, RecentSalaryPayments };
