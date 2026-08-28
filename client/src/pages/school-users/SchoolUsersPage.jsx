import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, UserPlus, Shield, ShieldCheck, ChevronRight, ArrowLeft, Check,
  Lock, Save, AlertCircle, Search, UserCheck, UserX, Settings2,
  BadgeCheck, Crown, Sparkles, BookOpen, CreditCard, Briefcase, Wallet, BarChart3, X
} from 'lucide-react';
import { schoolUserService } from '../../services/schoolUser.service.js';
import { usePermission } from '../../hooks/usePermission.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSION_PRESETS } from '../../config/permissions.js';

import { getFormErrors } from '../../utils/errorUtils.js';

// ── Icon Mapper for Permission Groups ──────────────────────────────────────────
const GROUP_ICONS = {
  dashboard: BarChart3,
  students: Users,
  fees: CreditCard,
  staff: Briefcase,
  payroll: Wallet,
  expenses: Wallet,
  academics: BookOpen,
  reports: BarChart3,
  users: ShieldCheck,
  hostel: BuildingIcon,
};

function BuildingIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" /><path d="M16 6h.01" />
      <path d="M8 10h.01" /><path d="M16 10h.01" />
      <path d="M8 14h.01" /><path d="M16 14h.01" />
    </svg>
  );
}

// ── Role badge component ───────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const config = {
    OWNER: { label: 'Owner', className: 'bg-amber-50 text-amber-800 border border-amber-200/80', Icon: Crown },
    SCHOOL_ADMIN: { label: 'School Admin', className: 'bg-indigo-50 text-indigo-700 border border-indigo-200/80', Icon: ShieldCheck },
    STAFF: { label: 'Staff / User', className: 'bg-slate-100 text-slate-700 border border-slate-200', Icon: Shield },
  };
  const { label, className, Icon } = config[role] || config.STAFF;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${className}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ isActive }) => (
  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80' : 'bg-rose-50 text-rose-700 border border-rose-200/80'
    }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
    {isActive ? 'Active Access' : 'Inactive'}
  </span>
);

// ── Spinner ────────────────────────────────────────────────────────────────────
const Spinner = ({ size = 'sm' }) => (
  <div className={`animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 ${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'
    }`} />
);

// ── Add User Inline Panel ─────────────────────────────────────────────────────
const AddUserPanel = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '', schoolRole: 'STAFF',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});
    setLoading(true);
    try {
      await schoolUserService.createUser(form);
      setForm({ name: '', email: '', phone: '', password: '', schoolRole: 'STAFF' });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create user account');
      setFieldErrors(getFormErrors(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-sm mb-6 transition-all animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Add New School User</h2>
            <p className="text-xs text-slate-500">Create a user account and set their role</p>
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="text-xs text-rose-700 font-medium">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name *</label>
            <input
              type="text" required autoComplete="off" value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full Name"
              className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 ${
                fieldErrors.name ? 'border-rose-300 text-rose-900 placeholder-rose-300' : 'border-slate-200'
              }`}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address *</label>
            <input
              type="email" required autoComplete="off" value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="Email Address"
              className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 ${
                fieldErrors.email ? 'border-rose-300 text-rose-900 placeholder-rose-300' : 'border-slate-200'
              }`}
            />
            {fieldErrors.email && <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
            <input
              type="tel" autoComplete="off" value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="Phone Number"
              className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 ${
                fieldErrors.phone ? 'border-rose-300 text-rose-900 placeholder-rose-300' : 'border-slate-200'
              }`}
            />
            {fieldErrors.phone && <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.phone}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role Type *</label>
            <select
              value={form.schoolRole} autoComplete="off"
              onChange={(e) => setForm(f => ({ ...f, schoolRole: e.target.value }))}
              className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${
                fieldErrors.schoolRole ? 'border-rose-300 text-rose-900' : 'border-slate-200'
              }`}
            >
              <option value="STAFF">Staff / User (Custom Permissions)</option>
              <option value="SCHOOL_ADMIN">School Admin (Full Access)</option>
            </select>
            {fieldErrors.schoolRole && <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.schoolRole}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Initial Password *</label>
            <input
              type="password" required minLength={6} autoComplete="new-password" value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Password"
              className={`w-full px-3.5 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 ${
                fieldErrors.password ? 'border-rose-300 text-rose-900 placeholder-rose-300' : 'border-slate-200'
              }`}
            />
            {fieldErrors.password && <p className="mt-1 text-xs text-rose-500 font-medium">{fieldErrors.password}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50">
            {loading ? <><Spinner /> Creating Account...</> : 'Create User Account'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── STREAMLINED USER PERMISSION EDITOR VIEW ────────────────────────────────────
const UserPermissionEditor = ({ targetUser, onBack, onSaveSuccess }) => {
  const { refreshProfile } = usePermission();
  const [permGroups, setPermGroups] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [initialPermissions, setInitialPermissions] = useState(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  useEffect(() => {
    if (!targetUser) return;
    loadPermissionData();
  }, [targetUser]);

  const loadPermissionData = async () => {
    setLoading(true);
    setError('');
    try {
      const [groupsRes, permsRes] = await Promise.all([
        schoolUserService.getPermissionGroups(),
        schoolUserService.getUserPermissions(targetUser.id),
      ]);
      if (groupsRes.success) {
        setPermGroups(groupsRes.data);
      }
      if (permsRes.success) {
        const setObj = new Set(permsRes.data.permissions);
        setSelected(setObj);
        setInitialPermissions(new Set(permsRes.data.permissions));
      }
    } catch (err) {
      setError(err.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permKey, isRestricted) => {
    if (isRestricted) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(permKey)) next.delete(permKey);
      else next.add(permKey);
      return next;
    });
  };

  const toggleModuleAll = (group) => {
    const assignableKeys = group.permissions.filter(p => !p.systemRestricted).map(p => p.key);
    const allSelected = assignableKeys.every(k => selected.has(k));

    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) {
        assignableKeys.forEach(k => next.delete(k));
      } else {
        assignableKeys.forEach(k => next.add(k));
      }
      return next;
    });
  };

  const applyPreset = (permissions) => {
    setSelected(new Set(permissions));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await schoolUserService.setUserPermissions(targetUser.id, Array.from(selected));
      setInitialPermissions(new Set(selected));
      setSuccessToast('Permissions updated successfully!');
      setTimeout(() => setSuccessToast(''), 3500);
      onSaveSuccess?.();
      refreshProfile?.();
    } catch (err) {
      setError(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges = useMemo(() => {
    if (selected.size !== initialPermissions.size) return true;
    for (let item of selected) {
      if (!initialPermissions.has(item)) return true;
    }
    return false;
  }, [selected, initialPermissions]);

  const filteredGroups = permGroups.map(group => {
    if (!searchFilter.trim()) return group;
    const term = searchFilter.toLowerCase().trim();
    const matching = group.permissions.filter(p =>
      p.label.toLowerCase().includes(term) ||
      (p.description && p.description.toLowerCase().includes(term)) ||
      p.key.toLowerCase().includes(term)
    );
    if (matching.length > 0 || group.label.toLowerCase().includes(term)) {
      return { ...group, permissions: matching.length > 0 ? matching : group.permissions };
    }
    return null;
  }).filter(Boolean);

  return (
    <div className="space-y-5 animate-in fade-in duration-150 max-w-6xl mx-auto">
      {/* Sleek Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 hover:text-slate-900 shrink-0"
            title="Back to User List"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200/80 shrink-0">
              {targetUser.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-slate-900">{targetUser.name}</h1>
                <RoleBadge role={targetUser.schoolRole} />
                <StatusBadge isActive={targetUser.isActive} />
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{targetUser.email} {targetUser.phone ? `· ${targetUser.phone}` : ''}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center">
          {hasUnsavedChanges && (
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/80 animate-pulse">
              Unsaved changes
            </span>
          )}

          <button
            onClick={onBack}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50"
          >
            {saving ? <><Spinner /> Saving...</> : <><Save className="w-3.5 h-3.5" /> Save Permissions</>}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successToast && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Compact Quick Role Presets */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Role Presets</h3>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">(1-Click Preconfigured Access)</span>
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
          >
            Clear All
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(PERMISSION_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(preset.permissions)}
              title={preset.description}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 hover:text-indigo-700 transition-all text-xs font-semibold flex items-center gap-1.5 group"
            >
              <span>{preset.label}</span>
              {preset.badge && (
                <span className="text-[9px] font-extrabold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded">
                  {preset.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Permissions Counter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoComplete="off"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search permissions by keyword (e.g. fees, admissions, payroll)..."
            className="w-full pl-10 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500">
            Granted: <strong className="text-indigo-600 font-bold">{selected.size}</strong> permissions
          </span>
        </div>
      </div>

      {/* Permissions Module Cards Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs space-y-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-500 font-semibold">Loading access permissions matrix...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGroups.map((group) => {
            const IconComponent = GROUP_ICONS[group.key] || Shield;
            const assignablePerms = group.permissions.filter(p => !p.systemRestricted);
            const enabledCount = assignablePerms.filter(p => selected.has(p.key)).length;
            const isAllModuleSelected = assignablePerms.length > 0 && enabledCount === assignablePerms.length;

            return (
              <div key={group.key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
                {/* Module Header */}
                <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-slate-900">{group.label}</h3>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.2 rounded-full border border-indigo-100">
                          {enabledCount}/{assignablePerms.length} enabled
                        </span>
                      </div>
                    </div>
                  </div>

                  {assignablePerms.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleModuleAll(group)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors border ${isAllModuleSelected
                          ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                      {isAllModuleSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  )}
                </div>

                {/* Module Items */}
                <div className="divide-y divide-slate-100 flex-1 bg-white">
                  {group.permissions.map((perm) => {
                    const isChecked = selected.has(perm.key);
                    const isRestricted = perm.systemRestricted;

                    return (
                      <div
                        key={perm.key}
                        onClick={() => togglePermission(perm.key, isRestricted)}
                        className={`p-3 flex items-start gap-3 transition-colors ${isRestricted
                            ? 'bg-amber-50/20 cursor-not-allowed'
                            : 'cursor-pointer hover:bg-slate-50/80'
                          }`}
                      >
                        {/* Custom Toggle Switch */}
                        {isRestricted ? (
                          <div className="w-4 h-4 rounded bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
                            <Lock className="w-2.5 h-2.5" />
                          </div>
                        ) : (
                          <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors shrink-0 mt-0.5 ${isChecked ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}>
                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-2xs transition-transform ${isChecked ? 'translate-x-3.5' : 'translate-x-0'
                              }`} />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                              {perm.label}
                            </span>
                            {isRestricted && (
                              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200 inline-flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Owner & Admin Only
                              </span>
                            )}
                          </div>
                          {perm.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{perm.description}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── MAIN USERS PAGE ───────────────────────────────────────────────────────────
export const SchoolUsersPage = () => {
  const { can, isOwner, isSchoolAdmin: _isSchoolAdmin, hasFullAccess } = usePermission();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState(null);

  const [statusLoading, setStatusLoading] = useState({});

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await schoolUserService.listUsers({ search: search || undefined });
      if (res.success) setUsers(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = async (user) => {
    if (user.schoolRole === 'OWNER' && !isOwner) return;
    const newStatus = !user.isActive;
    setStatusLoading(s => ({ ...s, [user.id]: true }));
    try {
      await schoolUserService.updateUserStatus(user.id, newStatus);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u));
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    } finally {
      setStatusLoading(s => ({ ...s, [user.id]: false }));
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'ALL' && u.schoolRole !== roleFilter) return false;
      return true;
    });
  }, [users, roleFilter]);

  const canManage = hasFullAccess;
  const canCreate = hasFullAccess && can('USERS_CREATE');

  // If a user is selected for access management, render UserPermissionEditor
  if (selectedUserForAccess) {
    return (
      <UserPermissionEditor
        targetUser={selectedUserForAccess}
        onBack={() => setSelectedUserForAccess(null)}
        onSaveSuccess={() => { loadUsers(); }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Users & Access Control</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage school user accounts, roles, and module access permissions
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsAddPanelOpen(!isAddPanelOpen)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            {isAddPanelOpen ? 'Close Panel' : 'Add User'}
          </button>
        )}
      </div>

      {/* Collapsible Add User Panel */}
      <AddUserPanel
        isOpen={isAddPanelOpen}
        onClose={() => setIsAddPanelOpen(false)}
        onSuccess={() => { loadUsers(); }}
      />

      {/* Stats Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total School Users</p>
            <p className="text-lg font-extrabold text-slate-900">{users.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Staff</p>
            <p className="text-lg font-extrabold text-slate-900">
              {users.filter(u => u.isActive && u.schoolRole === 'STAFF').length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Admins & Owners</p>
            <p className="text-lg font-extrabold text-slate-900">
              {users.filter(u => u.schoolRole === 'OWNER' || u.schoolRole === 'SCHOOL_ADMIN').length}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            autoComplete="off"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
          {[
            { key: 'ALL', label: 'All Users' },
            { key: 'STAFF', label: 'Staff' },
            { key: 'SCHOOL_ADMIN', label: 'Admins' },
            { key: 'OWNER', label: 'Owners' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setRoleFilter(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${roleFilter === tab.key
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <p>{error}</p>
          <button onClick={loadUsers} className="ml-auto text-xs text-rose-600 font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* User Directory List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-2xs space-y-3">
          <Spinner size="lg" />
          <p className="text-xs text-slate-500 font-semibold">Loading school users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
            <Users className="w-8 h-8" />
          </div>
          <p className="text-slate-700 font-bold text-sm">No users match your criteria</p>
          <p className="text-slate-400 text-xs mt-1">
            {search ? 'Try clearing search filters.' : 'Add your first staff user account.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((u) => {
            const isCurrentUser = u.userId === currentUser?.id;
            const canModify = canManage && !isCurrentUser && u.schoolRole !== 'OWNER';
            const canModifyOwner = isOwner && u.schoolRole === 'OWNER' && !isCurrentUser;

            return (
              <div
                key={u.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 hover:border-indigo-200 transition-all shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* User Profile Summary */}
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 border ${u.schoolRole === 'OWNER' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                        u.schoolRole === 'SCHOOL_ADMIN' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                      {u.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-bold text-slate-900 text-sm truncate">{u.name}</span>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">You</span>
                        )}
                        <RoleBadge role={u.schoolRole} />
                        <StatusBadge isActive={u.isActive} />
                      </div>
                      <p className="text-xs text-slate-500 truncate">{u.email} {u.phone ? `· ${u.phone}` : ''}</p>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Status Toggle */}
                    {(canModify || canModifyOwner) && (
                      <button
                        onClick={() => handleToggleStatus(u)}
                        disabled={!!statusLoading[u.id]}
                        title={u.isActive ? 'Deactivate access' : 'Activate access'}
                        className={`p-2 rounded-xl transition-colors text-xs border ${u.isActive
                            ? 'text-rose-600 border-rose-200 bg-rose-50/50 hover:bg-rose-100/80'
                            : 'text-emerald-700 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/80'
                          } disabled:opacity-40`}
                      >
                        {statusLoading[u.id] ? <Spinner /> : u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    )}

                    {/* Dedicated Manage Access Button for STAFF */}
                    {canModify && u.schoolRole === 'STAFF' && (
                      <button
                        onClick={() => setSelectedUserForAccess(u)}
                        className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200/80 hover:bg-indigo-100 transition-colors shadow-2xs"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        Configure Access
                        <ChevronRight className="w-3.5 h-3.5 text-indigo-500" />
                      </button>
                    )}

                    {/* Full Access badge for admin/owner */}
                    {(u.schoolRole === 'OWNER' || u.schoolRole === 'SCHOOL_ADMIN') && (
                      <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-xl font-semibold">
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Full Access
                      </span>
                    )}
                  </div>
                </div>

                {/* Granted Access Summary Pills for STAFF */}
                {u.schoolRole === 'STAFF' && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Granted Access:</span>
                      {u.permissions.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No permissions assigned yet</span>
                      ) : u.permissions.length <= 4 ? (
                        u.permissions.map(p => (
                          <span key={p} className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium border border-slate-200/60">
                            {p.replace(/_/g, ' ')}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-indigo-700 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          {u.permissions.length} module permissions enabled
                        </span>
                      )}
                    </div>

                    {canModify && (
                      <button
                        onClick={() => setSelectedUserForAccess(u)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Edit Access →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
