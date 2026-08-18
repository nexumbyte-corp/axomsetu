import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FileSpreadsheet, PlusCircle, Trash, X, Info, Copy, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { feeService } from '../../services/fee.service.js';
import { academicService } from '../../services/academic.service.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { toast } from '../../components/ui/Toast.jsx';

export const FeeTemplatesPage = () => {
  const { selectedYearId, academicYears } = useAcademicYear();

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown options
  const [classes, setClasses] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [streams, setStreams] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);

  // Single Edit/Create Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
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

  // Delete state
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Copy Modal State
  const [isBulkCopyModalOpen, setIsBulkCopyModalOpen] = useState(false);
  const [bulkSourceYearId, setBulkSourceYearId] = useState('');
  const [bulkTargetYearId, setBulkTargetYearId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [stagedTemplates, setStagedTemplates] = useState([]);
  const [bulkError, setBulkError] = useState('');

  useEffect(() => {
    const loadAcademicSetup = async () => {
      try {
        const [clsRes, medRes, stmRes, ftRes] = await Promise.all([
          academicService.getClasses(),
          academicService.getMediums(),
          academicService.getStreams(),
          feeService.getFeeTypes(),
        ]);
        setClasses(clsRes.data || []);
        setMediums(medRes.data || []);
        setStreams(stmRes.data || []);
        setFeeTypes(ftRes.data || []);
      } catch {
        toast.error('Failed to load academic dropdown options');
      }
    };
    loadAcademicSetup();
  }, []);

  const fetchTemplates = async () => {
    if (!selectedYearId) return;
    setLoading(true);
    try {
      const res = await feeService.getFeeStructures({ academicYearId: selectedYearId });
      setTemplates(res.data || []);
    } catch {
      toast.error(err.response?.data?.message || 'Failed to load fee templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [selectedYearId]);

  const selectedClassObj = classes.find((c) => c.id === formData.classId);

  const handleOpenAddDrawer = () => {
    setEditingTemplate(null);
    setFormData({
      academicYearId: selectedYearId,
      classId: classes[0]?.id || '',
      mediumId: mediums[0]?.id || '',
      streamId: '',
      isActive: true,
      heads: feeTypes.slice(0, 4).map((ft) => ({
        feeTypeId: ft.id,
        amount: 500,
        isActive: true,
      })),
    });
    setFormError('');
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (item) => {
    setEditingTemplate(item);
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
    setIsDrawerOpen(true);
  };

  const handleCopyTemplate = (sourceTemplate) => {
    setEditingTemplate(null);
    const unusedClass = classes.find((c) => !templates.some((t) => t.classId === c.id)) || classes[0];

    setFormData({
      academicYearId: selectedYearId,
      classId: unusedClass?.id || '',
      mediumId: sourceTemplate.mediumId || mediums[0]?.id || '',
      streamId: sourceTemplate.streamId || '',
      isActive: true,
      heads: sourceTemplate.heads.map((h) => ({
        feeTypeId: h.feeTypeId,
        amount: Number(h.amount),
        isActive: h.isActive,
      })),
    });
    setFormError('');
    setIsDrawerOpen(true);
    toast.info(`Fee heads pre-filled from '${sourceTemplate.class?.name}'. Select target class/medium and save.`);
  };

  const handleCopyFromDropdown = (sourceId) => {
    if (!sourceId) return;
    const source = templates.find((t) => t.id === sourceId);
    if (!source) return;

    setFormData((prev) => ({
      ...prev,
      heads: source.heads.map((h) => ({
        feeTypeId: h.feeTypeId,
        amount: Number(h.amount),
        isActive: h.isActive,
      })),
    }));
    toast.success(`Fee heads copied from '${source.class?.name}'. Modify amounts if needed.`);
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
      setFormError('Duplicate fee items are not allowed within the same fee template');
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
          isActive: h.isActive ?? true,
        })),
      };

      if (editingTemplate) {
        await feeService.updateFeeStructure(editingTemplate.id, payload);
        toast.success('Fee template updated successfully');
      } else {
        await feeService.createFeeStructure(payload);
        toast.success('Fee template created successfully');
      }

      setIsDrawerOpen(false);
      fetchTemplates();
    } catch {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to save fee template';
      setFormError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      await feeService.toggleFeeStructureStatus(item.id);
      toast.success('Fee template status updated');
      fetchTemplates();
    } catch {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTemplate) return;
    setIsDeleting(true);
    try {
      await feeService.deleteFeeStructure(deletingTemplate.id);
      toast.success('Fee template deleted successfully');
      setDeletingTemplate(null);
      fetchTemplates();
    } catch {
      toast.error(err.response?.data?.message || 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateFormTotal = () => {
    return formData.heads.reduce((sum, h) => (h.isActive ? sum + (parseFloat(h.amount) || 0) : sum), 0);
  };

  // --- Bulk Copy Templates Logic ---
  const findBestSourceYearId = () => {
    if (!academicYears || academicYears.length === 0) return '';
    const sortedYears = [...academicYears].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const currentYearObj = academicYears.find((y) => y.id === selectedYearId);
    
    if (currentYearObj) {
      // Find years before currentYear
      const preceding = sortedYears.filter((y) => new Date(y.startDate) < new Date(currentYearObj.startDate));
      if (preceding.length > 0) {
        return preceding[preceding.length - 1].id;
      }
    }
    // Default to earliest year or first year different from selectedYearId
    const otherYear = sortedYears.find((y) => y.id !== selectedYearId);
    return otherYear ? otherYear.id : sortedYears[0]?.id || '';
  };

  const loadBulkSourceTemplates = async (sourceYearId) => {
    if (!sourceYearId) return;
    setBulkLoading(true);
    setBulkError('');
    try {
      const res = await feeService.getFeeStructures({ academicYearId: sourceYearId });
      const sourceList = res.data || [];

      if (sourceList.length === 0) {
        setStagedTemplates([]);
        setBulkError('No fee templates found in the selected source academic year.');
      } else {
        const staged = sourceList.map((t) => ({
          tempId: t.id,
          selected: true,
          classId: t.classId,
          className: t.class?.name || 'Class',
          mediumId: t.mediumId,
          mediumName: t.medium?.name || 'Medium',
          streamId: t.streamId || null,
          streamName: t.stream?.name || null,
          heads: (t.heads || []).map((h) => ({
            feeTypeId: h.feeTypeId,
            feeTypeName: h.feeType?.name || 'Fee Head',
            amount: Number(h.amount),
            isActive: h.isActive ?? true,
          })),
        }));
        setStagedTemplates(staged);
      }
    } catch {
      setBulkError(err.response?.data?.message || 'Failed to fetch templates from source year.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleOpenBulkCopyModal = () => {
    const sourceId = findBestSourceYearId();
    const sortedYears = [...academicYears].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    // If selectedYearId equals sourceId, set target to next year or latest year
    let targetId = selectedYearId;
    if (targetId === sourceId && sortedYears.length > 1) {
      targetId = sortedYears.find((y) => y.id !== sourceId)?.id || targetId;
    }

    setBulkSourceYearId(sourceId);
    setBulkTargetYearId(targetId);
    setIsBulkCopyModalOpen(true);
    if (sourceId) {
      loadBulkSourceTemplates(sourceId);
    }
  };

  const handleSourceYearChange = (newSourceId) => {
    setBulkSourceYearId(newSourceId);
    if (newSourceId === bulkTargetYearId) {
      const other = academicYears.find((y) => y.id !== newSourceId);
      if (other) setBulkTargetYearId(other.id);
    }
    loadBulkSourceTemplates(newSourceId);
  };

  const handleToggleStageSelect = (idx) => {
    setStagedTemplates((prev) => {
      const copy = [...prev];
      copy[idx].selected = !copy[idx].selected;
      return copy;
    });
  };

  const handleStageHeadChange = (templateIdx, headIdx, field, value) => {
    setStagedTemplates((prev) => {
      const copy = [...prev];
      const heads = [...copy[templateIdx].heads];
      heads[headIdx] = { ...heads[headIdx], [field]: value };
      copy[templateIdx] = { ...copy[templateIdx], heads };
      return copy;
    });
  };

  const handleAddStageHeadRow = (templateIdx) => {
    setStagedTemplates((prev) => {
      const copy = [...prev];
      const unusedType = feeTypes.find(
        (ft) => !copy[templateIdx].heads.some((h) => h.feeTypeId === ft.id)
      );
      const feeTypeId = unusedType ? unusedType.id : feeTypes[0]?.id || '';
      copy[templateIdx].heads.push({ feeTypeId, amount: 0, isActive: true });
      return copy;
    });
  };

  const handleRemoveStageHeadRow = (templateIdx, headIdx) => {
    setStagedTemplates((prev) => {
      const copy = [...prev];
      copy[templateIdx].heads.splice(headIdx, 1);
      return copy;
    });
  };

  const handleSaveBulkTemplates = async () => {
    setBulkError('');
    const selectedToSave = stagedTemplates.filter((t) => t.selected);

    if (selectedToSave.length === 0) {
      setBulkError('Please select at least one class template to save.');
      return;
    }

    if (!bulkTargetYearId) {
      setBulkError('Please select a target academic year.');
      return;
    }

    // Validate heads
    for (const item of selectedToSave) {
      if (item.heads.length === 0) {
        setBulkError(`Class '${item.className}' must have at least one fee head.`);
        return;
      }
      const typeIds = item.heads.map((h) => h.feeTypeId);
      if (new Set(typeIds).size !== typeIds.length) {
        setBulkError(`Class '${item.className}' has duplicate fee items.`);
        return;
      }
    }

    setBulkSaving(true);
    try {
      const payload = {
        targetAcademicYearId: bulkTargetYearId,
        structures: selectedToSave.map((t) => ({
          classId: t.classId,
          mediumId: t.mediumId,
          streamId: t.streamId || null,
          isActive: true,
          heads: t.heads.map((h) => ({
            feeTypeId: h.feeTypeId,
            amount: parseFloat(h.amount) || 0,
            isActive: h.isActive ?? true,
          })),
        })),
      };

      const res = await feeService.bulkCreateFeeStructures(payload);
      toast.success(res.data?.message || res.message || 'Bulk fee templates saved successfully!');
      setIsBulkCopyModalOpen(false);
      fetchTemplates();
    } catch {
      setBulkError(err.response?.data?.message || err.message || 'Failed to save bulk fee templates.');
      toast.error('Failed to save bulk fee templates.');
    } finally {
      setBulkSaving(false);
    }
  };

  // Instant Search Filtering
  const filteredTemplates = templates.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const className = item.class?.name?.toLowerCase() || '';
    const mediumName = item.medium?.name?.toLowerCase() || '';
    const streamName = item.stream?.name?.toLowerCase() || '';
    return className.includes(q) || mediumName.includes(q) || streamName.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by class, medium, or stream..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            onClick={handleOpenBulkCopyModal}
            icon={Copy}
            size="sm"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            Copy Templates from Previous Year
          </Button>

          <Button onClick={handleOpenAddDrawer} icon={Plus} size="sm">
            Create Fee Template
          </Button>
        </div>
      </div>

      {/* Fee Templates Business Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <EmptyState
            icon={FileSpreadsheet}
            title="No Fee Templates found."
            description="Create fee templates for classes and mediums, or copy templates from a previous academic year."
            actionLabel="Create Fee Template"
            onAction={handleOpenAddDrawer}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Medium</th>
                  <th className="px-4 py-3">Stream</th>
                  <th className="px-4 py-3">Fee Heads</th>
                  <th className="px-4 py-3 text-right">Total Monthly Amount</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTemplates.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900">{item.class?.name}</td>
                    <td className="px-4 py-3.5 text-slate-600 font-semibold">{item.medium?.name}</td>
                    <td className="px-4 py-3.5 text-slate-500">{item.stream?.name || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-700 font-semibold">
                      {item.heads?.length || 0} heads
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono font-bold text-indigo-700 text-xs">
                      ₹{item.totalAmount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className="inline-flex items-center gap-1 focus:outline-none"
                        title="Click to toggle status"
                      >
                        {item.isActive ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Inactive</Badge>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditDrawer(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </button>
                        <button
                          onClick={() => handleCopyTemplate(item)}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors inline-flex items-center gap-1"
                          title="Copy fee template structure to another class"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy
                        </button>
                        <button
                          onClick={() => setDeletingTemplate(item)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete Template"
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

      {/* Edit Template Responsive Side Drawer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTemplate ? 'Edit Fee Template' : 'Create Fee Template'}
                </h3>
                <p className="text-xs text-slate-500">Configure default monthly fee heads for class enrollment.</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              <div className="p-3 text-xs rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>Changes will apply to future fee generation only. Existing generated fees will not be changed.</span>
              </div>

              {!editingTemplate && templates.length > 0 && (
                <div className="p-3.5 text-xs rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <Copy className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Copy Fee Heads from Existing Template</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    Select a class template below to copy its fee items and amounts into this new template:
                  </p>
                  <select
                    onChange={(e) => handleCopyFromDropdown(e.target.value)}
                    className="w-full text-xs rounded-lg border border-emerald-300 bg-white px-3 py-2 font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    defaultValue=""
                  >
                    <option value="" disabled>-- Select template to copy --</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.class?.name} ({t.medium?.name}{t.stream?.name ? ` - ${t.stream.name}` : ''}) — ₹{t.totalAmount.toLocaleString('en-IN')}/mo ({t.heads?.length || 0} heads)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formError && (
                <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Class</label>
                  <select
                    value={formData.classId}
                    onChange={(e) => setFormData({ ...formData, classId: e.target.value, streamId: '' })}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-800"
                    disabled={Boolean(editingTemplate)}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Medium</label>
                  <select
                    value={formData.mediumId}
                    onChange={(e) => setFormData({ ...formData, mediumId: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-800"
                    disabled={Boolean(editingTemplate)}
                  >
                    {mediums.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedClassObj?.hasStream && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Stream</label>
                  <select
                    value={formData.streamId}
                    onChange={(e) => setFormData({ ...formData, streamId: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-800"
                    disabled={Boolean(editingTemplate)}
                  >
                    <option value="">Select Stream</option>
                    {streams.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Fee Heads List */}
              <div className="pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Fee Heads Breakdown</h4>
                  <Button type="button" variant="outline" size="xs" icon={PlusCircle} onClick={handleAddHeadRow}>
                    + Add Fee Head
                  </Button>
                </div>

                <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50 max-h-72 overflow-y-auto">
                  {formData.heads.map((head, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex-1">
                        <select
                          value={head.feeTypeId}
                          onChange={(e) => handleHeadChange(idx, 'feeTypeId', e.target.value)}
                          className="w-full text-xs rounded-md border border-slate-200 px-2 py-1.5 font-semibold text-slate-800"
                        >
                          {feeTypes.map((ft) => (
                            <option key={ft.id} value={ft.id}>
                              {ft.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-28 relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={head.amount}
                          onChange={(e) => handleHeadChange(idx, 'amount', e.target.value)}
                          className="w-full text-xs pl-6 pr-2 py-1.5 rounded-md border border-slate-200 font-mono font-bold text-slate-900 text-right"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveHeadRow(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">Total Template Fee:</span>
                <span className="text-base font-extrabold text-indigo-700 font-mono">
                  ₹{calculateFormTotal().toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <Button variant="outline" type="button" onClick={() => setIsDrawerOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} loading={saving} loadingText="Saving...">
                Save Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Copy & Verification Modal */}
      <Modal
        isOpen={isBulkCopyModalOpen}
        onClose={() => setIsBulkCopyModalOpen(false)}
        title="Bulk Copy Fee Templates From Previous Academic Year"
        description="Pre-fill fee templates for all classes from a previous academic year, manually verify or update amounts, then save all together."
        size="xl"
      >
        <div className="space-y-4 text-xs">
          {/* Top Source & Target Selection Bar */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 shrink-0">Source Year (Copy From):</span>
              <select
                value={bulkSourceYearId}
                onChange={(e) => handleSourceYearChange(e.target.value)}
                className="w-full p-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {academicYears.map((yr) => (
                  <option key={yr.id} value={yr.id}>
                    {yr.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700 shrink-0">Target Year (Copy To):</span>
              <select
                value={bulkTargetYearId}
                onChange={(e) => setBulkTargetYearId(e.target.value)}
                className="w-full p-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {academicYears.map((yr) => (
                  <option key={yr.id} value={yr.id} disabled={yr.id === bulkSourceYearId}>
                    {yr.name} {yr.id === bulkSourceYearId ? '(Source)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {bulkError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
              {bulkError}
            </div>
          )}

          {bulkLoading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="font-bold text-slate-700">Loading previous year fee templates...</p>
            </div>
          ) : stagedTemplates.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">No source templates found</p>
              <p className="text-[11px]">Select another source academic year or create fee templates manually.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                <span>Classes to Copy ({stagedTemplates.filter(t => t.selected).length} / {stagedTemplates.length} selected)</span>
                <span className="text-indigo-600 font-normal normal-case">Review & adjust fee heads for any class before saving.</span>
              </div>

              {/* Staged Templates Accordion / Cards List */}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {stagedTemplates.map((t, tIdx) => {
                  const classMonthlyTotal = t.heads.reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);

                  return (
                    <div
                      key={t.tempId || tIdx}
                      className={`p-4 rounded-xl border transition-all ${
                        t.selected ? 'bg-white border-indigo-200 shadow-2xs' : 'bg-slate-50/60 border-slate-200 opacity-60'
                      }`}
                    >
                      {/* Class Card Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleStageSelect(tIdx)}
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            {t.selected ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                          <div>
                            <span className="text-sm font-bold text-slate-900">{t.className}</span>
                            <span className="ml-2 text-xs font-semibold text-slate-500">
                              ({t.mediumName}{t.streamName ? ` - ${t.streamName}` : ''})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                            Total: ₹{classMonthlyTotal.toLocaleString('en-IN')}/mo
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            icon={PlusCircle}
                            onClick={() => handleAddStageHeadRow(tIdx)}
                            disabled={!t.selected}
                          >
                            + Add Head
                          </Button>
                        </div>
                      </div>

                      {/* Fee Heads List for this Class */}
                      {t.selected && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {t.heads.map((h, hIdx) => (
                            <div
                              key={hIdx}
                              className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200"
                            >
                              <select
                                value={h.feeTypeId}
                                onChange={(e) => handleStageHeadChange(tIdx, hIdx, 'feeTypeId', e.target.value)}
                                className="flex-1 text-[11px] p-1.5 bg-white border border-slate-200 rounded font-semibold text-slate-800"
                              >
                                {!feeTypes.some((ft) => ft.id === h.feeTypeId) && (
                                  <option value={h.feeTypeId}>
                                    {h.feeTypeName || 'Fee Head'}
                                  </option>
                                )}
                                {feeTypes.map((ft) => (
                                  <option key={ft.id} value={ft.id}>
                                    {ft.name}
                                  </option>
                                ))}
                              </select>

                              <div className="w-24 relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-mono">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={h.amount}
                                  onChange={(e) => handleStageHeadChange(tIdx, hIdx, 'amount', e.target.value)}
                                  className="w-full text-xs pl-5 pr-1.5 py-1 bg-white border border-slate-200 rounded font-mono font-bold text-slate-900 text-right"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveStageHeadRow(tIdx, hIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">
              Ready to save: <strong className="text-indigo-600">{stagedTemplates.filter(t => t.selected).length} Class Template(s)</strong>
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsBulkCopyModalOpen(false)} disabled={bulkSaving}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveBulkTemplates}
                loading={bulkSaving}
                disabled={bulkLoading || stagedTemplates.filter(t => t.selected).length === 0}
                icon={Copy}
              >
                Save All Templates Together
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingTemplate)}
        onClose={() => setDeletingTemplate(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Fee Template"
        message={`Are you sure you want to delete fee template for ${deletingTemplate?.class?.name}?`}
        confirmText="Delete Template"
        variant="danger"
        loading={isDeleting}
        loadingText="Deleting..."
      />
    </div>
  );
};

export default FeeTemplatesPage;
