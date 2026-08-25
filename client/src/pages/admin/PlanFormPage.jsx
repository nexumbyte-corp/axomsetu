import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Check, MoveUp, MoveDown, Trash2, Plus, Users, ShieldAlert } from 'lucide-react';
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
    <div className="space-y-6 max-w-4xl">
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

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        {/* Core Plan Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Plan Identification
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <Input
              label="Plan Name *"
              placeholder="e.g. Standard Monthly"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Plan Code *"
              placeholder="e.g. MONTHLY_STD"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              disabled={isEditing}
              required
            />
          </div>
        </div>

        {/* Billing & Duration */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Billing Cycle & Duration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <Select
              label="Plan Type *"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="MONTHLY">MONTHLY</option>
              <option value="QUARTERLY">QUARTERLY</option>
              <option value="YEARLY">YEARLY</option>
              <option value="TRIAL">TRIAL</option>
            </Select>

            <Input
              label="Duration Value *"
              type="number"
              min="1"
              value={formData.durationValue}
              onChange={(e) => setFormData({ ...formData, durationValue: e.target.value })}
              required
            />

            <Select
              label="Duration Unit *"
              value={formData.durationUnit}
              onChange={(e) => setFormData({ ...formData, durationUnit: e.target.value })}
            >
              <option value="MONTH">MONTH</option>
              <option value="DAY">DAY</option>
              <option value="YEAR">YEAR</option>
            </Select>
          </div>
        </div>

        {/* Student Capacity & Limits */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Student Capacity & Limits</span>
            </h3>
            <span className="text-[11px] text-slate-400">Enforces maximum active students in school</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <Input
                label="Max Active Student Limit"
                type="number"
                min="1"
                placeholder="e.g. 500 (Leave empty for Unlimited)"
                value={formData.maxStudentLimit}
                onChange={(e) => setFormData({ ...formData, maxStudentLimit: e.target.value })}
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Leave blank or set to 0 for <strong>Unlimited Active Students</strong>.
              </p>
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer bg-slate-50 p-3 rounded-lg border border-slate-200 w-full">
                <input
                  type="checkbox"
                  checked={formData.isEnterprise}
                  onChange={(e) => setFormData({ ...formData, isEnterprise: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Enterprise Custom Plan</span>
                  <span className="text-[10px] text-slate-500 font-normal">Flag as custom Enterprise tier for high-volume school clients.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Pricing & Discounts */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Pricing & Discounts
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <Input
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
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Calculated Final Price:</span>
            <span className="font-extrabold text-indigo-700 text-sm font-mono">
              {formatCurrency(Math.max(0, Number(formData.basePrice || 0) - Number(formData.discountAmount || 0)))}
            </span>
          </div>
        </div>

        {/* Branding & Marketing Details */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Marketing & Badges
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <Input
              label="Offer Title"
              placeholder="e.g. Save ₹2,000 yearly"
              value={formData.offerTitle}
              onChange={(e) => setFormData({ ...formData, offerTitle: e.target.value })}
            />
            <Input
              label="Badge Tag"
              placeholder="e.g. POPULAR"
              value={formData.badge}
              onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
            />
          </div>

          <Input
            label="Offer Description"
            placeholder="e.g. Special promotional discount for new registrants"
            value={formData.offerDescription}
            onChange={(e) => setFormData({ ...formData, offerDescription: e.target.value })}
          />

          <Input
            label="Plan Description"
            placeholder="Short plan summary displayed on billing page..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Display Order & Visibility */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Ordering & Visibility
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <Input
              label="Display Order Index"
              type="number"
              value={formData.displayOrder}
              onChange={(e) => setFormData({ ...formData, displayOrder: e.target.value })}
            />

            <div className="flex items-center gap-6 pt-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Active (Publicly Visible)</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isTrial}
                  onChange={(e) => setFormData({ ...formData, isTrial: e.target.checked })}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span>Mark as Trial Plan</span>
              </label>
            </div>
          </div>
        </div>

        {/* Features Manager */}
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Included Features
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add feature item e.g. Unlimited Student Profiles"
              value={newFeatureText}
              onChange={(e) => setNewFeatureText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button type="button" variant="outline" size="sm" icon={Plus} onClick={handleAddFeature}>
              Add Feature
            </Button>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {formData.features.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs text-slate-800"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleMoveFeature(idx, -1)}
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <MoveUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveFeature(idx, 1)}
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <MoveDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(idx)}
                    className="p-1 text-rose-500 hover:text-rose-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
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
