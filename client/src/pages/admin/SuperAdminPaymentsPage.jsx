import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
} from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';

export const SuperAdminPaymentsPage = () => {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const fetchPayments = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      try {
        const params = { page, limit: pagination.limit };
        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;

        const res = await adminService.listPayments(params);
        if (res.success && res.data) {
          const list = res.data.items || res.data || [];
          setPayments(list);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        }
      } catch (err) {
        setToast({ type: 'danger', message: err.message || 'Failed to fetch platform payments' });
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, statusFilter]
  );

  useEffect(() => {
    fetchPayments(1);
  }, [search, statusFilter]);

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
      val || 0
    );

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
        title="Platform Payments Log"
        description="Centralized audit trail for all subscription payments, manual cash/bank records, and Razorpay transactions."
      />


      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row items-center gap-4 shadow-xs">
        <div className="w-full sm:flex-1">
          <Input
            placeholder="Search transaction reference, school code, or school name..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-56">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Payment Statuses</option>
            <option value="ACTIVE">PAID / SUCCESS</option>
            <option value="EXPIRED">EXPIRED</option>
            <option value="SUSPENDED">SUSPENDED</option>
          </Select>
        </div>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => fetchPayments(1)}>
          Refresh
        </Button>
      </div>

      {/* Payments Table */}
      {loading ? (
        <TableSkeleton rows={6} cols={7} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Reference / Txn ID</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                    No payment records matching criteria found.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p) => {
                  const isSuccess = p.status === 'ACTIVE' || p.paymentStatus === 'PAID' || p.status === 'SUCCESS';
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-slate-500 text-xs font-mono">
                        {new Date(p.paymentDate || p.createdAt || p.startDate).toLocaleDateString()}
                      </TableCell>

                      <TableCell className="font-bold text-slate-900">
                        {p.school?.name || p.schoolName || 'School Tenant'}
                        <span className="text-[10px] text-slate-400 font-mono block">
                          {p.school?.code || p.schoolCode}
                        </span>
                      </TableCell>

                      <TableCell className="font-semibold text-slate-700">
                        {p.planName || p.plan?.name || 'Subscription Plan'}
                      </TableCell>

                      <TableCell className="text-slate-600 font-medium text-xs">
                        {p.paymentMethod || p.paymentProvider || 'MANUAL'}
                      </TableCell>

                      <TableCell className="font-mono text-xs text-slate-600">
                        {p.transactionRef || p.referenceNumber || p.providerPaymentId || '-'}
                      </TableCell>

                      <TableCell className="text-right font-bold text-emerald-600 font-mono">
                        {formatCurrency(p.amount)}
                      </TableCell>

                      <TableCell className="text-right">
                        <Badge variant={isSuccess ? 'success' : 'neutral'}>
                          {isSuccess ? 'SUCCESS' : p.status || 'PENDING'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={(pg) => fetchPayments(pg)}
          />
        </div>
      )}
    </div>
  );
};
