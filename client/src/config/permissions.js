/**
 * Client-side Permission Presets for UI Rendering
 */

export const PERMISSION_PRESETS = {
  FEE_CASHIER: {
    label: 'Fee Cashier',
    badge: 'Popular',
    description: 'For cashier staff who collect fees, view student profiles, and print receipts',
    permissions: [
      'DASHBOARD_VIEW',
      'STUDENTS_VIEW',
      'FEES_VIEW',
      'FEES_COLLECT',
      'FEES_PRINT_RECEIPT',
      'REPORTS_VIEW',
    ],
  },
  ACCOUNTANT: {
    label: 'School Accountant',
    description: 'Full financial access: fee collection, fee generation, discounts, expenses, funds & financial reports',
    permissions: [
      'DASHBOARD_VIEW',
      'STUDENTS_VIEW',
      'FEES_VIEW',
      'FEES_COLLECT',
      'FEES_PRINT_RECEIPT',
      'FEES_GENERATE',
      'FEES_APPLY_DISCOUNT',
      'FEES_MANAGE_STRUCTURE',
      'EXPENSE_VIEW',
      'EXPENSE_CREATE',
      'EXPENSE_EDIT',
      'FUND_VIEW',
      'FUND_CREATE',
      'REPORTS_VIEW',
      'REPORTS_EXPORT',
    ],
  },
  ADMISSIONS_OFFICER: {
    label: 'Admissions Officer',
    description: 'For front-desk staff who register new student admissions and manage student records',
    permissions: [
      'DASHBOARD_VIEW',
      'STUDENTS_VIEW',
      'STUDENTS_CREATE',
      'STUDENTS_EDIT',
      'STUDENTS_PROMOTE',
      'ACADEMICS_VIEW',
      'HOSTEL_VIEW',
      'HOSTEL_ADMIT',
      'REPORTS_VIEW',
    ],
  },
  HR_PAYROLL: {
    label: 'HR & Payroll Staff',
    description: 'For HR staff managing employee records, salary setup, and monthly payroll runs',
    permissions: [
      'DASHBOARD_VIEW',
      'STAFF_VIEW',
      'STAFF_CREATE',
      'STAFF_EDIT',
      'SALARY_VIEW',
      'SALARY_MANAGE',
      'PAYROLL_VIEW',
      'PAYROLL_PROCESS',
      'REPORTS_VIEW',
      'REPORTS_EXPORT',
    ],
  },
  TEACHER: {
    label: 'Teacher / Staff Reader',
    description: 'Read-only access to dashboard, student directory, fee status, and basic reports',
    permissions: [
      'DASHBOARD_VIEW',
      'STUDENTS_VIEW',
      'ACADEMICS_VIEW',
      'FEES_VIEW',
      'REPORTS_VIEW',
    ],
  },
};
