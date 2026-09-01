import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, RefreshCw, Copy, Users } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService.js';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';

export const SuperAdminPlansPage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Delete Plan Confirmation State
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await subscriptionService.adminListPlans();
      if (res.success && res.data) {
        let list = res.data;
        if (statusFilter === 'ACTIVE') {
          list = list.filter((p) => p.isActive);
        } else if (statusFilter === 'INACTIVE') {
          list = list.filter((p) => !p.isActive);
        }
        setPlans(list);
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to fetch subscription plans' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleToggleStatus = async (plan) => {
    try {
      const res = await subscriptionService.adminTogglePlanStatus(plan.id, !plan.isActive);
      if (res.success) {
        setToast({ type: 'success', message: `Plan ${!plan.isActive ? 'activated' : 'deactivated'} successfully` });
        fetchPlans();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to update plan status' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPlan) return;
    setSubmittingDelete(true);
    try {
      const res = await subscriptionService.adminDeletePlan(deletingPlan.id);
      if (res.success) {
        setToast({ type: 'success', message: res.message || `Plan ${deletingPlan.name} deleted successfully.` });
        setDeletingPlan(null);
        fetchPlans();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to delete plan.' });
    } finally {
      setSubmittingDelete(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <ModulePageHeader
        title="Subscription Plans"
        description="Manage platform subscription tiers, student limits, pricing, and duplicate plans to create new variants."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => navigate('/admin/plans/new')}>
            Create Plan
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="w-full sm:w-64">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Plans Only</option>
            <option value="INACTIVE">Inactive Plans Only</option>
          </Select>
        </div>

        <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchPlans}>
          Refresh
        </Button>
      </div>

      {/* Plans Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={8} />
      ) : (
        <>
          <Table minWidth="min-w-[850px]">
          <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Billing Cycle</TableHead>
                <TableHead>Student Limit</TableHead>
                <TableHead>Trial Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    No plans found. Click "Create Plan" to define a subscription plan.
                  </TableCell>
                </TableRow>
              ) : (
                plans.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span>{p.name}</span>
                        {p.isEnterprise && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                            ENTERPRISE
                          </span>
                        )}
                        {p.isTrial && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                            TRIAL
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block">{p.code}</span>
                    </TableCell>

                    <TableCell className="font-bold text-slate-900 font-mono text-xs">
                      {formatCurrency(p.finalPrice)}
                      {p.basePrice > p.finalPrice && (
                        <span className="text-[10px] text-slate-400 line-through ml-1">
                          {formatCurrency(p.basePrice)}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-slate-700 text-xs font-semibold">
                      {p.type} ({p.durationValue} {p.durationUnit.toLowerCase()}{p.durationValue > 1 ? 's' : ''})
                    </TableCell>

                    <TableCell className="text-xs">
                      {p.maxStudentLimit ? (
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 font-mono">
                          <Users className="w-3 h-3 text-indigo-600" />
                          {p.maxStudentLimit} Active Students
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">
                          Unlimited
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs">
                      {p.isTrial ? (
                        <span className="text-amber-700 font-bold">Yes ({p.durationValue} {p.durationUnit.toLowerCase()})</span>
                      ) : (
                        <span className="text-slate-500">No</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={p.isActive ? 'success' : 'neutral'}>{p.isActive ? 'ACTIVE' : 'INACTIVE'}</Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Copy}
                          onClick={() => navigate('/admin/plans/new', { state: { copyPlan: p } })}
                          title="Copy Plan to Create New Variant with Student Limit"
                        >
                          Copy
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Edit2}
                          onClick={() => navigate(`/admin/plans/${p.id}/edit`)}
                          title="Edit Plan"
                        />
                        <Button
                          variant={p.isActive ? 'outline' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleStatus(p)}
                        >
                          {p.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Trash2}
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => setDeletingPlan(p)}
                          title="Delete Plan"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </>
      )}

      {/* Delete Confirmation Step Modal */}
      <ConfirmDialog
        isOpen={Boolean(deletingPlan)}
        onClose={() => setDeletingPlan(null)}
        onConfirm={handleDeleteConfirm}
        title={`Delete Plan — ${deletingPlan?.name}`}
        message={`Are you sure you want to delete the plan '${deletingPlan?.name}'? Unused plans can be safely removed.`}
        confirmText="Delete Plan"
        loading={submittingDelete}
        loadingText="Deleting plan..."
      />
    </div>
  );
};
