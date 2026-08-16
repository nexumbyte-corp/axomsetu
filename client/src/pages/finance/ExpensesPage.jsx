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
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';
import {
  Plus,
  Search,
  FileSpreadsheet,
  Settings,
  XCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const ExpensesPage = () => {
  const { selectedYearId } = useAcademicYear();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('ALL');
  const [paymentMode, setPaymentMode] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [cancelModalExpense, setCancelModalExpense] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  // Add Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    categoryId: '',
    expenseDate: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMode: 'BANK_TRANSFER',
    referenceNumber: '',
    description: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Add/Manage Category Form State
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [catLoading, setCatLoading] = useState(false);

  const fetchExpenses = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        ...(selectedYearId && { academicYearId: selectedYearId }),
        ...(search && { search }),
        ...(categoryId !== 'ALL' && { categoryId }),
        ...(paymentMode !== 'ALL' && { paymentMode }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };

      const [expRes, catRes] = await Promise.all([
        financeService.getExpenses(params),
        financeService.getExpenseCategories({ includeInactive: 'true' }),
      ]);

      setExpenses(expRes.data?.expenses || []);
      setPagination(expRes.data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });
      setCategories(catRes.data || []);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses(1);
  }, [selectedYearId, categoryId, paymentMode, startDate, endDate]);

  const handleCreateExpense = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!expenseForm.categoryId) {
      setFormError('Please select an expense category');
      return;
    }
    const amt = parseFloat(expenseForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Expense amount must be greater than zero');
      return;
    }

    setFormLoading(true);
    try {
      await financeService.createExpense({
        ...expenseForm,
        ...(selectedYearId && { academicYearId: selectedYearId }),
      });
      setIsAddModalOpen(false);
      setExpenseForm({
        categoryId: '',
        expenseDate: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMode: 'BANK_TRANSFER',
        referenceNumber: '',
        description: '',
      });
      fetchExpenses(1);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to record expense');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCancelExpense = async () => {
    if (!cancelModalExpense) return;
    setFormLoading(true);
    try {
      await financeService.cancelExpense(cancelModalExpense.id, { reason: cancelReason });
      setCancelModalExpense(null);
      setCancelReason('');
      fetchExpenses(pagination.page);
    } catch (err) {
      console.error('Failed to cancel expense:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    setCatLoading(true);
    try {
      await financeService.createExpenseCategory(categoryForm);
      setCategoryForm({ name: '', description: '' });
      const catRes = await financeService.getExpenseCategories({ includeInactive: 'true' });
      setCategories(catRes.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create category');
    } finally {
      setCatLoading(false);
    }
  };

  const handleToggleCatStatus = async (catId, currentStatus) => {
    try {
      await financeService.toggleExpenseCategoryStatus(catId, !currentStatus);
      const catRes = await financeService.getExpenseCategories({ includeInactive: 'true' });
      setCategories(catRes.data || []);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update category status');
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const { user } = useAuth();
  const schoolHeader = user?.schoolAdmins?.[0]?.school || {};



  const activeCategories = categories.filter((c) => c.isActive);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">School Expenses</h2>
          <p className="text-xs text-slate-500">Record, track, and manage school expenditures and category ledgers</p>
        </div>

        <div className="flex items-center gap-2.5">
          <DocumentActions
            templateId="expenseReport"
            data={{ schoolHeader, expenses }}
            filename="School_Expense_Report.pdf"
            title="School Expenditure Report"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoriesModalOpen(true)}
            icon={Settings}
          >
            Manage Categories
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            icon={Plus}
          >
            + Add Expense
          </Button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Select
          label="Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={[
            { label: 'All Categories', value: 'ALL' },
            ...categories.map((c) => ({ label: c.name, value: c.id })),
          ]}
        />

        <Select
          label="Payment Mode"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
          options={[
            { label: 'All Modes', value: 'ALL' },
            { label: 'Cash', value: 'CASH' },
            { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
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
              placeholder="Search description/ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchExpenses(1)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            title="No Expenses Found"
            description="No expense records match your current filter settings."
            icon={FileSpreadsheet}
          />
        ) : (
          <div className="table-responsive-wrapper">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Category</th>
                  <th className="p-3.5 whitespace-nowrap">Date</th>
                  <th className="p-3.5">Description & Reference</th>
                  <th className="p-3.5 whitespace-nowrap">Payment Mode</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Amount</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">
                      {exp.category?.name || 'Uncategorized'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-slate-600 font-mono">
                      {new Date(exp.expenseDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3.5 max-w-sm">
                      <div className="font-semibold text-slate-800 truncate">{exp.description || '-'}</div>
                      {exp.referenceNo && (
                        <span className="text-[10px] text-slate-400 font-mono">Ref: {exp.referenceNo}</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">{exp.paymentMode}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-rose-600 text-sm">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="p-3.5 text-center">
                      <Badge variant={exp.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                        {exp.status === 'ACTIVE' ? 'ACTIVE' : 'REVERSED'}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <DocumentActions
                          variant="minimal"
                          templateId="expenseVoucher"
                          data={{ expense: exp, schoolHeader }}
                          filename={`Expense_Voucher_${exp.expenseNo || exp.id}.pdf`}
                          title={`Expense Voucher #${exp.expenseNo || exp.id}`}
                        />
                        {exp.status === 'ACTIVE' && (
                          <button
                            onClick={() => setCancelModalExpense(exp)}
                            className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline"
                          >
                            Cancel / Reverse
                          </button>
                        )}
                      </div>
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
              onPageChange={(p) => fetchExpenses(p)}
            />
          </div>
        )}
      </div>

      {/* Add Expense Form Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add School Expense" size="md">
        <form onSubmit={handleCreateExpense} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg">
              {formError}
            </div>
          )}

          <Select
            label="Expense Category *"
            value={expenseForm.categoryId}
            onChange={(e) => setExpenseForm({ ...expenseForm, categoryId: e.target.value })}
            options={[
              { label: '-- Select Category --', value: '' },
              ...activeCategories.map((c) => ({ label: c.name, value: c.id })),
            ]}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date *"
              type="date"
              value={expenseForm.expenseDate}
              onChange={(e) => setExpenseForm({ ...expenseForm, expenseDate: e.target.value })}
              required
            />

            <Input
              label="Amount (₹) *"
              type="number"
              min="1"
              step="any"
              placeholder="e.g. 15000"
              value={expenseForm.amount}
              onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Payment Mode *"
              value={expenseForm.paymentMode}
              onChange={(e) => setExpenseForm({ ...expenseForm, paymentMode: e.target.value })}
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

            <Input
              label="Reference Number"
              placeholder="e.g. EB-2026-08"
              value={expenseForm.referenceNumber}
              onChange={(e) => setExpenseForm({ ...expenseForm, referenceNumber: e.target.value })}
            />
          </div>

          <Textarea
            label="Description / Purpose"
            placeholder="e.g. July electricity bill payment"
            rows={2}
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={formLoading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={formLoading}>
              {formLoading ? 'Recording Expense...' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal isOpen={isCategoriesModalOpen} onClose={() => setIsCategoriesModalOpen(false)} title="Manage Expense Categories" size="lg">
        <div className="space-y-5">
          {/* Add Category Form */}
          <form onSubmit={handleCreateCategory} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">+ Create New Category</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Category Name (e.g. Maintenance)"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                required
              />
              <Input
                placeholder="Description (Optional)"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm" loading={catLoading}>Add Category</Button>
            </div>
          </form>

          {/* Categories List */}
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
            {categories.map((cat) => (
              <div key={cat.id} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                <div>
                  <h5 className="text-xs font-bold text-slate-900">{cat.name}</h5>
                  {cat.description && <p className="text-[11px] text-slate-500">{cat.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-400 font-mono">{cat.expenseCount} expenses</span>
                  <Button
                    size="xs"
                    variant={cat.isActive ? 'outline' : 'secondary'}
                    onClick={() => handleToggleCatStatus(cat.id, cat.isActive)}
                  >
                    {cat.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Cancel / Reversal Confirmation Modal */}
      <Modal isOpen={Boolean(cancelModalExpense)} onClose={() => setCancelModalExpense(null)} title="Cancel & Reverse Expense" size="md">
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Immutable Ledger Safeguard</p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Financial history cannot be deleted. Cancelling will generate an opposite <span className="font-bold">CREDIT</span> reversal transaction in the ledger.
              </p>
            </div>
          </div>

          {cancelModalExpense && (
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <p><span className="font-bold text-slate-700">Category:</span> {cancelModalExpense.category?.name}</p>
              <p><span className="font-bold text-slate-700">Amount:</span> {formatCurrency(cancelModalExpense.amount)}</p>
              <p><span className="font-bold text-slate-700">Date:</span> {new Date(cancelModalExpense.expenseDate).toLocaleDateString('en-IN')}</p>
            </div>
          )}

          <Textarea
            label="Reason for Cancellation *"
            placeholder="e.g. Duplicate expense entry or vendor refund"
            rows={2}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setCancelModalExpense(null)} disabled={formLoading}>
              Go Back
            </Button>
            <Button variant="danger" onClick={handleCancelExpense} loading={formLoading}>
              {formLoading ? 'Cancelling...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
