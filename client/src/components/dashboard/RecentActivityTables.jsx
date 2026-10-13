import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Wallet, Users, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export const RecentFeeCollections = ({ collections = [] }) => {
  return (
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-xl sm:rounded-2xl">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            Recent Fee Collections
          </CardTitle>
        </div>
        <Link
          to="/app/fees/receipts"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 group"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {collections.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No fee collections recorded yet.
          </div>
        ) : (
          <>
            {/* Mobile View: Clean card list (<640px) */}
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-1">
              {collections.map((item) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 rounded-lg">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.studentName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-mono text-slate-500">#{item.receiptNo}</span>
                      <span>&bull;</span>
                      <span>{formatDate(item.date)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-mono font-bold text-xs text-emerald-700">
                      {formatCurrency(item.amount)}
                    </div>
                    <Badge variant="neutral" size="sm" className="text-[9px] py-0 px-1.5">
                      {item.paymentMode}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Clean Table (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Receipt</th>
                    <th className="py-2.5 px-4">Student</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-center">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {collections.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">{formatDate(item.date)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-mono text-slate-900 font-semibold">
                        {item.receiptNo}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-slate-900">{item.studentName}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono font-bold text-emerald-700">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-center">
                        <Badge variant="neutral" size="sm" className="text-[10px]">
                          {item.paymentMode}
                        </Badge>
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
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-xl sm:rounded-2xl">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            Recent Expenses
          </CardTitle>
        </div>
        <Link
          to="/app/finance/expenses"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 group"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {expenses.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No expenses recorded yet.
          </div>
        ) : (
          <>
            {/* Mobile View: Clean card list (<640px) */}
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-1">
              {expenses.map((item) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 rounded-lg">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.categoryName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {item.description}
                    </p>
                    <span className="text-[10px] text-slate-400 block">{formatDate(item.date)}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-xs text-rose-600">
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
                  <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Description</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {expenses.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">{formatDate(item.date)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-slate-800">{item.categoryName}</td>
                      <td className="py-2.5 px-4 truncate max-w-[200px] text-slate-600">{item.description}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono font-bold text-rose-600">
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
    <Card className="border-slate-200/80 bg-white shadow-2xs rounded-xl sm:rounded-2xl">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-3.5 h-3.5" />
          </div>
          <CardTitle className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
            Recent Salary Payments
          </CardTitle>
        </div>
        <Link
          to="/app/staff/payments"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-0.5 group"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {payments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No salary disbursements recorded yet.
          </div>
        ) : (
          <>
            {/* Mobile View: Clean card list (<640px) */}
            <div className="sm:hidden divide-y divide-slate-100 p-2 space-y-1">
              {payments.map((item) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 rounded-lg">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {item.staffName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span>{item.month}</span>
                      <span>&bull;</span>
                      <span>{formatDate(item.date)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <div className="font-mono font-bold text-xs text-slate-900">
                      {formatCurrency(item.amount)}
                    </div>
                    <Badge variant="success" size="sm" className="text-[9px] py-0 px-1.5">
                      {item.status || 'PAID'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View: Clean Table (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100 text-slate-400 font-semibold text-[11px]">
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Staff</th>
                    <th className="py-2.5 px-4">Month</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {payments.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">{formatDate(item.date)}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap font-semibold text-slate-900">{item.staffName}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">{item.month}</td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap text-center">
                        <Badge variant="success" size="sm" className="text-[10px]">
                          {item.status || 'PAID'}
                        </Badge>
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

