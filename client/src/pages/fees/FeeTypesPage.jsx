import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle, XCircle, Sliders } from 'lucide-react';
import { feeService } from '../../services/fee.service.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Textarea } from '../../components/ui/Textarea.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { toast } from '../../components/ui/Toast.jsx';

export const FeeTypesPage = () => {

  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    order: 0,
    category: 'ACADEMIC',
    billingRule: 'MONTHLY',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete State
  const [deletingType, setDeletingType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFeeTypes = async () => {
    setLoading(true);
    try {
      const res = await feeService.getFeeTypes({ search: searchQuery });
      setFeeTypes(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load fee types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFeeTypes();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenAddModal = () => {
    setEditingType(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      order: feeTypes.length,
      category: 'ACADEMIC',
      billingRule: 'MONTHLY',
      isActive: true,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingType(item);
    setFormData({
      name: item.name,
      code: item.code || '',
      description: item.description || '',
      order: item.order || 0,
      category: item.category || 'ACADEMIC',
      billingRule: item.billingRule || 'MONTHLY',
      isActive: item.isActive,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Fee type name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        description: formData.description.trim() || null,
        order: parseInt(formData.order, 10) || 0,
        category: formData.category,
        billingRule: formData.billingRule,
        isActive: formData.isActive,
      };

      if (editingType) {
        await feeService.updateFeeType(editingType.id, payload);
        toast.success('Fee type updated successfully');
      } else {
        await feeService.createFeeType(payload);
        toast.success('Fee type created successfully');
      }

      setIsModalOpen(false);
      fetchFeeTypes();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save fee type');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      await feeService.toggleFeeTypeStatus(item.id);
      toast.success(`Fee type '${item.name}' status updated`);
      fetchFeeTypes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingType) return;
    setIsDeleting(true);
    try {
      await feeService.deleteFeeType(deletingType.id);
      toast.success('Fee type deleted successfully');
      setDeletingType(null);
      fetchFeeTypes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete fee type');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderCategoryBadge = (category) => {
    return category === 'HOSTEL' ? (
      <Badge variant="info" size="sm">Hostel Fee</Badge>
    ) : (
      <Badge variant="primary" size="sm">Academic Fee</Badge>
    );
  };

  const renderBillingBadge = (rule) => {
    return rule === 'ONE_TIME_PER_ACADEMIC_YEAR' ? (
      <Badge variant="warning" size="sm">One Time per Academic Year</Badge>
    ) : (
      <Badge variant="neutral" size="sm">Monthly</Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            autoComplete="off"
            placeholder="Search fee types..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          />
        </div>

        <Button onClick={handleOpenAddModal} icon={Plus} size="sm">
          Add Fee Type
        </Button>
      </div>

      {/* Fee Types Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : feeTypes.length === 0 ? (
          <EmptyState
            icon={Sliders}
            title="No fee types found"
            description="Add academic fee types like Tuition Fee, Admission Fee, Examination Fee, etc."
            actionLabel="Add Fee Type"
            onAction={handleOpenAddModal}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Billing Rule</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {feeTypes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-500 font-semibold">{item.order}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{item.code || '-'}</td>
                    <td className="px-4 py-3">{renderCategoryBadge(item.category)}</td>
                    <td className="px-4 py-3">{renderBillingBadge(item.billingRule)}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">{item.description || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className="inline-flex items-center gap-1.5 focus:outline-none"
                        title="Click to toggle status"
                      >
                        {item.isActive ? (
                          <Badge variant="success" size="sm">
                            <CheckCircle className="w-3 h-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            <XCircle className="w-3 h-3 mr-1" /> Inactive
                          </Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Fee Type"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingType(item)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Fee Type"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Fee Type Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingType ? 'Edit Fee Type' : 'Add New Fee Type'}
        size="md"
      >
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          {formError && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              {formError}
            </div>
          )}

          <Input
            label="Fee Type Name *"
            placeholder="e.g. Tuition Fee"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Code (Optional)"
              placeholder="e.g. TUITION"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            />
            <Input
              label="Sort Order"
              type="number"
              min="0"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Fee Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="ACADEMIC">Academic Fee</option>
                <option value="HOSTEL">Hostel Fee</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Billing Rule *</label>
              <select
                value={formData.billingRule}
                onChange={(e) => setFormData({ ...formData, billingRule: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="ONE_TIME_PER_ACADEMIC_YEAR">One Time per Academic Year</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          <Textarea
            label="Description (Optional)"
            placeholder="Brief description of this fee type"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <label htmlFor="isActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Active (Available for Fee Structures)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} loadingText="Saving...">
              {editingType ? 'Save Changes' : 'Create Fee Type'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingType)}
        onClose={() => setDeletingType(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Fee Type"
        message={`Are you sure you want to delete '${deletingType?.name}'? This operation will fail if the fee type is currently used in structures or charges.`}
        confirmText="Delete Fee Type"
        variant="danger"
        loading={isDeleting}
        loadingText="Deleting..."
      />
    </div>
  );
};
