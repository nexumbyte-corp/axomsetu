import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, UserPlus, Shield, ShieldCheck, ChevronDown, ArrowLeft,
  Save, AlertCircle, Search, UserCheck, UserX,
  Crown, Edit3, X, SlidersHorizontal, CreditCard,
  BookOpen, Briefcase, Wallet, PiggyBank, BarChart3, Building
} from 'lucide-react';
import { schoolUserService } from '../../services/schoolUser.service.js';
import { usePermission } from '../../hooks/usePermission.js';
import { useAuth } from '../../hooks/useAuth.js';
import { PERMISSION_PRESETS } from '../../config/permissions.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { getFormErrors } from '../../utils/errorUtils.js';

// ── Role badge component ───────────────────────────────────────────────────────
const RoleBadge = ({ role }) => {
  const config = {
    OWNER: {
      label: 'Owner',
      className: 'bg-amber-50/80 text-amber-800 border-amber-200/60',
      Icon: Crown,
    },
    SCHOOL_ADMIN: {
      label: 'School Admin',
      className: 'bg-indigo-50/80 text-indigo-700 border-indigo-200/60',
      Icon: ShieldCheck,
    },
    STAFF: {
      label: 'Staff Member',
      className: 'bg-slate-100/80 text-slate-700 border-slate-200/60',
      Icon: Shield,
    },
  };
  const { label, className, Icon } = config[role] || config.STAFF;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border ${className}`}>
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </span>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ isActive }) => (
  <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border ${
    isActive
      ? 'bg-emerald-50/70 text-emerald-700 border-emerald-200/60'
      : 'bg-slate-100 text-slate-500 border-slate-200/60'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
    {isActive ? 'Active' : 'Deactivated'}
  </span>
);

// ── Spinner ────────────────────────────────────────────────────────────────────
const Spinner = ({ size = 'sm' }) => (
  <div className={`animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 ${
    size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5'
  }`} />
);

// ── SMART PERMISSION DEPENDENCY GRAPH ─────────────────────────────────────────
// Defines all prerequisite permissions needed for a specific action to work.
// e.g. Collecting fees requires viewing students, selecting class/section, and printing receipts.
const PERMISSION_DEPENDENCIES = {
  // Fees
  FEES_COLLECT: ['FEES_VIEW', 'STUDENTS_VIEW', 'ACADEMICS_VIEW', 'FEES_PRINT_RECEIPT', 'DASHBOARD_VIEW'],
  FEES_GENERATE: ['FEES_VIEW', 'ACADEMICS_VIEW', 'STUDENTS_VIEW', 'DASHBOARD_VIEW'],
  FEES_APPLY_DISCOUNT: ['FEES_VIEW', 'STUDENTS_VIEW', 'DASHBOARD_VIEW'],
  FEES_MANAGE_STRUCTURE: ['FEES_VIEW', 'ACADEMICS_VIEW', 'DASHBOARD_VIEW'],
  FEES_PRINT_RECEIPT: ['FEES_VIEW', 'DASHBOARD_VIEW'],
  FEES_EDIT: ['FEES_VIEW', 'DASHBOARD_VIEW'],
  FEES_VIEW: ['DASHBOARD_VIEW'],

  // Students
  STUDENTS_CREATE: ['STUDENTS_VIEW', 'ACADEMICS_VIEW', 'DASHBOARD_VIEW'],
  STUDENTS_EDIT: ['STUDENTS_VIEW', 'ACADEMICS_VIEW', 'DASHBOARD_VIEW'],
  STUDENTS_PROMOTE: ['STUDENTS_VIEW', 'ACADEMICS_VIEW', 'DASHBOARD_VIEW'],
  STUDENTS_DELETE: ['STUDENTS_VIEW', 'DASHBOARD_VIEW'],
  STUDENTS_VIEW: ['DASHBOARD_VIEW'],

  // Academics
  ACADEMICS_MANAGE: ['ACADEMICS_VIEW', 'DASHBOARD_VIEW'],
  ACADEMICS_VIEW: ['DASHBOARD_VIEW'],

  // Staff & HR
  STAFF_CREATE: ['STAFF_VIEW', 'DASHBOARD_VIEW'],
  STAFF_EDIT: ['STAFF_VIEW', 'DASHBOARD_VIEW'],
  STAFF_DELETE: ['STAFF_VIEW', 'DASHBOARD_VIEW'],
  STAFF_VIEW: ['DASHBOARD_VIEW'],

  // Payroll & Salary
  SALARY_MANAGE: ['SALARY_VIEW', 'STAFF_VIEW', 'DASHBOARD_VIEW'],
  SALARY_VIEW: ['STAFF_VIEW', 'DASHBOARD_VIEW'],
  PAYROLL_PROCESS: ['PAYROLL_VIEW', 'SALARY_VIEW', 'STAFF_VIEW', 'DASHBOARD_VIEW'],
  PAYROLL_VIEW: ['STAFF_VIEW', 'DASHBOARD_VIEW'],

  // Expenses & Capital Funds
  EXPENSE_CREATE: ['EXPENSE_VIEW', 'DASHBOARD_VIEW'],
  EXPENSE_EDIT: ['EXPENSE_VIEW', 'DASHBOARD_VIEW'],
  EXPENSE_DELETE: ['EXPENSE_VIEW', 'DASHBOARD_VIEW'],
  EXPENSE_VIEW: ['DASHBOARD_VIEW'],
  FUND_CREATE: ['FUND_VIEW', 'DASHBOARD_VIEW'],
  FUND_EDIT: ['FUND_VIEW', 'DASHBOARD_VIEW'],
  FUND_VIEW: ['DASHBOARD_VIEW'],

  // Hostel
  HOSTEL_ADMIT: ['HOSTEL_VIEW', 'STUDENTS_VIEW', 'ACADEMICS_VIEW', 'DASHBOARD_VIEW'],
  HOSTEL_SETUP: ['HOSTEL_VIEW', 'DASHBOARD_VIEW'],
  HOSTEL_TRANSFER: ['HOSTEL_VIEW', 'STUDENTS_VIEW', 'DASHBOARD_VIEW'],
  HOSTEL_EXIT: ['HOSTEL_VIEW', 'STUDENTS_VIEW', 'DASHBOARD_VIEW'],
  HOSTEL_VIEW: ['DASHBOARD_VIEW'],

  // Reports
  REPORTS_EXPORT: ['REPORTS_VIEW', 'DASHBOARD_VIEW'],
  REPORTS_VIEW: ['DASHBOARD_VIEW'],

  // Users
  USERS_CREATE: ['USERS_VIEW', 'DASHBOARD_VIEW'],
  USERS_EDIT: ['USERS_VIEW', 'DASHBOARD_VIEW'],
  USERS_DISABLE: ['USERS_VIEW', 'DASHBOARD_VIEW'],
  USERS_MANAGE_PERMISSIONS: ['USERS_VIEW', 'DASHBOARD_VIEW'],
  USERS_VIEW: ['DASHBOARD_VIEW'],
};

// Transitive resolver that recursively expands dependencies
const resolvePermissionsWithDependencies = (permissionsSet) => {
  const result = new Set(permissionsSet);
  let added = true;
  while (added) {
    added = false;
    for (const perm of Array.from(result)) {
      const deps = PERMISSION_DEPENDENCIES[perm];
      if (deps) {
        for (const dep of deps) {
          if (!result.has(dep)) {
            result.add(dep);
            added = true;
          }
        }
      }
    }
  }
  return result;
};

// ── MAIN MODULES ARCHITECTURE ────────────────────────────────────────────────
// The high-level modules that school admins interact with directly.
const MAIN_MODULES_CONFIG = [
  {
    key: 'fees',
    label: 'Fee Management',
    icon: CreditCard,
    description: 'Student fee collections, receipts, dues generation, and fee structures',
    connectedSummary: 'Students & Academics',
    autoDependencies: ['STUDENTS_VIEW', 'ACADEMICS_VIEW', 'FEES_PRINT_RECEIPT', 'DASHBOARD_VIEW'],
    connectedModules: [
      { key: 'students', label: 'Students' },
      { key: 'academics', label: 'Academics' },
    ],
    viewPerms: ['FEES_VIEW'],
    managePerms: [
      'FEES_VIEW', 'FEES_COLLECT', 'FEES_PRINT_RECEIPT', 'FEES_GENERATE',
      'FEES_EDIT', 'FEES_APPLY_DISCOUNT', 'FEES_MANAGE_STRUCTURE'
    ],
  },
  {
    key: 'students',
    label: 'Students & Admissions',
    icon: Users,
    description: 'Student directory, admissions, academic transitions, and promotions',
    connectedSummary: 'Academics',
    autoDependencies: ['ACADEMICS_VIEW', 'DASHBOARD_VIEW'],
    connectedModules: [
      { key: 'academics', label: 'Academics' },
    ],
    viewPerms: ['STUDENTS_VIEW'],
    managePerms: [
      'STUDENTS_VIEW', 'STUDENTS_CREATE', 'STUDENTS_EDIT', 'STUDENTS_PROMOTE', 'STUDENTS_DELETE'
    ],
  },
  {
    key: 'academics',
    label: 'Academic Setup',
    icon: BookOpen,
    description: 'Academic sessions, classes, sections, mediums, and streams',
    autoDependencies: ['DASHBOARD_VIEW'],
    connectedModules: [],
    viewPerms: ['ACADEMICS_VIEW'],
    managePerms: ['ACADEMICS_VIEW', 'ACADEMICS_MANAGE'],
  },
  {
    key: 'staff',
    label: 'Staff Directory & HR',
    icon: Briefcase,
    description: 'Employee profiles, employee records, departments, and designations',
    autoDependencies: ['DASHBOARD_VIEW'],
    connectedModules: [],
    viewPerms: ['STAFF_VIEW'],
    managePerms: ['STAFF_VIEW', 'STAFF_CREATE', 'STAFF_EDIT', 'STAFF_DELETE'],
  },
  {
    key: 'payroll',
    label: 'Payroll & Salaries',
    icon: Wallet,
    description: 'Staff salary structures, salary advances, and monthly payroll runs',
    connectedSummary: 'Staff',
    autoDependencies: ['STAFF_VIEW', 'SALARY_VIEW', 'DASHBOARD_VIEW'],
    connectedModules: [
      { key: 'staff', label: 'Staff' },
    ],
    viewPerms: ['PAYROLL_VIEW', 'SALARY_VIEW'],
    managePerms: ['PAYROLL_VIEW', 'PAYROLL_PROCESS', 'SALARY_VIEW', 'SALARY_MANAGE'],
  },
  {
    key: 'expenses',
    label: 'Finance & Expenses',
    icon: PiggyBank,
    description: 'Operating expense vouchers, categories, and capital funds',
    autoDependencies: ['DASHBOARD_VIEW'],
    connectedModules: [],
    viewPerms: ['EXPENSE_VIEW', 'FUND_VIEW'],
    managePerms: [
      'EXPENSE_VIEW', 'EXPENSE_CREATE', 'EXPENSE_EDIT', 'EXPENSE_DELETE',
      'FUND_VIEW', 'FUND_CREATE', 'FUND_EDIT'
    ],
  },
  {
    key: 'hostel',
    label: 'Hostel Management',
    icon: Building,
    description: 'Hostels, rooms, beds, resident admissions, and transfers',
    connectedSummary: 'Students & Academics',
    autoDependencies: ['STUDENTS_VIEW', 'ACADEMICS_VIEW', 'DASHBOARD_VIEW'],
    connectedModules: [
      { key: 'students', label: 'Students' },
      { key: 'academics', label: 'Academics' },
    ],
    viewPerms: ['HOSTEL_VIEW'],
    managePerms: [
      'HOSTEL_VIEW', 'HOSTEL_SETUP', 'HOSTEL_ADMIT', 'HOSTEL_TRANSFER', 'HOSTEL_EXIT'
    ],
  },
  {
    key: 'reports',
    label: 'Reports & Analytics',
    icon: BarChart3,
    description: 'Fee collection reports, dues lists, student lists, and data exports',
    autoDependencies: ['DASHBOARD_VIEW'],
    connectedModules: [],
    viewPerms: ['REPORTS_VIEW'],
    managePerms: ['REPORTS_VIEW', 'REPORTS_EXPORT'],
  },
  {
    key: 'users',
    label: 'User Accounts & Access',
    icon: ShieldCheck,
    description: 'Staff user accounts, password resets, and access permissions',
    autoDependencies: ['DASHBOARD_VIEW'],
    connectedModules: [],
    viewPerms: ['USERS_VIEW'],
    managePerms: [
      'USERS_VIEW', 'USERS_CREATE', 'USERS_EDIT', 'USERS_DISABLE', 'USERS_MANAGE_PERMISSIONS'
    ],
  },
];

// ── Minimalist Add User Modal ─────────────────────────────────────────────────
const AddUserModal = ({ isOpen, onClose, onSuccess }) => {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add School User"
      description="Create a new login account for school staff or administrators"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-user-form"
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? <><Spinner /> Creating...</> : 'Create User'}
          </button>
        </div>
      }
    >
      <form id="add-user-form" onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. John Doe"
              className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white ${
                fieldErrors.name ? 'border-rose-300 text-rose-900' : 'border-slate-200 text-slate-900'
              }`}
            />
            {fieldErrors.name && <p className="mt-1 text-[11px] text-rose-500">{fieldErrors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="name@school.com"
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white ${
                  fieldErrors.email ? 'border-rose-300 text-rose-900' : 'border-slate-200 text-slate-900'
                }`}
              />
              {fieldErrors.email && <p className="mt-1 text-[11px] text-rose-500">{fieldErrors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white ${
                  fieldErrors.phone ? 'border-rose-300 text-rose-900' : 'border-slate-200 text-slate-900'
                }`}
              />
              {fieldErrors.phone && <p className="mt-1 text-[11px] text-rose-500">{fieldErrors.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Initial Role *</label>
              <select
                value={form.schoolRole}
                onChange={(e) => setForm(f => ({ ...f, schoolRole: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="STAFF">Staff Member (Granular Permissions)</option>
                <option value="SCHOOL_ADMIN">School Admin (Full Access)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Initial Password *</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 characters"
                className={`w-full px-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white ${
                  fieldErrors.password ? 'border-rose-300 text-rose-900' : 'border-slate-200 text-slate-900'
                }`}
              />
              {fieldErrors.password && <p className="mt-1 text-[11px] text-rose-500">{fieldErrors.password}</p>}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

// ── Minimalist Edit User Modal ────────────────────────────────────────────────
const EditUserModal = ({ user, isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [schoolRole, setSchoolRole] = useState('STAFF');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setSchoolRole(user.schoolRole || 'STAFF');
      setError('');
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      await schoolUserService.updateUser(user.id, {
        name,
        phone: phone || null,
        schoolRole: user.schoolRole === 'OWNER' ? undefined : schoolRole,
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User Profile"
      description={`Update account details for ${user.name}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-user-form"
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? <><Spinner /> Saving...</> : 'Save Changes'}
          </button>
        </div>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {user.schoolRole !== 'OWNER' && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Account Role</label>
            <select
              value={schoolRole}
              onChange={(e) => setSchoolRole(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="STAFF">Staff Member (Granular Permissions)</option>
              <option value="SCHOOL_ADMIN">School Admin (Full Access)</option>
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              {schoolRole === 'SCHOOL_ADMIN'
                ? 'School Admins have unrestricted access to all school modules.'
                : 'Staff members only have access to specifically granted module permissions.'}
            </p>
          </div>
        )}
      </form>
    </Modal>
  );
};

// ── CLEAN MODULE-BASED PERMISSION CONFIGURATOR ───────────────────────────────
const UserPermissionEditor = ({ targetUser, onBack, onSaveSuccess }) => {
  const { refreshProfile } = usePermission();
  const [permGroups, setPermGroups] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [initialPermissions, setInitialPermissions] = useState(new Set());
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedModules, setExpandedModules] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedbackNotice, setFeedbackNotice] = useState('');

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
        const perms = permsRes.data.permissions || [];
        setSelected(new Set(perms));
        setInitialPermissions(new Set(perms));
      }
    } catch (err) {
      setError(err.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  // Group lookup map for fast granular permissions
  const groupByKey = useMemo(() => {
    const map = {};
    permGroups.forEach(g => {
      map[g.key] = g;
    });
    return map;
  }, [permGroups]);

  // Map of which modules are required by other currently active modules
  const autoRequiredByMap = useMemo(() => {
    const map = {};
    MAIN_MODULES_CONFIG.forEach(parentMod => {
      const isParentActive = parentMod.managePerms.some(p => selected.has(p));
      if (isParentActive && parentMod.connectedModules) {
        parentMod.connectedModules.forEach(conn => {
          if (!map[conn.key]) map[conn.key] = [];
          if (!map[conn.key].includes(parentMod.label)) {
            map[conn.key].push(parentMod.label);
          }
        });
      }
    });
    return map;
  }, [selected]);

  // Determine current access level of each module
  const getModuleState = useCallback((mod) => {
    const groupData = groupByKey[mod.key];
    const assignable = groupData
      ? groupData.permissions.filter(p => !p.systemRestricted).map(p => p.key)
      : mod.managePerms;

    const granted = assignable.filter(k => selected.has(k));
    const isRequiredByOthers = Boolean(autoRequiredByMap[mod.key]?.length > 0);

    if (granted.length === 0) {
      return {
        level: 'NONE',
        isAutoConnected: false,
        requiredBy: [],
        grantedCount: 0,
        totalCount: assignable.length
      };
    }

    if (granted.length === assignable.length) {
      return {
        level: 'FULL',
        isAutoConnected: false,
        requiredBy: autoRequiredByMap[mod.key] || [],
        grantedCount: granted.length,
        totalCount: assignable.length
      };
    }

    const isViewOnly = mod.viewPerms.every(k => selected.has(k)) &&
      granted.every(k => mod.viewPerms.includes(k));

    if (isViewOnly) {
      return {
        level: 'VIEW',
        isAutoConnected: isRequiredByOthers,
        requiredBy: autoRequiredByMap[mod.key] || [],
        grantedCount: granted.length,
        totalCount: assignable.length
      };
    }

    return {
      level: 'CUSTOM',
      isAutoConnected: false,
      requiredBy: autoRequiredByMap[mod.key] || [],
      grantedCount: granted.length,
      totalCount: assignable.length
    };
  }, [groupByKey, selected, autoRequiredByMap]);

  // Set access level for a main module: 'NONE' | 'VIEW' | 'FULL'
  const handleSetModuleAccess = (moduleConfig, level) => {
    setSelected(prev => {
      const next = new Set(prev);
      const groupData = groupByKey[moduleConfig.key];
      const allModulePerms = groupData
        ? groupData.permissions.map(p => p.key)
        : moduleConfig.managePerms;

      if (level === 'NONE') {
        // Remove permissions belonging to this module
        allModulePerms.forEach(p => next.delete(p));

        // Intelligently prune auto-dependencies that are no longer needed
        if (moduleConfig.autoDependencies) {
          const remainingPermissions = new Set(next);
          moduleConfig.autoDependencies.forEach(depPerm => {
            if (depPerm === 'DASHBOARD_VIEW') return;

            const neededByOther = MAIN_MODULES_CONFIG.some(otherMod => {
              if (otherMod.key === moduleConfig.key) return false;
              const isOtherActive = otherMod.managePerms.some(k => remainingPermissions.has(k));
              return isOtherActive && otherMod.autoDependencies?.includes(depPerm);
            });

            const owningMod = MAIN_MODULES_CONFIG.find(m => m.managePerms.includes(depPerm));
            const owningModHasOtherActivePerms = owningMod && owningMod.managePerms.some(
              k => k !== depPerm && !k.endsWith('_VIEW') && remainingPermissions.has(k)
            );

            if (!neededByOther && !owningModHasOtherActivePerms) {
              next.delete(depPerm);
            }
          });
        }

        if (next.size === 1 && next.has('DASHBOARD_VIEW')) {
          next.delete('DASHBOARD_VIEW');
        }

        setFeedbackNotice(`Disabled ${moduleConfig.label}.`);
        setTimeout(() => setFeedbackNotice(''), 3000);
        return next;
      }

      // level === 'VIEW' | 'FULL'
      let toAdd = [];
      if (level === 'VIEW') {
        toAdd = [...moduleConfig.viewPerms, 'DASHBOARD_VIEW'];
      } else if (level === 'FULL') {
        toAdd = groupData
          ? groupData.permissions.filter(p => !p.systemRestricted).map(p => p.key)
          : moduleConfig.managePerms;
        if (moduleConfig.autoDependencies) {
          toAdd = [...toAdd, ...moduleConfig.autoDependencies];
        }
      }

      toAdd.forEach(p => next.add(p));
      const resolved = resolvePermissionsWithDependencies(next);

      if (level === 'FULL' && moduleConfig.connectedModules?.length > 0) {
        const names = moduleConfig.connectedModules.map(m => m.label).join(' & ');
        setFeedbackNotice(`Auto-linked ${names} for ${moduleConfig.label}.`);
        setTimeout(() => setFeedbackNotice(''), 3500);
      } else {
        setFeedbackNotice(`Updated ${moduleConfig.label}.`);
        setTimeout(() => setFeedbackNotice(''), 3000);
      }

      return resolved;
    });
  };

  // Toggle individual granular permission within a module
  const handleToggleGranularPermission = (permKey, isRestricted) => {
    if (isRestricted) return;

    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(permKey)) {
        next.delete(permKey);
        return next;
      } else {
        next.add(permKey);
        return resolvePermissionsWithDependencies(next);
      }
    });
  };

  // 1-Click Role Presets
  const applyPreset = (presetKey) => {
    const preset = PERMISSION_PRESETS[presetKey];
    if (!preset) return;
    const resolved = resolvePermissionsWithDependencies(preset.permissions);
    setSelected(resolved);
    setFeedbackNotice(`Applied template: ${preset.label}.`);
    setTimeout(() => setFeedbackNotice(''), 3500);
  };

  const handleSelectAll = () => {
    const allKeys = [];
    permGroups.forEach(g => {
      g.permissions.forEach(p => {
        if (!p.systemRestricted) allKeys.push(p.key);
      });
    });
    setSelected(resolvePermissionsWithDependencies(allKeys));
    setFeedbackNotice('All modules enabled.');
    setTimeout(() => setFeedbackNotice(''), 3000);
  };

  const handleClearAll = () => {
    setSelected(new Set());
    setFeedbackNotice('All module permissions cleared.');
    setTimeout(() => setFeedbackNotice(''), 3000);
  };

  const handleReset = () => {
    setSelected(new Set(initialPermissions));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await schoolUserService.setUserPermissions(targetUser.id, Array.from(selected));
      setInitialPermissions(new Set(selected));
      setFeedbackNotice('Permissions saved successfully.');
      setTimeout(() => setFeedbackNotice(''), 3000);
      onSaveSuccess?.();
      refreshProfile?.();
    } catch (err) {
      setError(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const toggleModuleExpand = (moduleKey) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleKey]: !prev[moduleKey],
    }));
  };

  const hasUnsavedChanges = useMemo(() => {
    if (selected.size !== initialPermissions.size) return true;
    for (let item of selected) {
      if (!initialPermissions.has(item)) return true;
    }
    return false;
  }, [selected, initialPermissions]);

  // Metric counts
  const activeModulesCount = useMemo(() => {
    return MAIN_MODULES_CONFIG.filter(mod => {
      const state = getModuleState(mod);
      return state.level !== 'NONE';
    }).length;
  }, [getModuleState]);

  // Filter modules based on search
  const filteredModules = useMemo(() => {
    const term = searchFilter.toLowerCase().trim();
    if (!term) return MAIN_MODULES_CONFIG;

    return MAIN_MODULES_CONFIG.filter(mod => {
      if (mod.label.toLowerCase().includes(term)) return true;
      if (mod.description.toLowerCase().includes(term)) return true;
      const groupData = groupByKey[mod.key];
      if (groupData) {
        return groupData.permissions.some(p =>
          p.label.toLowerCase().includes(term) ||
          p.key.toLowerCase().includes(term) ||
          (p.description && p.description.toLowerCase().includes(term))
        );
      }
      return false;
    });
  }, [searchFilter, groupByKey]);

  // Check if current permissions match any preset
  const matchedPresetKey = useMemo(() => {
    for (const [key, preset] of Object.entries(PERMISSION_PRESETS)) {
      const resolvedPreset = resolvePermissionsWithDependencies(preset.permissions);
      if (resolvedPreset.size === selected.size && [...resolvedPreset].every(p => selected.has(p))) {
        return key;
      }
    }
    return '';
  }, [selected]);

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-24">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shrink-0"
            title="Back to Users"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-slate-900">{targetUser.name}</h1>
              <RoleBadge role={targetUser.schoolRole} />
              <StatusBadge isActive={targetUser.isActive} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {targetUser.email} · Configure accessible modules and permissions
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <select
            value={matchedPresetKey}
            onChange={(e) => {
              if (e.target.value) applyPreset(e.target.value);
            }}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Role template...</option>
            {Object.entries(PERMISSION_PRESETS).map(([k, p]) => (
              <option key={k} value={k}>
                {p.label}
              </option>
            ))}
          </select>

          {hasUnsavedChanges && (
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Discard
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={saving || loading || !hasUnsavedChanges}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-2xs"
          >
            {saving ? <><Spinner /> Saving...</> : <><Save className="w-3.5 h-3.5" /> Save Changes</>}
          </button>
        </div>
      </div>

      {/* Subtle Feedback Banner */}
      {feedbackNotice && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium animate-in fade-in">
          <span>{feedbackNotice}</span>
          <button onClick={() => setFeedbackNotice('')} className="text-slate-400 hover:text-slate-600 ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Unified Module Settings Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {/* Table Controls Header */}
        <div className="p-3 sm:px-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search modules..."
              className="w-full pl-8 pr-3 py-1 text-xs rounded-md border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="font-medium text-slate-700">
              {activeModulesCount} of {MAIN_MODULES_CONFIG.length} enabled
            </span>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-indigo-600 hover:underline font-medium"
            >
              Enable all
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-slate-500 hover:text-rose-600 hover:underline font-medium"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Module Rows List */}
        {loading ? (
          <div className="p-10 text-center text-slate-500 space-y-2">
            <Spinner size="md" />
            <p className="text-xs">Loading permissions...</p>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-xs">
            No matching modules found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredModules.map((mod) => {
              const IconComp = mod.icon;
              const state = getModuleState(mod);
              const isExpanded = Boolean(expandedModules[mod.key]);
              const groupData = groupByKey[mod.key];
              const granularItems = groupData ? groupData.permissions : [];

              return (
                <div key={mod.key} className="transition-colors hover:bg-slate-50/40">
                  <div className="p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Icon, Name, Description, and Quiet Auto-link Note */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                        <IconComp className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900">{mod.label}</span>

                          {state.isAutoConnected && (
                            <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                              Auto-linked for {state.requiredBy.join(', ')}
                            </span>
                          )}

                          {state.level === 'CUSTOM' && (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Custom ({state.grantedCount}/{state.totalCount})
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                          {mod.description}
                        </p>

                        {/* Quiet footnote when this module provides auto-linked access to others */}
                        {state.level === 'FULL' && mod.connectedSummary && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Auto-includes read access to {mod.connectedSummary}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Clean 3-way Segmented Control & Inline Customize link */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleSetModuleAccess(mod, 'NONE')}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            state.level === 'NONE'
                              ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          None
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetModuleAccess(mod, 'VIEW')}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            state.level === 'VIEW'
                              ? state.isAutoConnected
                                ? 'bg-white text-indigo-700 font-semibold shadow-2xs'
                                : 'bg-white text-slate-900 font-semibold shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          {state.isAutoConnected ? 'View (Linked)' : 'View'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetModuleAccess(mod, 'FULL')}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            state.level === 'FULL'
                              ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          Full
                        </button>
                      </div>

                      {granularItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleModuleExpand(mod.key)}
                          className={`px-2 py-1 text-xs rounded-md font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 ${
                            isExpanded ? 'bg-slate-100 text-slate-900' : ''
                          }`}
                          title="Customize individual permissions"
                        >
                          <span>Customize</span>
                          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Granular Checklist Drawer */}
                  {isExpanded && granularItems.length > 0 && (
                    <div className="bg-slate-50/70 border-t border-slate-100 px-4 py-3 sm:pl-14 sm:pr-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {granularItems.map((perm) => {
                          const isChecked = selected.has(perm.key);
                          const isRestricted = perm.systemRestricted;

                          return (
                            <label
                              key={perm.key}
                              className={`flex items-start gap-2 p-2 rounded-md transition-colors text-xs select-none ${
                                isRestricted
                                  ? 'opacity-60 cursor-not-allowed'
                                  : 'hover:bg-white cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={isRestricted}
                                checked={isChecked}
                                onChange={() => handleToggleGranularPermission(perm.key, isRestricted)}
                                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                              />
                              <div className="min-w-0">
                                <span className={`font-medium block leading-tight ${isChecked ? 'text-slate-900' : 'text-slate-700'}`}>
                                  {perm.label}
                                  {isRestricted && <span className="text-[10px] text-amber-700 ml-1 font-normal">(Admin only)</span>}
                                </span>
                                {perm.description && (
                                  <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                                    {perm.description}
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Save Action Bar (Minimalist) */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-800 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <span className="text-xs text-slate-200">
            Unsaved changes ({activeModulesCount} modules enabled)
          </span>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="text-xs text-slate-400 hover:text-white font-medium px-2 py-1 rounded transition-colors"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            {saving ? <><Spinner size="sm" /> Saving...</> : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

// ── MAIN USERS MANAGEMENT PAGE ────────────────────────────────────────────────
export const SchoolUsersPage = () => {
  const { can, isOwner, hasFullAccess } = usePermission();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState(null);

  const [statusLoading, setStatusLoading] = useState({});

  const canCreate = hasFullAccess || can('USERS_CREATE');
  const canManagePerms = hasFullAccess || can('USERS_MANAGE_PERMISSIONS');
  const canDisable = hasFullAccess || can('USERS_DISABLE');
  const canEditUser = hasFullAccess || can('USERS_EDIT');

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

  // Counts for filter pills
  const counts = useMemo(() => {
    return {
      all: users.length,
      staff: users.filter(u => u.schoolRole === 'STAFF').length,
      admin: users.filter(u => u.schoolRole === 'SCHOOL_ADMIN').length,
      owner: users.filter(u => u.schoolRole === 'OWNER').length,
    };
  }, [users]);

  // If a user is selected for granular permissions, render UserPermissionEditor
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
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Users & Access Control</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage school staff accounts, administrative roles, and module access permissions
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs shrink-0 self-start sm:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add User
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users by name, email, or phone..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white placeholder-slate-400"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Minimalist Segmented Tabs */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs shrink-0">
          {[
            { key: 'ALL', label: `All (${counts.all})` },
            { key: 'STAFF', label: `Staff (${counts.staff})` },
            { key: 'SCHOOL_ADMIN', label: `Admins (${counts.admin})` },
            { key: 'OWNER', label: `Owner (${counts.owner})` },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setRoleFilter(tab.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                roleFilter === tab.key
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
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
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200/80 text-rose-700 text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
          <button onClick={loadUsers} className="ml-auto text-xs text-rose-600 font-bold hover:underline">Retry</button>
        </div>
      )}

      {/* Users Directory Table / Cards */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-2">
          <Spinner size="md" />
          <p className="text-xs text-slate-500 font-medium">Loading school users...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
          <Users className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No school users found</p>
          <p className="text-xs text-slate-400">
            {search ? 'Try clearing search filters.' : 'Add your first school staff member or administrator.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden divide-y divide-slate-100">
          {filteredUsers.map((u) => {
            const isCurrentUser = u.userId === currentUser?.id;
            const canModifyThisUser = (hasFullAccess || canEditUser) && !isCurrentUser && u.schoolRole !== 'OWNER';
            const canToggleStatus = (hasFullAccess || canDisable) && !isCurrentUser && (u.schoolRole !== 'OWNER' || isOwner);
            const canConfigurePerms = (hasFullAccess || canManagePerms) && u.schoolRole === 'STAFF';

            return (
              <div
                key={u.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors"
              >
                {/* User Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${
                    u.schoolRole === 'OWNER'
                      ? 'bg-amber-100/70 text-amber-800 border-amber-200'
                      : u.schoolRole === 'SCHOOL_ADMIN'
                        ? 'bg-indigo-100/70 text-indigo-800 border-indigo-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {u.name?.charAt(0)?.toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm text-slate-900 truncate">{u.name}</span>
                      {isCurrentUser && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">You</span>
                      )}
                      <RoleBadge role={u.schoolRole} />
                      <StatusBadge isActive={u.isActive} />
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {u.email} {u.phone ? `· ${u.phone}` : ''}
                    </p>
                  </div>
                </div>

                {/* Permissions & Actions Area */}
                <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                  {/* Access summary badge */}
                  {u.schoolRole === 'OWNER' || u.schoolRole === 'SCHOOL_ADMIN' ? (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                      Full Access
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                      {u.permissions.length === 0
                        ? 'No access assigned'
                        : `${u.permissions.length} permissions`}
                    </span>
                  )}

                  {/* Configure Permissions for STAFF */}
                  {canConfigurePerms && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserForAccess(u)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                      title="Configure Permissions"
                    >
                      <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                      <span>Configure Access</span>
                    </button>
                  )}

                  {/* Edit User Button */}
                  {canModifyThisUser && (
                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      title="Edit Profile & Role"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Status Toggle Switch */}
                  {canToggleStatus && (
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(u)}
                      disabled={!!statusLoading[u.id]}
                      title={u.isActive ? 'Deactivate account' : 'Activate account'}
                      className={`p-1 rounded-lg border transition-colors ${
                        u.isActive
                          ? 'border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                          : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      }`}
                    >
                      {statusLoading[u.id] ? (
                        <Spinner />
                      ) : u.isActive ? (
                        <UserX className="w-3.5 h-3.5" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => { loadUsers(); }}
      />

      {/* Edit User Modal */}
      <EditUserModal
        user={editingUser}
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        onSuccess={() => { loadUsers(); }}
      />
    </div>
  );
};
