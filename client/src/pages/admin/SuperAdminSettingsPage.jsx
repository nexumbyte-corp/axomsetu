import React, { useState, useEffect } from 'react';
import { Save, ShieldCheck, Mail, Phone, Sliders, MessageSquare } from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';

import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';

export const SuperAdminSettingsPage = () => {
  useDocumentTitle('Platform Settings');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeSection, setActiveSection] = useState('general'); // 'general' | 'contact' | 'system'

  const [formData, setFormData] = useState({
    platformName: 'AxomSetu Platform',
    supportEmail: 'support@axomsetu.com',
    supportPhone: '+91 98765 43210',
    whatsappNumber: '+91 98765 43210',
    defaultCurrency: 'INR',
    defaultTrialDays: 60,
    allowSelfRegistration: true,
    maintenanceMode: false,
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSettings();
      if (res.data) {
        setFormData({
          ...formData,
          ...res.data,
        });
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to load platform configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.updateSettings(formData);
      setToast({ type: 'success', message: 'Platform configuration saved successfully.' });
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to save platform configuration' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" label="Loading platform configuration..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <ModulePageHeader
        title="Platform"
        description="Global platform settings, branding, support contacts, and system execution parameters."
      />

      {/* Settings Navigation Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveSection('general')}
          className={`pb-3 transition-colors ${
            activeSection === 'general'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveSection('contact')}
          className={`pb-3 transition-colors ${
            activeSection === 'contact'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Contact
        </button>
        <button
          onClick={() => setActiveSection('system')}
          className={`pb-3 transition-colors ${
            activeSection === 'system'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          System
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
        {/* Section 1: General Settings */}
        {activeSection === 'general' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">General Platform Configuration</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <Input
                label="Platform Name *"
                required
                value={formData.platformName}
                onChange={(e) => setFormData({ ...formData, platformName: e.target.value })}
              />

              <Select
                label="Default Platform Currency"
                value={formData.defaultCurrency}
                onChange={(e) => setFormData({ ...formData, defaultCurrency: e.target.value })}
              >
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="EUR">EUR (€ - Euro)</option>
              </Select>
            </div>
          </div>
        )}

        {/* Section 2: Contact Information */}
        {activeSection === 'contact' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Support & Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <Input
                label="Support Email *"
                type="email"
                required
                value={formData.supportEmail}
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
              />

              <Input
                label="Support Phone *"
                required
                value={formData.supportPhone}
                onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
              />

              <Input
                label="WhatsApp Support Number *"
                required
                value={formData.whatsappNumber}
                onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Section 3: System Settings */}
        {activeSection === 'system' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">System Execution & Defaults</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <Input
                label="Default Trial Duration (Days) *"
                type="number"
                min="1"
                required
                value={formData.defaultTrialDays}
                onChange={(e) => setFormData({ ...formData, defaultTrialDays: Number(e.target.value) })}
              />

              <div className="space-y-3 pt-5">
                <label className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.allowSelfRegistration}
                    onChange={(e) => setFormData({ ...formData, allowSelfRegistration: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span>Allow Self-Registration for New Schools</span>
                </label>

                <label className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.maintenanceMode}
                    onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500"
                  />
                  <span>Platform Maintenance Mode</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <Button type="submit" variant="primary" size="sm" icon={Save} loading={submitting} loadingText="Saving...">
            Save Platform Settings
          </Button>
        </div>
      </form>
    </div>
  );
};
