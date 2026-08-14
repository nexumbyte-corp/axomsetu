import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { adminService } from '../../../services/adminService.js';
import { ModulePageHeader } from '../../../components/ui/ModulePageHeader.jsx';
import { Spinner } from '../../../components/ui/Spinner.jsx';
import { Toast } from '../../../components/ui/Toast.jsx';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../../components/ui/Table.jsx';
import { Input } from '../../../components/ui/Input.jsx';
import { Select } from '../../../components/ui/Select.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Badge } from '../../../components/ui/Badge.jsx';

export const SuperAdminRevenueReportPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (paymentMethod) params.paymentMethod = paymentMethod;

      const res = await adminService.getRevenueReport(params);
      setData(res.data);
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to fetch revenue report' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      val || 0
    );

  const {
    totalRevenue = 0,
    totalTransactions = 0,
    ytdRevenue = 0,
    currentMonthRevenue = 0,
    previousMonthRevenue = 0,
    breakdown = {},
    recentTransactions = [],
  } = data || {};

  const { byPlan = {}, byPaymentMethod = {} } = breakdown;

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <ModulePageHeader
        title="Platform Revenue Report"
        description="Detailed revenue recognition, payment method distributions, and historical subscription collections."
      />

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center gap-4 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            type="date"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            type="date"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="">All Methods</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CARD">Card</option>
          </Select>
        </div>
        <div className="flex items-center gap-2 self-end">
          <Button variant="primary" size="sm" icon={Filter} onClick={fetchReport}>
            Apply Filters
          </Button>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchReport}>
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" label="Loading revenue report..." />
        </div>
      ) : (

        <div className="space-y-6">
          {/* Revenue KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Subscription Revenue</span>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(totalRevenue)}</h3>
              <p className="text-[11px] text-slate-400 mt-2">{totalTransactions} successful transactions</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Year-To-Date (YTD) Revenue</span>
              <h3 className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(ytdRevenue)}</h3>
              <p className="text-[11px] text-slate-400 mt-2">Current calendar year</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Current Month Revenue</span>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(currentMonthRevenue)}</h3>
              <p className="text-[11px] text-slate-400 mt-2">Month to date</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Previous Month Revenue</span>
              <h3 className="text-2xl font-bold text-slate-700 mt-1">{formatCurrency(previousMonthRevenue)}</h3>
              <p className="text-[11px] text-slate-400 mt-2">Completed previous month</p>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue by Plan */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Revenue Breakdown by Subscription Plan
              </h3>
              {Object.keys(byPlan).length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No breakdown data available.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(byPlan).map(([planName, amount]) => (
                    <div key={planName} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <span className="text-xs font-bold text-slate-900">{planName}</span>
                      <span className="text-xs font-bold text-indigo-600">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revenue by Payment Method */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Revenue Breakdown by Payment Method
              </h3>
              {Object.keys(byPaymentMethod).length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No method breakdown data available.</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(byPaymentMethod).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <span className="text-xs font-bold text-slate-900">{method}</span>
                      <span className="text-xs font-bold text-emerald-600">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Revenue Transactions */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Recent Successful Subscription Transactions
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-xs font-mono text-slate-500">
                      {new Date(tx.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">{tx.schoolName}</TableCell>
                    <TableCell className="text-slate-700 font-semibold">{tx.planName}</TableCell>
                    <TableCell className="text-slate-600">{tx.paymentMethod}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{tx.transactionRef}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600 font-mono">
                      {formatCurrency(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};
