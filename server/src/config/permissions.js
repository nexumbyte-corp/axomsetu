/**
 * School-Scoped Permission Constants
 *
 * Granular, assignable permissions for STAFF users.
 * OWNER and SCHOOL_ADMIN bypass all permission checks automatically.
 *
 * FEES_VOID_RECEIPT is system-restricted — enforced exclusively by role check (OWNER/SCHOOL_ADMIN only).
 */

// ── PERMISSION CONSTANTS ──────────────────────────────────────────────────────
export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',

  // Student Admissions & Directory
  STUDENTS_VIEW: 'STUDENTS_VIEW',
  STUDENTS_CREATE: 'STUDENTS_CREATE',
  STUDENTS_EDIT: 'STUDENTS_EDIT',
  STUDENTS_PROMOTE: 'STUDENTS_PROMOTE',
  STUDENTS_DELETE: 'STUDENTS_DELETE',

  // Academic Structure
  ACADEMICS_VIEW: 'ACADEMICS_VIEW',
  ACADEMICS_MANAGE: 'ACADEMICS_MANAGE',

  // Attendance
  ATTENDANCE_VIEW: 'ATTENDANCE_VIEW',
  ATTENDANCE_MARK: 'ATTENDANCE_MARK',
  ATTENDANCE_EDIT: 'ATTENDANCE_EDIT',

  // Fee Management
  FEES_VIEW: 'FEES_VIEW',
  FEES_COLLECT: 'FEES_COLLECT',
  FEES_PRINT_RECEIPT: 'FEES_PRINT_RECEIPT',
  FEES_GENERATE: 'FEES_GENERATE',
  FEES_EDIT: 'FEES_EDIT',
  FEES_APPLY_DISCOUNT: 'FEES_APPLY_DISCOUNT',
  FEES_MANAGE_STRUCTURE: 'FEES_MANAGE_STRUCTURE',


  // Staff Management
  STAFF_VIEW: 'STAFF_VIEW',
  STAFF_CREATE: 'STAFF_CREATE',
  STAFF_EDIT: 'STAFF_EDIT',
  STAFF_DELETE: 'STAFF_DELETE',

  // Salary & Advances
  SALARY_VIEW: 'SALARY_VIEW',
  SALARY_MANAGE: 'SALARY_MANAGE',

  // Payroll Processing
  PAYROLL_VIEW: 'PAYROLL_VIEW',
  PAYROLL_PROCESS: 'PAYROLL_PROCESS',

  // Expenses & Ledger
  EXPENSE_VIEW: 'EXPENSE_VIEW',
  EXPENSE_CREATE: 'EXPENSE_CREATE',
  EXPENSE_EDIT: 'EXPENSE_EDIT',
  EXPENSE_DELETE: 'EXPENSE_DELETE',

  // Capital Funds
  FUND_VIEW: 'FUND_VIEW',
  FUND_CREATE: 'FUND_CREATE',
  FUND_EDIT: 'FUND_EDIT',

  // Reports & Analytics
  REPORTS_VIEW: 'REPORTS_VIEW',
  REPORTS_EXPORT: 'REPORTS_EXPORT',

  // User Management
  USERS_VIEW: 'USERS_VIEW',
  USERS_CREATE: 'USERS_CREATE',
  USERS_EDIT: 'USERS_EDIT',
  USERS_DISABLE: 'USERS_DISABLE',
  USERS_MANAGE_PERMISSIONS: 'USERS_MANAGE_PERMISSIONS',

  // Settings
  SETTINGS_VIEW: 'SETTINGS_VIEW',
  SETTINGS_EDIT: 'SETTINGS_EDIT',

  // Hostel Management
  HOSTEL_VIEW: 'HOSTEL_VIEW',
  HOSTEL_SETUP: 'HOSTEL_SETUP',
  HOSTEL_ADMIT: 'HOSTEL_ADMIT',
  HOSTEL_TRANSFER: 'HOSTEL_TRANSFER',
  HOSTEL_EXIT: 'HOSTEL_EXIT',
};

/**
 * SYSTEM-RESTRICTED permissions — never assignable to STAFF users.
 * Enforced exclusively by role guard (OWNER / SCHOOL_ADMIN only).
 */
export const SYSTEM_RESTRICTED_PERMISSIONS = [
  'FEES_VOID_RECEIPT',
];

/**
 * All permissions that can be assigned to STAFF users.
 */
export const ASSIGNABLE_PERMISSIONS = new Set(Object.values(PERMISSIONS));

/**
 * Intuitive Permission Groups for UI Rendering.
 * Formatted with clear titles, descriptions, and system restriction flags.
 */
export const PERMISSION_GROUPS = [
  {
    key: 'dashboard',
    label: 'Dashboard & Overview',
    description: 'Access main dashboard cards, metrics, and summary stats',
    permissions: [
      {
        key: PERMISSIONS.DASHBOARD_VIEW,
        label: 'View Dashboard',
        description: 'View dashboard summary cards, active counts, and fee collection totals',
      },
    ],
  },
  {
    key: 'students',
    label: 'Student Directory & Admissions',
    description: 'Manage student records, admissions, promotions, and hostel assignments',
    permissions: [
      {
        key: PERMISSIONS.STUDENTS_VIEW,
        label: 'View Students',
        description: 'View student directory, profiles, search, and class lists',
      },
      {
        key: PERMISSIONS.STUDENTS_CREATE,
        label: 'Register New Student',
        description: 'Add new student admissions and generate admission numbers',
      },
      {
        key: PERMISSIONS.STUDENTS_EDIT,
        label: 'Edit Student Details',
        description: 'Update student profiles, guardian information, and status',
      },
      {
        key: PERMISSIONS.STUDENTS_PROMOTE,
        label: 'Academic Promotion',
        description: 'Promote students to next class or manage bulk academic transitions',
      },
      {
        key: PERMISSIONS.STUDENTS_DELETE,
        label: 'Delete Student',
        description: 'Remove student records from the database',
      },
    ],
  },
  {
    key: 'fees',
    label: 'Fee Management & Cashiering',
    description: 'Fee collection, receipt printing, generation, and fee structure setup',
    permissions: [
      {
        key: PERMISSIONS.FEES_VIEW,
        label: 'View Fees & Receipts',
        description: 'View fee ledger, outstanding balances, and receipt history',
      },
      {
        key: PERMISSIONS.FEES_COLLECT,
        label: 'Collect Fees',
        description: 'Access cashier workspace to record student fee payments',
      },
      {
        key: PERMISSIONS.FEES_PRINT_RECEIPT,
        label: 'Print Receipts',
        description: 'Generate and print official fee payment receipts (Single / Dual copy)',
      },
      {
        key: PERMISSIONS.FEES_GENERATE,
        label: 'Generate Monthly Fees',
        description: 'Run bulk monthly fee generation batches for classes',
      },
      {
        key: PERMISSIONS.FEES_APPLY_DISCOUNT,
        label: 'Apply Discounts & Overrides',
        description: 'Grant student-specific fee discounts and fee head overrides',
      },
      {
        key: PERMISSIONS.FEES_MANAGE_STRUCTURE,
        label: 'Fee Structures & Types',
        description: 'Configure fee types, fee categories, and class fee templates',
      },
      {
        key: 'FEES_VOID_RECEIPT',
        label: 'Void Receipt',
        description: 'Cancel issued payment receipts and restore fee balances',
        systemRestricted: true,
      },
    ],
  },
  {
    key: 'staff',
    label: 'Staff Directory & HR',
    description: 'Manage staff profiles, employee records, and departments',
    permissions: [
      {
        key: PERMISSIONS.STAFF_VIEW,
        label: 'View Staff Directory',
        description: 'View staff list, employee details, and departments',
      },
      {
        key: PERMISSIONS.STAFF_CREATE,
        label: 'Add Staff Member',
        description: 'Create new employee profiles and assign employee IDs',
      },
      {
        key: PERMISSIONS.STAFF_EDIT,
        label: 'Edit Staff Profile',
        description: 'Update employee designations, departments, and details',
      },
      {
        key: PERMISSIONS.STAFF_DELETE,
        label: 'Delete Staff',
        description: 'Remove employee records from the system',
      },
    ],
  },
  {
    key: 'payroll',
    label: 'Payroll & Salary Management',
    description: 'Configure staff salary structures, disburse advances, and process payroll',
    permissions: [
      {
        key: PERMISSIONS.SALARY_VIEW,
        label: 'View Salary Setup',
        description: 'View employee base salaries and salary structures',
      },
      {
        key: PERMISSIONS.SALARY_MANAGE,
        label: 'Manage Salaries & Advances',
        description: 'Configure salary components and issue staff salary advances',
      },
      {
        key: PERMISSIONS.PAYROLL_VIEW,
        label: 'View Payroll History',
        description: 'View monthly payroll runs and salary payment receipts',
      },
      {
        key: PERMISSIONS.PAYROLL_PROCESS,
        label: 'Process Monthly Payroll',
        description: 'Prepare monthly salary calculations and execute payroll payments',
      },
    ],
  },
  {
    key: 'expenses',
    label: 'Expenses & Capital Funds',
    description: 'Track school operating expenses and capital fund entries',
    permissions: [
      {
        key: PERMISSIONS.EXPENSE_VIEW,
        label: 'View Expenses',
        description: 'View expense transactions and financial overview',
      },
      {
        key: PERMISSIONS.EXPENSE_CREATE,
        label: 'Record Expense',
        description: 'Add new operating expense vouchers and expense categories',
      },
      {
        key: PERMISSIONS.EXPENSE_EDIT,
        label: 'Edit Expense',
        description: 'Update expense vouchers and category names',
      },
      {
        key: PERMISSIONS.EXPENSE_DELETE,
        label: 'Cancel Expense',
        description: 'Void or cancel expense transactions',
      },
      {
        key: PERMISSIONS.FUND_VIEW,
        label: 'View Capital Funds',
        description: 'View capital fund entries and fund sources',
      },
      {
        key: PERMISSIONS.FUND_CREATE,
        label: 'Record Capital Fund',
        description: 'Add new capital fund deposits and fund sources',
      },
    ],
  },
  {
    key: 'academics',
    label: 'Academic Setup & Classes',
    description: 'Configure academic years, classes, sections, mediums, and streams',
    permissions: [
      {
        key: PERMISSIONS.ACADEMICS_VIEW,
        label: 'View Academic Setup',
        description: 'View academic year list, classes, sections, and streams',
      },
      {
        key: PERMISSIONS.ACADEMICS_MANAGE,
        label: 'Manage Classes & Sections',
        description: 'Create and edit classes, sections, mediums, and streams',
      },
    ],
  },
  {
    key: 'reports',
    label: 'Reports & Export',
    description: 'Generate operational reports and export data',
    permissions: [
      {
        key: PERMISSIONS.REPORTS_VIEW,
        label: 'View Operational Reports',
        description: 'Access collection, dues, student, staff, and payroll reports',
      },
      {
        key: PERMISSIONS.REPORTS_EXPORT,
        label: 'Export Reports',
        description: 'Download reports to Excel, PDF, or CSV formats',
      },
    ],
  },
  {
    key: 'users',
    label: 'Users & Permissions',
    description: 'Manage school staff user accounts and access permissions',
    permissions: [
      {
        key: PERMISSIONS.USERS_VIEW,
        label: 'View School Users',
        description: 'View list of school users, roles, and status',
      },
      {
        key: PERMISSIONS.USERS_CREATE,
        label: 'Create Staff Users',
        description: 'Create new user login accounts for school staff',
      },
      {
        key: PERMISSIONS.USERS_EDIT,
        label: 'Edit User Accounts',
        description: 'Update user profiles and contact info',
      },
      {
        key: PERMISSIONS.USERS_DISABLE,
        label: 'Activate / Deactivate Users',
        description: 'Toggle user login access (Active / Inactive)',
      },
      {
        key: PERMISSIONS.USERS_MANAGE_PERMISSIONS,
        label: 'Manage User Permissions',
        description: 'Assign or update module permissions for staff accounts',
      },
    ],
  },
  {
    key: 'hostel',
    label: 'Hostel Management',
    description: 'Manage hostels, rooms, beds, admissions, transfers, and exits',
    permissions: [
      {
        key: PERMISSIONS.HOSTEL_VIEW,
        label: 'View Hostel Module',
        description: 'Access hostel dashboard, resident lists, bed availability, and reports',
      },
      {
        key: PERMISSIONS.HOSTEL_SETUP,
        label: 'Manage Hostel Setup & Fees',
        description: 'Create and configure hostels, rooms, beds, and hostel fee settings',
      },
      {
        key: PERMISSIONS.HOSTEL_ADMIT,
        label: 'Admit Hostel Resident',
        description: 'Admit active students to hostels and allocate beds',
      },
      {
        key: PERMISSIONS.HOSTEL_TRANSFER,
        label: 'Transfer Hostel Resident',
        description: 'Transfer residents between hostels, rooms, or beds',
      },
      {
        key: PERMISSIONS.HOSTEL_EXIT,
        label: 'Exit Hostel Resident',
        description: 'Process hostel exits and release beds back to available status',
      },
    ],
  },
];

/**
 * Predefined Permission Presets for Common School Roles.
 * School Admins can apply a preset with 1-click when managing staff access.
 */
const PERMISSION_PRESETS = {
  FEE_CASHIER: {
    label: 'Fee Cashier',
    badge: 'Popular',
    description: 'For cashier staff who collect fees, view student profiles, and print receipts',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.STUDENTS_VIEW,
      PERMISSIONS.FEES_VIEW,
      PERMISSIONS.FEES_COLLECT,
      PERMISSIONS.FEES_PRINT_RECEIPT,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  ACCOUNTANT: {
    label: 'School Accountant',
    description: 'Full financial access: fee collection, fee generation, discounts, expenses, funds & financial reports',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.STUDENTS_VIEW,
      PERMISSIONS.FEES_VIEW,
      PERMISSIONS.FEES_COLLECT,
      PERMISSIONS.FEES_PRINT_RECEIPT,
      PERMISSIONS.FEES_GENERATE,
      PERMISSIONS.FEES_APPLY_DISCOUNT,
      PERMISSIONS.FEES_MANAGE_STRUCTURE,
      PERMISSIONS.EXPENSE_VIEW,
      PERMISSIONS.EXPENSE_CREATE,
      PERMISSIONS.EXPENSE_EDIT,
      PERMISSIONS.FUND_VIEW,
      PERMISSIONS.FUND_CREATE,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
    ],
  },
  ADMISSIONS_OFFICER: {
    label: 'Admissions Officer',
    description: 'For front-desk staff who register new student admissions and manage student records',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.STUDENTS_VIEW,
      PERMISSIONS.STUDENTS_CREATE,
      PERMISSIONS.STUDENTS_EDIT,
      PERMISSIONS.STUDENTS_PROMOTE,
      PERMISSIONS.ACADEMICS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  HR_PAYROLL: {
    label: 'HR & Payroll Staff',
    description: 'For HR staff managing employee records, salary setup, and monthly payroll runs',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.STAFF_VIEW,
      PERMISSIONS.STAFF_CREATE,
      PERMISSIONS.STAFF_EDIT,
      PERMISSIONS.SALARY_VIEW,
      PERMISSIONS.SALARY_MANAGE,
      PERMISSIONS.PAYROLL_VIEW,
      PERMISSIONS.PAYROLL_PROCESS,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.REPORTS_EXPORT,
    ],
  },
  TEACHER: {
    label: 'Teacher / Staff Reader',
    description: 'Read-only access to dashboard, student directory, fee status, and basic reports',
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.STUDENTS_VIEW,
      PERMISSIONS.ACADEMICS_VIEW,
      PERMISSIONS.FEES_VIEW,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
};
