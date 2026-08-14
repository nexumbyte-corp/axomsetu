import React, { useState, useEffect } from 'react';
import { Plus, Layers, Edit2, Trash2, CheckCircle, XCircle, PlusCircle, Trash, IndianRupee, Info } from 'lucide-react';
import { feeService } from '../../services/fee.service.js';
import { academicService } from '../../services/academic.service.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { toast } from '../../components/ui/Toast.jsx';

export const FeeStructuresPage = () => {
  const { selectedYearId } = useAcademicYear();

  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(true);

  // Master Academic Setup Dropdowns
  const [classes, setClasses] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [streams, setStreams] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    classId: '',
    mediumId: '',
    streamId: '',
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState(null);
  const [formData, setFormData] = useState({
    academicYearId: '',
    classId: '',
    mediumId: '',
    streamId: '',
    isActive: true,
    heads: [],
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete State
  const [deletingStructure, setDeletingStructure] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load dropdown options
  useEffect(() => {
    const loadAcademicSetup = async () => {
      try {
        const [clsRes, medRes, stmRes, ftRes] = await Promise.all([
          academicService.getClasses(),
          academicService.getMediums(),
          academicService.getStreams(),
          feeService.getFeeTypes({ isActive: 'true' }),
        ]);
        setClasses(clsRes.data || []);
        setMediums(medRes.data || []);
        setStreams(stmRes.data || []);
        setFeeTypes(ftRes.data || []);
      } catch (err) {
        toast.error('Failed to load academic dropdown options');
      }
    };
    loadAcademicSetup();
  }, []);

  const fetchStructures = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const params = {
        academicYearId: selectedYearId,
        ...(filters.classId && { classId: filters.classId }),
        ...(filters.mediumId && { mediumId: filters.mediumId }),
        ...(filters.streamId && { streamId: filters.streamId }),
      };
      const res = await feeService.getFeeStructures(params);
      setStructures(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStructures();
  }, [selectedYearId, filters]);

  const selectedClassObj = classes.find((c) => c.id === formData.classId);

  const handleOpenAddModal = () => {
    setEditingStructure(null);
    setFormData({
      academicYearId: selectedYearId,
      classId: classes[0]?.id || '',
      mediumId: mediums[0]?.id || '',
      streamId: '',
      isActive: true,
      heads: feeTypes.slice(0, 3).map((ft) => ({
        feeTypeId: ft.id,
        amount: 500,
        isActive: true,
      })),
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingStructure(item);
    setFormData({
      academicYearId: item.academicYearId,
      classId: item.classId,
      mediumId: item.mediumId,
      streamId: item.streamId || '',
      isActive: item.isActive,
      heads: item.heads.map((h) => ({
        feeTypeId: h.feeTypeId,
        amount: Number(h.amount),
        isActive: h.isActive,
      })),
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleAddHeadRow = () => {
    const unusedType = feeTypes.find(
      (ft) => !formData.heads.some((h) => h.feeTypeId === ft.id)
    );
    const feeTypeId = unusedType ? unusedType.id : feeTypes[0]?.id || '';
    setFormData({
      ...formData,
      heads: [...formData.heads, { feeTypeId, amount: 0, isActive: true }],
    });
  };

  const handleRemoveHeadRow = (index) => {
    const newHeads = [...formData.heads];
    newHeads.splice(index, 1);
    setFormData({ ...formData, heads: newHeads });
  };

  const handleHeadChange = (index, field, value) => {
    const newHeads = [...formData.heads];
    newHeads[index][field] = value;
    setFormData({ ...formData, heads: newHeads });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.classId || !formData.mediumId) {
      setFormError('Class and Medium are required');
      return;
    }

    if (selectedClassObj?.hasStream && !formData.streamId) {
      setFormError(`Stream is required for class '${selectedClassObj.name}'`);
      return;
    }

    if (formData.heads.length === 0) {
      setFormError('At least one fee head is required');
      return;
    }

    const headTypeIds = formData.heads.map((h) => h.feeTypeId);
    if (new Set(headTypeIds).size !== headTypeIds.length) {
      setFormError('Duplicate fee items are not allowed within the same fee structure');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        academicYearId: formData.academicYearId || selectedYearId,
        classId: formData.classId,
        mediumId: formData.mediumId,
        streamId: selectedClassObj?.hasStream ? formData.streamId : null,
        isActive: formData.isActive,
        heads: formData.heads.map((h) => ({
          feeTypeId: h.feeTypeId,
          amount: parseFloat(h.amount) || 0,
          isActive: h.isActive,
        })),
      };

      if (editingStructure) {
        await feeService.updateFeeStructure(editingStructure.id, payload);
        toast.success('Fee structure updated successfully');
      } else {
        await feeService.createFeeStructure(payload);
        toast.success('Fee structure created successfully');
      }

      setIsModalOpen(false);
      fetchStructures();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save fee structure';
      setFormError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      await feeService.toggleFeeStructureStatus(item.id);
      toast.success('Fee structure status updated');
      fetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStructure) return;
    setIsDeleting(true);
    try {
      await feeService.deleteFeeStructure(deletingStructure.id);
      toast.success('Fee structure deleted successfully');
      setDeletingStructure(null);
      fetchStructures();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete structure');
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateFormTotal = () => {
    return formData.heads.reduce((sum, h) => (h.isActive ? sum + (parseFloat(h.amount) || 0) : sum), 0);
  };

  return (
    <div className="space-y-6">
      {/* Filter Bar & Add Action */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
          <Select
            placeholder="All Classes"
            value={filters.classId}
            onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
            options={[
              { label: 'All Classes', value: '' },
              ...classes.map((c) => ({ label: c.name, value: c.id })),
            ]}
          />
          <Select
            placeholder="All Mediums"
            value={filters.mediumId}
            onChange={(e) => setFilters({ ...filters, mediumId: e.target.value })}
            options={[
              { label: 'All Mediums', value: '' },
              ...mediums.map((m) => ({ label: m.name, value: m.id })),
            ]}
          />
          <Select
            placeholder="All Streams"
            value={filters.streamId}
            onChange={(e) => setFilters({ ...filters, streamId: e.target.value })}
            options={[
              { label: 'All Streams', value: '' },
              ...streams.map((s) => ({ label: s.name, value: s.id })),
            ]}
          />
        </div>

        <Button onClick={handleOpenAddModal} icon={Plus} size="sm">
          Add Structure
        </Button>
      </div>

      {/* Fee Structures Grid / List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : structures.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs">
          <EmptyState
            icon={Layers}
            title="No Fee Structures Configured"
            description="Create fee templates for classes and mediums to generate monthly charges."
            actionLabel="Create Fee Structure"
            onAction={handleOpenAddModal}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {structures.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {item.class?.name} — {item.medium?.name}
                    {item.stream ? ` (${item.stream.name})` : ''}
                  </h3>
                  <p className="text-[11px] text-slate-500">{item.academicYear?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleStatus(item)}>
                    {item.isActive ? (
                      <Badge variant="success" size="sm">Active</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">Inactive</Badge>
                    )}
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingStructure(item)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Fee Heads Breakdown */}
              <div className="p-4 flex-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-400 font-bold border-b border-slate-100 text-[10px] uppercase">
                      <th className="text-left pb-2">Fee Head</th>
                      <th className="text-right pb-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {item.heads.map((h) => (
                      <tr key={h.id} className={!h.isActive ? 'opacity-40 line-through' : ''}>
                        <td className="py-2 text-slate-700 font-semibold">{h.feeType?.name}</td>
                        <td className="py-2 text-right font-mono font-bold text-slate-900">
                          ₹{Number(h.amount).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Footer */}
              <div className="p-4 bg-indigo-50/50 border-t border-indigo-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Total Monthly Fee:</span>
                <span className="text-sm font-extrabold text-indigo-700 font-mono">
                  ₹{item.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Structure Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStructure ? 'Edit Fee Structure' : 'Create Fee Structure'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 text-xs rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <span>Changes will apply to future fee generation only. Existing generated fees will not be changed.</span>
          </div>

          {formError && (
            <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Class"
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value, streamId: '' })}
              options={classes.map((c) => ({ label: c.name, value: c.id }))}
              required
            />
            <Select
              label="Medium"
              value={formData.mediumId}
              onChange={(e) => setFormData({ ...formData, mediumId: e.target.value })}
              options={mediums.map((m) => ({ label: m.name, value: m.id }))}
              required
            />
            {selectedClassObj?.hasStream && (
              <Select
                label="Stream"
                value={formData.streamId}
                onChange={(e) => setFormData({ ...formData, streamId: e.target.value })}
                options={[
                  { label: 'Select Stream', value: '' },
                  ...streams.map((s) => ({ label: s.name, value: s.id })),
                ]}
                required
              />
            )}
          </div>

          {/* Fee Heads Rows */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Fee Heads Breakdown</h4>
              <Button type="button" variant="outline" size="xs" icon={PlusCircle} onClick={handleAddHeadRow}>
                Add Fee Head
              </Button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50 max-h-64 overflow-y-auto">
              {formData.heads.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No fee heads added yet.</p>
              ) : (
                formData.heads.map((head, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                    <div className="flex-1">
                      <select
                        value={head.feeTypeId}
                        onChange={(e) => handleHeadChange(idx, 'feeTypeId', e.target.value)}
                        className="w-full text-xs rounded-md border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700"
                      >
                        {feeTypes.map((ft) => (
                          <option key={ft.id} value={ft.id}>
                            {ft.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-32 relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={head.amount}
                        onChange={(e) => handleHeadChange(idx, 'amount', e.target.value)}
                        className="w-full text-xs pl-6 pr-2 py-1.5 rounded-md border border-slate-200 font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="checkbox"
                        checked={head.isActive}
                        onChange={(e) => handleHeadChange(idx, 'isActive', e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                        title="Include in template"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveHeadRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">Total Monthly Amount:</span>
            <span className="text-base font-extrabold text-indigo-700 font-mono">
              ₹{calculateFormTotal().toLocaleString('en-IN')}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} loadingText="Saving Structure...">
              {editingStructure ? 'Save Changes' : 'Create Structure'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingStructure)}
        onClose={() => setDeletingStructure(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Fee Structure"
        message={`Are you sure you want to delete fee structure for ${deletingStructure?.class?.name} (${deletingStructure?.medium?.name})?`}
        confirmText="Delete Structure"
        variant="danger"
        loading={isDeleting}
        loadingText="Deleting..."
      />
    </div>
  );
};
