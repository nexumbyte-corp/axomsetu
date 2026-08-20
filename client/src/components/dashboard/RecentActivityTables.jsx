import React from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Wallet, Users, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card.jsx';
import { Badge } from '../ui/Badge.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export const RecentFeeCollections = ({ collections = [] }) => {
  return (
    <Card className="border-slate-200 bg-white shadow-2xs">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <CardTitle className="text-sm font-bold text-slate-900">Recent Fee Collections</CardTitle>
        </div>
        <Link
          to="/app/fees/receipts"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        {collections.length === 0 ? (
          <div className="p-5 text-center text-xs text-slate-500">No recent fee collections.</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
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
                    <Badge variant="neutral" size="sm">
                      {item.paymentMode}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};

export const RecentExpenses = ({ expenses = [] }) => {
  return (
    <Card className="border-slate-200 bg-white shadow-2xs">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-rose-600" />
          <CardTitle className="text-sm font-bold text-slate-900">Recent Expenses</CardTitle>
        </div>
        <Link
          to="/app/finance/expenses"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        {expenses.length === 0 ? (
          <div className="p-5 text-center text-xs text-slate-500">No recent expenses recorded.</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
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
                  <td className="py-2.5 px-4 truncate max-w-[180px] text-slate-600">{item.description}</td>
                  <td className="py-2.5 px-4 whitespace-nowrap text-right font-mono font-bold text-rose-600">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};

export const RecentSalaryPayments = ({ payments = [] }) => {
  return (
    <Card className="border-slate-200 bg-white shadow-2xs">
      <CardHeader className="py-3 px-4 sm:px-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-600" />
          <CardTitle className="text-sm font-bold text-slate-900">Recent Salary Payments</CardTitle>
        </div>
        <Link
          to="/app/staff/payments"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-0 overflow-x-auto">
        {payments.length === 0 ? (
          <div className="p-5 text-center text-xs text-slate-500">No recent salary payments.</div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
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
                    <Badge variant="success" size="sm">
                      {item.status || 'PAID'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};
