import React, { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { DashboardCards } from '../../components/fees/DashboardCards.jsx';
import { ReceiptTable } from '../../components/fees/ReceiptTable.jsx';
import { usePaymentsList, useDashboardSummary } from '../../hooks/usePaymentEngine.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { Pagination } from '../../components/ui/Pagination.jsx';

export const ReceiptsListPage = () => {
  const { selectedYearId } = useAcademicYear();
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const queryParams = {
    page,
    limit: 10,
    ...(searchTerm && { search: searchTerm.trim() }),
    ...(selectedYearId && { academicYearId: selectedYearId }),
    ...(paymentMode && { paymentMode }),
    ...(status && { status }),
  };

  const { data: dashboardRes, isLoading: isLoadingDashboard } = useDashboardSummary({
    ...(selectedYearId && { academicYearId: selectedYearId }),
  });
  const { data: paymentsRes, isLoading: isLoadingPayments, refetch } = usePaymentsList(queryParams);

  const dashboardSummary = dashboardRes?.data || dashboardRes || {};
  const payments = paymentsRes?.data || paymentsRes?.payments || [];
  const pagination = paymentsRes?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6">
      {/* Top Financial Metric Dashboard Cards */}
      <DashboardCards summary={dashboardSummary} isLoading={isLoadingDashboard} />

      {/* Main Receipts Header & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Receipts & Payment History</h2>
            <p className="text-xs text-slate-500">
              Instant search, filter by payment mode, status, and view detailed cashier receipt breakdowns.
            </p>
          </div>

          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search Receipt No, Student Name, Admission No, Phone..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
            />
          </div>

          {/* Payment Mode Filter */}
          <div>
            <select
              value={paymentMode}
              onChange={(e) => {
                setPaymentMode(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
            >
              <option value="">All Payment Modes</option>
              <option value="CASH">💵 CASH</option>
              <option value="UPI">📱 UPI / QR</option>
              <option value="BANK_TRANSFER">🏦 BANK TRANSFER</option>
              <option value="CHEQUE">📑 CHEQUE</option>
              <option value="DEMAND_DRAFT">📄 DEMAND DRAFT</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="VOID">VOID</option>
            </select>
          </div>
        </div>
      </div>

      {/* Receipts Business Table */}
      <ReceiptTable payments={payments} isLoading={isLoadingPayments} />

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-end pt-2">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}
    </div>
  );
};

export default ReceiptsListPage;
