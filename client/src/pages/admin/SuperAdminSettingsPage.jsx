import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, User, Star } from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';

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
    address: '',
    defaultCurrency: 'INR',
    defaultTrialDays: 30,
    allowSelfRegistration: true,
    maintenanceMode: false,
    contactPersons: [],
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminService.getSettings();
      if (res.data) {
        setFormData({
          platformName: res.data.platformName || '',
          supportEmail: res.data.supportEmail || '',
          supportPhone: res.data.supportPhone || '',
          whatsappNumber: res.data.whatsappNumber || '',
          address: res.data.address || '',
          defaultCurrency: res.data.defaultCurrency || 'INR',
          defaultTrialDays: res.data.defaultTrialDays ?? 30,
          allowSelfRegistration: res.data.allowSelfRegistration ?? true,
          maintenanceMode: res.data.maintenanceMode ?? false,
          contactPersons: Array.isArray(res.data.contactPersons)
            ? res.data.contactPersons.map((cp, idx) => ({
                id: cp.id || `temp-${idx}`,
                name: cp.name || '',
                role: cp.role || '',
                email: cp.email || '',
                phone: cp.phone || '',
                whatsapp: cp.whatsapp || '',
                isPrimary: Boolean(cp.isPrimary ?? idx === 0),
                displayOrder: cp.displayOrder ?? idx + 1,
              }))
            : [],
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

  const handleAddContactPerson = () => {
    const newPerson = {
      id: `temp-${Date.now()}`,
      name: '',
      role: '',
      email: '',
      phone: '',
      whatsapp: '',
      isPrimary: formData.contactPersons.length === 0,
      displayOrder: formData.contactPersons.length + 1,
    };
    setFormData({
      ...formData,
      contactPersons: [...formData.contactPersons, newPerson],
    });
  };

  const handleRemoveContactPerson = async (indexToRemove) => {
    const person = formData.contactPersons[indexToRemove];
    if (!person) return;

    // If already saved in the database, delete directly via API
    if (person.id && !person.id.startsWith('temp-')) {
      try {
        await adminService.deleteContactPerson(person.id);
        setToast({ type: 'success', message: `Removed "${person.name || 'Contact person'}" from database.` });
      } catch (err) {
        console.error('Error deleting contact person:', err);
        setToast({ type: 'danger', message: err.message || 'Failed to delete contact person from database.' });
        return;
      }
    }

    const updated = formData.contactPersons.filter((_, idx) => idx !== indexToRemove);
    // If the removed one was primary and list is not empty, make the first one primary
    if (updated.length > 0 && !updated.some((p) => p.isPrimary)) {
      updated[0].isPrimary = true;
    }
    setFormData((prev) => ({
      ...prev,
      contactPersons: updated,
    }));
  };

  const handleContactPersonChange = (index, field, value) => {
    const updated = [...formData.contactPersons];
    if (field === 'isPrimary' && value === true) {
      // Uncheck other primaries
      updated.forEach((p, idx) => {
        p.isPrimary = idx === index;
      });
    } else {
      updated[index][field] = value;
    }
    setFormData({
      ...formData,
      contactPersons: updated,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.updateSettings(formData);
      setToast({ type: 'success', message: 'Platform configuration saved permanently in database.' });
      // Refresh to get server assigned IDs
      await fetchSettings();
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
        title="Platform Settings"
        description="Global platform branding, multi-contact personnel directory, support channels, and system defaults (persisted securely in database)."
      />

      {/* Settings Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-4 sm:gap-6 text-xs font-bold tab-scroll-container overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveSection('general')}
          className={`pb-3 shrink-0 transition-colors ${
            activeSection === 'general'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveSection('contact')}
          className={`pb-3 shrink-0 transition-colors ${
            activeSection === 'contact'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Contact & Personnel ({formData.contactPersons.length})
        </button>
        <button
          onClick={() => setActiveSection('system')}
          className={`pb-3 shrink-0 transition-colors ${
            activeSection === 'system'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          System
        </button>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off" className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
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

        {/* Section 2: Contact Information & Multiple Contact Persons */}
        {activeSection === 'contact' && (
          <div className="space-y-6">
            {/* 2A. Contact Persons Directory */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Platform Contact Personnel Directory</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure multiple representatives (Administrators, Technical Support, Sales, Billing).
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={handleAddContactPerson}
                  className="text-xs"
                >
                  Add Contact Person
                </Button>
              </div>

              {formData.contactPersons.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                  <User className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No contact persons configured yet.</p>
                  <p className="mt-1">Click "Add Contact Person" above to add representatives.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.contactPersons.map((person, idx) => (
                    <div
                      key={person.id || idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {idx + 1}
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {person.name || `Representative #${idx + 1}`}
                          </span>
                          {person.isPrimary && (
                            <Badge variant="primary" size="sm" className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" /> Primary Contact
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold cursor-pointer">
                            <input
                              type="radio"
                              name="primaryContactRadio"
                              checked={person.isPrimary}
                              onChange={() => handleContactPersonChange(idx, 'isPrimary', true)}
                              className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Set Primary</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveContactPerson(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100/70 rounded-lg transition-colors flex items-center justify-center cursor-pointer border border-slate-200 hover:border-rose-300 shadow-2xs"
                            title="Delete Contact Person"
                          >
                            <Trash2 className="w-3.5 h-3.5 pointer-events-none text-rose-600" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <Input
                          label="Person Name *"
                          placeholder="e.g. Masud Ahmed"
                          required
                          value={person.name}
                          onChange={(e) => handleContactPersonChange(idx, 'name', e.target.value)}
                        />

                        <Input
                          label="Role / Designation *"
                          placeholder="e.g. Technical Support Lead / Administrator"
                          value={person.role}
                          onChange={(e) => handleContactPersonChange(idx, 'role', e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <Input
                          label="Email"
                          type="email"
                          placeholder="e.g. masud@axomsetu.com"
                          value={person.email}
                          onChange={(e) => handleContactPersonChange(idx, 'email', e.target.value)}
                        />

                        <Input
                          label="Phone Number"
                          placeholder="e.g. +91 98765 43210"
                          value={person.phone}
                          onChange={(e) => handleContactPersonChange(idx, 'phone', e.target.value)}
                        />

                        <Input
                          label="WhatsApp Number"
                          placeholder="e.g. +91 98765 43210"
                          value={person.whatsapp}
                          onChange={(e) => handleContactPersonChange(idx, 'whatsapp', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2B. General Platform Support Channels & Address */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Official Platform Helpdesk Channels & Address
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <Input
                  label="General Support Email *"
                  type="email"
                  required
                  value={formData.supportEmail}
                  onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                />

                <Input
                  label="General Support Phone *"
                  required
                  value={formData.supportPhone}
                  onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                />

                <Input
                  label="General WhatsApp Support *"
                  required
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                />
              </div>

              <div className="text-xs">
                <Input
                  label="Office / Headquarters Address"
                  placeholder="e.g. Guwahati, Assam, India - 781001"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
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
