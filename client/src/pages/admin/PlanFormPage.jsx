import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Check, MoveUp, MoveDown, Trash2, Plus, GripVertical, Pencil, X } from 'lucide-react';
import { subscriptionService } from '../../services/subscriptionService.js';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';

export const PlanFormPage = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = Boolean(planId);
  const copyPlan = location.state?.copyPlan;

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'MONTHLY',
    durationValue: 1,
    durationUnit: 'MONTH',
    basePrice: '',
    discountPercentage: 0,
    discountAmount: 0,
    currency: 'INR',
    description: '',
    offerTitle: '',
    offerDescription: '',
    badge: '',
    maxStudentLimit: '',
    isEnterprise: false,
    isTrial: false,
    isActive: true,
    displayOrder: 1,
    features: ['All Modules Activated', 'Technical Support'],
  });

  const [newFeatureText, setNewFeatureText] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const [editingFeatureIndex, setEditingFeatureIndex] = useState(null);
  const [editingFeatureText, setEditingFeatureText] = useState('');

  useEffect(() => {
    if (!isEditing && copyPlan) {
      setFormData({
        name: `Copy of ${copyPlan.name}`,
        code: `${copyPlan.code}_COPY`,
        type: copyPlan.type || 'MONTHLY',
        durationValue: copyPlan.durationValue || 1,
        durationUnit: copyPlan.durationUnit || 'MONTH',
        basePrice: String(copyPlan.basePrice || ''),
        discountPercentage: copyPlan.discountPercentage || 0,
        discountAmount: String(copyPlan.discountAmount || 0),
        currency: copyPlan.currency || 'INR',
        description: copyPlan.description || '',
        offerTitle: copyPlan.offerTitle || '',
        offerDescription: copyPlan.offerDescription || '',
        badge: copyPlan.badge || '',
        maxStudentLimit: copyPlan.maxStudentLimit !== null && copyPlan.maxStudentLimit !== undefined ? String(copyPlan.maxStudentLimit) : '',
        isEnterprise: Boolean(copyPlan.isEnterprise),
        isTrial: Boolean(copyPlan.isTrial),
        isActive: true,
        displayOrder: (copyPlan.displayOrder || 1) + 1,
        features: Array.isArray(copyPlan.features)
          ? copyPlan.features.map((f) => (typeof f === 'string' ? f : f.name))
          : [],
      });
      setToast({ type: 'success', message: `Pre-filled data from copied plan '${copyPlan.name}'. Edit the fields and save to create a new plan variant.` });
    }
  }, [isEditing, copyPlan]);

  useEffect(() => {
    if (isEditing) {
      const loadPlan = async () => {
        setLoading(true);
        try {
          const res = await subscriptionService.adminListPlans();
          if (res.success && res.data) {
            const target = res.data.find((p) => p.id === planId);
            if (target) {
              setFormData({
                name: target.name,
                code: target.code,
                type: target.type,
                durationValue: target.durationValue,
                durationUnit: target.durationUnit,
                basePrice: String(target.basePrice),
                discountPercentage: target.discountPercentage,
                discountAmount: String(target.discountAmount),
                currency: target.currency || 'INR',
                description: target.description || '',
                offerTitle: target.offerTitle || '',
                offerDescription: target.offerDescription || '',
                badge: target.badge || '',
                maxStudentLimit: target.maxStudentLimit !== null && target.maxStudentLimit !== undefined ? String(target.maxStudentLimit) : '',
                isEnterprise: Boolean(target.isEnterprise),
                isTrial: target.isTrial,
                isActive: target.isActive,
                displayOrder: target.displayOrder || 1,
                features: Array.isArray(target.features)
                  ? target.features.map((f) => (typeof f === 'string' ? f : f.name))
                  : [],
              });
            } else {
              setToast({ type: 'danger', message: 'Plan not found.' });
            }
          }
        } catch (err) {
          setToast({ type: 'danger', message: err.message || 'Failed to load plan details.' });
        } finally {
          setLoading(false);
        }
      };

      loadPlan();
    }
  }, [isEditing, planId]);

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, newFeatureText.trim()],
    }));
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const handleMoveFeature = (index, direction) => {
    const newFeatures = [...formData.features];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newFeatures.length) return;
    const temp = newFeatures[index];
    newFeatures[index] = newFeatures[targetIndex];
    newFeatures[targetIndex] = temp;
    setFormData((prev) => ({ ...prev, features: newFeatures }));
  };

  const handleStartEditFeature = (index) => {
    setEditingFeatureIndex(index);
    setEditingFeatureText(formData.features[index]);
  };

  const handleSaveEditFeature = (index) => {
    if (!editingFeatureText.trim()) return;
    setFormData((prev) => {
      const updated = [...prev.features];
      updated[index] = editingFeatureText.trim();
      return { ...prev, features: updated };
    });
    setEditingFeatureIndex(null);
    setEditingFeatureText('');
  };

  const handleCancelEditFeature = () => {
    setEditingFeatureIndex(null);
    setEditingFeatureText('');
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    setFormData((prev) => {
      const newFeatures = [...prev.features];
      const [removed] = newFeatures.splice(draggedIndex, 1);
      newFeatures.splice(targetIndex, 0, removed);
      return { ...prev, features: newFeatures };
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.code.trim() || formData.basePrice === '') {
      setToast({ type: 'danger', message: 'Plan Name, Code, and Base Price are required.' });
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        const res = await subscriptionService.adminUpdatePlan(planId, formData);
        if (res.success) {
          setToast({ type: 'success', message: 'Plan updated successfully.' });
          setTimeout(() => navigate('/admin/plans'), 800);
        }
      } else {
        const res = await subscriptionService.adminCreatePlan(formData);
        if (res.success) {
          setToast({ type: 'success', message: 'Plan created successfully.' });
          setTimeout(() => navigate('/admin/plans'), 800);
        }
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to save plan.' });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" label="Loading plan details..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div>
        <Link
          to="/admin/plans"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Plans Directory</span>
        </Link>
      </div>

      <ModulePageHeader
        title={isEditing ? `Edit Plan: ${formData.name}` : 'Create Subscription Plan'}
        description="Configure pricing, billing cycle, duration, trial options, and feature entitlement list."
      />

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-4">
        {/* Core Plan Details & Billing Cycle */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>1. Identification & Billing Cycle</span>
            <span className="text-[10px] text-slate-400 font-normal">Core plan identity and duration settings</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div className="sm:col-span-1 lg:col-span-2">
              <Input
                size="sm"
                label="Plan Name *"
                placeholder="e.g. Standard Monthly"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="sm:col-span-1 lg:col-span-1">
              <Input
                size="sm"
                label="Plan Code *"
                placeholder="e.g. MONTHLY_STD"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                disabled={isEditing}
                required
              />
            </div>
            <div>
              <Select
                size="sm"
                label="Plan Type *"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="MONTHLY">MONTHLY</option>
                <option value="QUARTERLY">QUARTERLY</option>
                <option value="YEARLY">YEARLY</option>
                <option value="TRIAL">TRIAL</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  size="sm"
                  label="Duration *"
                  type="number"
                  min="1"
                  value={formData.durationValue}
                  onChange={(e) => setFormData({ ...formData, durationValue: e.target.value })}
                  required
                />
              </div>
              <div className="flex-1">
                <Select
                  size="sm"
                  label="Unit *"
                  value={formData.durationUnit}
                  onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value })}
                >
                  <option value="MONTH">MONTH</option>
                  <option value="DAY">DAY</option>
                  <option value="YEAR">YEAR</option>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing, Discounts & Student Limit */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center justify-between">
            <span>2. Pricing, Discounts & Capacity</span>
            <span className="text-[10px] text-indigo-600 font-bold">Calculated Price: {formatCurrency(Math.max(0, Number(formData.basePrice || 0) - Number(formData.discountAmount || 0)))}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <Input
              size="sm"
              label="Base Price (₹) *"
              type="number"
              min="0"
              placeholder="4999"
              value={formData.basePrice}
              onChange={(e) => {
                const val = e.target.value;
                let newPct = formData.discountPercentage;
                if (val !== '' && Number(val) > 0 && formData.discountAmount !== '' && Number(formData.discountAmount) >= 0) {
                  newPct = Math.min(100, Math.max(0, Math.round((Number(formData.discountAmount) / Number(val)) * 100)));
                }
                setFormData((prev) => ({ ...prev, basePrice: val, discountPercentage: newPct }));
              }}
              required
            />

            <Input
              size="sm"
              label="Discount Amount (₹)"
              type="number"
              min="0"
              placeholder="500"
              value={formData.discountAmount}
              onChange={(e) => {
                const amtVal = e.target.value;
                let newPct = 0;
                if (formData.basePrice !== '' && Number(formData.basePrice) > 0 && amtVal !== '' && Number(amtVal) >= 0) {
                  newPct = Math.min(100, Math.max(0, Math.round((Number(amtVal) / Number(formData.basePrice)) * 100)));
                }
                setFormData((prev) => ({ ...prev, discountAmount: amtVal, discountPercentage: newPct }));
              }}
            />

            <Input
              size="sm"
              label="Discount %"
              type="number"
              min="0"
              max="100"
              placeholder="10"
              value={formData.discountPercentage}
              onChange={(e) => {
                const pctVal = e.target.value;
                let newAmt = formData.discountAmount;
                if (formData.basePrice !== '' && Number(formData.basePrice) > 0 && pctVal !== '' && Number(pctVal) >= 0) {
                  newAmt = String(Math.round((Number(formData.basePrice) * Number(pctVal)) / 100));
                }
                setFormData((prev) => ({ ...prev, discountPercentage: pctVal, discountAmount: newAmt }));
              }}
            />

            <Input
              size="sm"
              label="Max Active Student Limit"
              type="number"
              min="1"
              placeholder="Empty = Unlimited"
              value={formData.maxStudentLimit}
              onChange={(e) => setFormData({ ...formData, maxStudentLimit: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Calculated Final Price:</span>
              <span className="font-extrabold text-indigo-700 text-xs font-mono">
                {formatCurrency(Math.max(0, Number(formData.basePrice || 0) - Number(formData.discountAmount || 0)))}
              </span>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isEnterprise}
                onChange={(e) => setFormData({ ...formData, isEnterprise: e.target.checked })}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 w-3.5 h-3.5"
              />
              <span className="text-purple-900 font-bold text-xs">Enterprise Custom Plan Tier</span>
            </label>
          </div>
        </div>

        {/* Marketing, Description & Visibility */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
            3. Branding, Visibility & Order
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <Input
              size="sm"
              label="Offer Title"
              placeholder="e.g. Save ₹2,000 yearly"
              value={formData.offerTitle}
              onChange={(e) => setFormData({ ...formData, offerTitle: e.target.value })}
            />
            <Input
              size="sm"
              label="Badge Tag"
              placeholder="e.g. POPULAR"
              value={formData.badge}
              onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
            />
            <Input
              size="sm"
              label="Offer Description"
              placeholder="Promotional discount note..."
              value={formData.offerDescription}
              onChange={(e) => setFormData({ ...formData, offerDescription: e.target.value })}
            />
            <Input
              size="sm"
              label="Display Order Index"
              type="number"
              value={formData.displayOrder}
              onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs items-end">
            <div className="sm:col-span-2">
              <Input
                size="sm"
                label="Plan Summary / Description"
                placeholder="Short plan overview displayed on pricing cards..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-4 py-2 px-3 bg-slate-50 rounded-lg border border-slate-200 justify-around">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Active</span>
              </label>

              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isTrial}
                  onChange={(e) => setFormData({ ...formData, isTrial: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                />
                <span>Trial</span>
              </label>
            </div>
          </div>
        </div>

        {/* Features Manager (ALL FEATURES DISPLAYED TOGETHER, COMPACT & EFFORTLESS DRAG-AND-DROP) */}
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                4. Included Features ({formData.features.length})
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                Drag to Reorder
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              Drag grab handle or click arrows to rearrange feature sequence
            </span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add feature item e.g. Unlimited Student Profiles"
              value={newFeatureText}
              onChange={(e) => setNewFeatureText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button type="button" variant="outline" size="sm" icon={Plus} onClick={handleAddFeature}>
              Add Feature
            </Button>
          </div>

          {/* ALL FEATURES DISPLAYED TOGETHER (NO INNER CLAMPED SCROLLBAR, EFFICIENT DRAG AND DROP & INLINE EDITING) */}
          <div className="space-y-1.5 pt-1">
            {formData.features.map((feat, idx) => {
              const isEditingFeature = editingFeatureIndex === idx;
              const isDragging = draggedIndex === idx;
              const isDragOver = dragOverIndex === idx;

              if (isEditingFeature) {
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 py-1 px-2.5 rounded-md border border-indigo-300 bg-indigo-50/70 text-xs shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <input
                      type="text"
                      value={editingFeatureText}
                      onChange={(e) => setEditingFeatureText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEditFeature(idx);
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          handleCancelEditFeature();
                        }
                      }}
                      autoFocus
                      className="flex-1 px-2.5 py-1 text-xs rounded border border-indigo-400 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveEditFeature(idx)}
                      className="p-1 rounded text-emerald-600 hover:bg-emerald-100 transition-colors"
                      title="Save Feature Text (Enter)"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEditFeature}
                      className="p-1 rounded text-slate-500 hover:bg-slate-200 transition-colors"
                      title="Cancel Editing (Esc)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between py-1.5 px-2.5 rounded-md border text-xs text-slate-800 transition-all cursor-grab active:cursor-grabbing select-none ${
                    isDragging
                      ? 'opacity-30 bg-indigo-100 border-indigo-400 border-dashed scale-[0.99]'
                      : isDragOver
                      ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-400/40 shadow-xs'
                      : 'bg-slate-50/90 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium min-w-0">
                    <GripVertical className="w-4 h-4 text-slate-400 hover:text-indigo-600 shrink-0 cursor-grab active:cursor-grabbing" />
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate text-xs">{feat}</span>
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditFeature(idx)}
                      className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Edit Feature Text"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveFeature(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      title="Move Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveFeature(idx, 1)}
                      disabled={idx === formData.features.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                      title="Move Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(idx)}
                      className="p-1 text-rose-500 hover:text-rose-700 transition-colors"
                      title="Remove Feature"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/admin/plans')} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" icon={Save} loading={saving} loadingText="Saving Plan...">
            {isEditing ? 'Update Plan' : 'Create Plan'}
          </Button>
        </div>
      </form>
    </div>
  );
};
