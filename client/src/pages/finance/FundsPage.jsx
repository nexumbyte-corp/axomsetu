import React, { useState, useEffect } from 'react';
import { financeService } from '../../services/financeService.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { printPdfDocument } from '../../core/documents/documentEngine.js';
import {
  Plus,
  Search,
  PiggyBank,
  Settings,
  AlertTriangle,
  Landmark,
  Printer,
} from 'lucide-react';

export const FundsPage = () => {
  const { selectedYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [funds, setFunds] = useState([]);
  const [sources, setSources] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [fundSourceId, setFundSourceId] = useState('ALL');
  const [paymentMode, setPaymentMode] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [cancelModalFund, setCancelModalFund] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Add Fund Form State
  const [fundForm, setFundForm] = useState({
    fundSourceId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'BANK_TRANSFER',
    referenceNumber: '',
    remarks: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Manage Source Form State
  const [sourceForm, setSourceForm] = useState({ name: '', description: '' });
  const [srcLoading, setSrcLoading] = useState(false);

  const fetchFunds = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        ...(selectedYearId && { academicYearId: selectedYearId }),
        ...(search && { search }),
        ...(fundSourceId !== 'ALL' && { fundSourceId }),
        ...(paymentMode !== 'ALL' && { paymentMode }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };

      const [fundsRes, srcRes] = await Promise.all([
        financeService.getFunds(params),
        financeService.getFundSources({ includeInactive: 'true' }),
      ]);

      setFunds(fundsRes.data?.funds || []);
      setPagination(fundsRes.data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
      setSources(srcRes.data || []);
    } catch (err) {
      console.error('Failed to fetch funds:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunds(1);
  }, [selectedYearId, fundSourceId, paymentMode, startDate, endDate]);

  const handleAddFund = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!fundForm.fundSourceId) {
      setFormError('Please select a fund source');
      return;
    }
    const amt = parseFloat(fundForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Fund amount must be greater than zero');
      return;
    }

    setFormLoading(true);
    try {
      await financeService.addFund({
        ...fundForm,
        ...(selectedYearId && { academicYearId: selectedYearId }),
      });
      setIsAddModalOpen(false);
      setFundForm({
        fundSourceId: '',
        transactionDate: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMode: 'BANK_TRANSFER',
        referenceNumber: '',
        remarks: '',
      });
      fetchFunds(1);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to add fund');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelFund = async () => {
    if (!cancelModalFund) return;
    setFormLoading(true);
    try {
      await financeService.cancelFund(cancelModalFund.id, { reason: cancelReason });
      setCancelModalFund(null);
      setCancelReason('');
      fetchFunds(pagination.page);
    } catch (err) {
      console.error('Failed to cancel fund transaction:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateSource = async (e) => {
    e.preventDefault();
    if (!sourceForm.name.trim()) return;
    setSrcLoading(true);
    try {
      await financeService.createFundSource(sourceForm);
      setSourceForm({ name: '', description: '' });
      const srcRes = await financeService.getFundSources({ includeInactive: 'true' });
      setSources(srcRes.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create fund source');
    } finally {
      setSrcLoading(false);
    }
  };

  const handleToggleSrcStatus = async (srcId, currentStatus) => {
    try {
      await financeService.toggleFundSourceStatus(srcId, !currentStatus);
      const srcRes = await financeService.getFundSources({ includeInactive: 'true' });
      setSources(srcRes.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update source status');
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const { user } = useAuth();
  const schoolHeader = user?.schoolAdmins?.[0]?.school || {};

  const handlePrintFunds = async () => {
    try {
      await printPdfDocument({
        templateId: 'fundReport',
        data: {
          schoolHeader,
          funds,
        },
      });
    } catch (err) {
      console.error('Failed to print funds report:', err);
    }
  };

  const activeSources = sources.filter((s) => s.isActive);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Fund Management</h2>
          <p className="text-xs text-slate-500">Record owner contributions, grants, and capital fund infusions</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrintFunds}
            icon={Printer}
          >
            Print Funds
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSourcesModalOpen(true)}
            icon={Settings}
          >
            Manage Fund Sources
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={Plus}
          >
            + Add Fund
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        <Select
          label="Fund Source"
          value={fundSourceId}
          onChange={(e) => setFundSourceId(e.target.value)}
          options={[
            { label: 'All Fund Sources', value: 'ALL' },
            ...sources.map((s) => ({ label: s.name, value: s.id })),
          ]}
        />

        <Select
          label="Payment Mode"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          options={[
            { label: 'All Modes', value: 'ALL' },
            { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
            { label: 'Cash', value: 'CASH' },
            { label: 'UPI', value: 'UPI' },
            { label: 'Cheque', value: 'CHEQUE' },
            { label: 'Demand Draft', value: 'DEMAND_DRAFT' },
            { label: 'Other', value: 'OTHER' },
          ]}
        />

        <Input
          label="From Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <Input
          label="To Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <div className="flex items-end">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search remarks/ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchFunds(1)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {/* Funds Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : funds.length === 0 ? (
          <EmptyState
            title="No Fund Contributions Found"
            description="No fund additions match your current search query or filter selection."
            icon={PiggyBank}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Fund Source</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Remarks & Reference</th>
                  <th className="p-3.5">Payment Mode</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {funds.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      {f.fundSource?.name || 'General Fund'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600 font-mono">
                      {new Date(f.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3.5 max-w-sm">
                      <div className="font-semibold text-slate-800 truncate">{f.remarks || '-'}</div>
                      {f.referenceNumber && (
                        <span className="text-[10px] text-slate-400 font-mono">Ref: {f.referenceNumber}</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">{f.paymentMode}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-emerald-600 text-sm">
                      +{formatCurrency(f.amount)}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant={f.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                        {f.status === 'ACTIVE' ? 'ACTIVE' : 'REVERSED'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      {f.status === 'ACTIVE' && (
                        <button
                          onClick={() => setCancelModalFund(f)}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                        >
                          Cancel / Reverse
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex justify-end">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => fetchFunds(p)}
            />
          </div>
        )}
      </div>

      {/* Add Fund Form Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Fund Contribution" size="md">
        <form onSubmit={handleAddFund} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date *"
              type="date"
              value={fundForm.transactionDate}
              onChange={(e) => setFundForm({ ...fundForm, transactionDate: e.target.value })}
              required
            />

            <Input
              label="Amount (₹) *"
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 100000"
              value={fundForm.amount}
              onChange={(e) => setFundForm({ ...fundForm, amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Fund Source *"
              value={fundForm.fundSourceId}
              onChange={(e) => setFundForm({ ...fundForm, fundSourceId: e.target.value })}
              options={[
                { label: '-- Select Fund Source --', value: '' },
                ...activeSources.map((s) => ({ label: s.name, value: s.id })),
              ]}
              required
            />

            <Select
              label="Payment Mode *"
              value={fundForm.paymentMode}
              onChange={(e) => setFundForm({ ...fundForm, paymentMode: e.target.value })}
              options={[
                { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
                { label: 'Cash', value: 'CASH' },
                { label: 'UPI', value: 'UPI' },
                { label: 'Cheque', value: 'CHEQUE' },
                { label: 'Demand Draft', value: 'DEMAND_DRAFT' },
                { label: 'Other', value: 'OTHER' },
              ]}
              required
            />
          </div>

          <Input
            label="Reference Number"
            placeholder="e.g. TXN12345"
            value={fundForm.referenceNumber}
            onChange={(e) => setFundForm({ ...fundForm, referenceNumber: e.target.value })}
          />

          <Textarea
            label="Remarks / Note"
            placeholder="e.g. Initial school operating fund contribution"
            rows={2}
            value={fundForm.remarks}
            onChange={(e) => setFundForm({ ...fundForm, remarks: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formLoading}>
              {formLoading ? 'Adding Fund...' : 'Add Fund'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Fund Sources Management Modal */}
      <Modal isOpen={isSourcesModalOpen} onClose={() => setIsSourcesModalOpen(false)} title="Manage Fund Sources" size="lg">
        <div className="space-y-5">
          {/* Create Source Form */}
          <form onSubmit={handleCreateSource} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">+ Create New Fund Source</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Source Name (e.g. Management Grant)"
                value={sourceForm.name}
                onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                required
              />
              <Input
                placeholder="Description (Optional)"
                value={sourceForm.description}
                onChange={(e) => setSourceForm({ ...sourceForm, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={srcLoading}>Add Source</Button>
            </div>
          </form>

          {/* Sources List */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
            {sources.map((src) => (
              <div key={src.id} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                <div>
                  <h5 className="text-xs font-bold text-slate-900">{src.name}</h5>
                  {src.description && <p className="text-[11px] text-slate-500">{src.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-mono">{src.transactionCount} entries</span>
                  <Button
                    size="xs"
                    variant={src.isActive ? 'outline' : 'secondary'}
                    onClick={() => handleToggleSrcStatus(src.id, src.isActive)}
                  >
                    {src.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Cancel / Reversal Confirmation Modal */}
      <Modal isOpen={Boolean(cancelModalFund)} onClose={() => setCancelModalFund(null)} title="Cancel & Reverse Fund Addition" size="md">
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Immutable Ledger Safeguard</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Financial history cannot be deleted. Cancelling will generate an opposite <span className="font-bold">DEBIT</span> reversal transaction in the ledger.
              </p>
            </div>
          </div>

          {cancelModalFund && (
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p><span className="font-bold text-slate-700">Source:</span> {cancelModalFund.fundSource?.name}</p>
              <p><span className="font-bold text-slate-700">Amount:</span> {formatCurrency(cancelModalFund.amount)}</p>
              <p><span className="font-bold text-slate-700">Date:</span> {new Date(cancelModalFund.transactionDate).toLocaleDateString('en-IN')}</p>
            </div>
          )}

          <Textarea
            label="Reason for Cancellation *"
            placeholder="e.g. Incorrect amount entered or bank transaction failed"
            rows={2}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setCancelModalFund(null)} disabled={formLoading}>
              Go Back
            </Button>
            <Button variant="danger" onClick={handleCancelFund} loading={formLoading}>
              {formLoading ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
