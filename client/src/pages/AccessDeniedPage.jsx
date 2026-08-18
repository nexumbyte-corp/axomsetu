import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldOff, ArrowLeft, Home } from 'lucide-react';
import { usePermission } from '../hooks/usePermission.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';

const PERMISSION_LABELS = {
  DASHBOARD_VIEW: 'View Dashboard',
  STUDENTS_VIEW: 'View Students',
  STUDENTS_CREATE: 'Add Students',
  STUDENTS_EDIT: 'Edit Students',
  STUDENTS_PROMOTE: 'Promote Students',
  STUDENTS_DELETE: 'Delete Students',
  ACADEMICS_VIEW: 'View Academic Setup',
  ACADEMICS_MANAGE: 'Manage Academics',
  FEES_VIEW: 'View Fees',
  FEES_COLLECT: 'Collect Fees',
  FEES_GENERATE: 'Generate Fees',
  FEES_EDIT: 'Edit Fees',
  FEES_APPLY_DISCOUNT: 'Apply Discounts',
  FEES_PRINT_RECEIPT: 'Print Receipts',
  FEES_MANAGE_STRUCTURE: 'Manage Fee Structure',
  STAFF_VIEW: 'View Staff',
  STAFF_CREATE: 'Add Staff',
  STAFF_EDIT: 'Edit Staff',
  STAFF_DELETE: 'Delete Staff',
  PAYROLL_VIEW: 'View Payroll',
  PAYROLL_PROCESS: 'Process Payroll',
  EXPENSE_VIEW: 'View Expenses',
  EXPENSE_CREATE: 'Add Expenses',
  EXPENSE_EDIT: 'Edit Expenses',
  EXPENSE_DELETE: 'Delete Expenses',
  FUND_VIEW: 'View Funds',
  FUND_CREATE: 'Add Funds',
  FUND_EDIT: 'Edit Funds',
  REPORTS_VIEW: 'View Reports',
  REPORTS_EXPORT: 'Export Reports',
  USERS_VIEW: 'View Users',
  USERS_CREATE: 'Create Users',
  USERS_EDIT: 'Edit Users',
  USERS_DISABLE: 'Deactivate Users',
  USERS_MANAGE_PERMISSIONS: 'Manage Permissions',
  SETTINGS_VIEW: 'View Settings',
  SETTINGS_EDIT: 'Edit Settings',
};

export const AccessDeniedPage = ({ missingPermission }) => {
  useDocumentTitle('Access Denied');
  const navigate = useNavigate();
  const { roleLabel } = usePermission();

  const permLabel = missingPermission ? PERMISSION_LABELS[missingPermission] || missingPermission : null;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
        <ShieldOff className="w-10 h-10 text-red-400" />
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
      <p className="text-slate-500 max-w-md mb-4">
        You don't have permission to access this section.
        {permLabel && (
          <span> The <strong className="text-slate-700">"{permLabel}"</strong> permission is required.</span>
        )}
      </p>

      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium mb-8">
        Your role: <span className="font-bold text-slate-800">{roleLabel}</span>
      </div>

      <p className="text-xs text-slate-400 max-w-sm mb-8">
        Contact your school Owner or School Admin to request access to this feature.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </button>
      </div>
    </div>
  );
};
