import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Languages,
  Layers,
  GitBranch,
  Users,
  Briefcase,
  CreditCard,
  BarChart3,
  Building,
  Wallet,
  Settings,
  IdCard,
  ShieldCheck,
  FileText,
} from 'lucide-react';

/**
 * Centralized Sidebar Navigation Hierarchy Configuration
 * 
 * Supports:
 * Group
 *  ├── id: unique section key
 *  ├── title: section display label
 *  ├── expandable: boolean
 *  └── items[]
 *       ├── label: display title
 *       ├── path: route path
 *       ├── icon: Lucide icon component
 *       ├── end: boolean (for exact route matching)
 *       ├── permission: permission key
 *       ├── isOwnerOnly: boolean
 *       ├── isFullAccessOnly: boolean
 *       ├── disabled: boolean (e.g. for coming-soon placeholder modules)
 *       ├── status: string (e.g. 'coming-soon')
 *       └── badge: string (e.g. 'Soon')
 */

export const getSidebarNavigation = ({ isSubscriptionActive, isOwner, _hasFullAccess, _can }) => {
  // Restricted Subscription State: Show ONLY Main items
  if (!isSubscriptionActive) {
    return [
      {
        id: 'main',
        title: 'MAIN',
        expandable: true,
        items: [
          { label: 'Dashboard', path: '/app', icon: LayoutDashboard, end: true, permission: 'DASHBOARD_VIEW' },
          { label: 'Subscription', path: '/app/subscription', icon: CreditCard },
        ],
      },
    ];
  }

  return [
    {
      id: 'main',
      title: 'MAIN',
      expandable: true,
      items: [
        { label: 'Dashboard', path: '/app', icon: LayoutDashboard, end: true, permission: 'DASHBOARD_VIEW' },
      ],
    },
    {
      id: 'operations',
      title: 'OPERATIONS',
      expandable: true,
      items: [
        { label: 'Students', path: '/app/students', icon: Users, permission: ['STUDENTS_VIEW', 'STUDENTS_CREATE'] },
        { label: 'Fee Management', path: '/app/fees', icon: CreditCard, permission: ['FEES_VIEW', 'FEES_COLLECT', 'FEES_GENERATE', 'FEES_MANAGE_STRUCTURE'] },
        { label: 'Staff & Payroll', path: '/app/staff', icon: Briefcase, permission: ['STAFF_VIEW', 'PAYROLL_VIEW', 'SALARY_VIEW'] },
        { label: 'Finance & Ledger', path: '/app/finance', icon: Wallet, permission: ['EXPENSE_VIEW', 'FUND_VIEW'] },
      ],
    },
    {
      id: 'academics',
      title: 'ACADEMICS',
      expandable: true,
      items: [
        { label: 'Academic Years', path: '/app/academic-years', icon: Calendar, permission: ['ACADEMICS_VIEW', 'ACADEMICS_MANAGE'] },
        { label: 'Classes', path: '/app/classes', icon: BookOpen, permission: ['ACADEMICS_VIEW', 'ACADEMICS_MANAGE'] },
        { label: 'Sections', path: '/app/sections', icon: Layers, permission: ['ACADEMICS_VIEW', 'ACADEMICS_MANAGE'] },
        { label: 'Mediums', path: '/app/mediums', icon: Languages, permission: ['ACADEMICS_VIEW', 'ACADEMICS_MANAGE'] },
        { label: 'Streams', path: '/app/streams', icon: GitBranch, permission: ['ACADEMICS_VIEW', 'ACADEMICS_MANAGE'] },
        { label: 'Admit Cards', path: '/app/admit-cards', icon: IdCard, permission: ['ACADEMICS_VIEW', 'ACADEMICS_MANAGE'] },
      ],
    },
    {
      id: 'hostel',
      title: 'HOSTEL',
      expandable: true,
      items: [
        { label: 'Overview', path: '/app/hostel', icon: LayoutDashboard, end: true, permission: ['HOSTEL_VIEW', 'HOSTEL_SETUP', 'HOSTEL_ADMIT'] },
        { label: 'Residents', path: '/app/hostel/residents', icon: Users, permission: ['HOSTEL_VIEW', 'HOSTEL_ADMIT'] },
        { label: 'Hostel Fees', path: '/app/hostel/fees', icon: CreditCard, permission: 'HOSTEL_SETUP' },
        { label: 'Rooms & Beds', path: '/app/hostel/setup', icon: Settings, permission: 'HOSTEL_SETUP' },
        { label: 'Hostel Reports', path: '/app/hostel/reports', icon: FileText, permission: 'HOSTEL_VIEW' },
      ],
    },
    {
      id: 'reports',
      title: 'REPORTS',
      expandable: true,
      items: [
        { label: 'Reports & Analytics', path: '/app/reports', icon: BarChart3, permission: 'REPORTS_VIEW' },
      ],
    },
    {
      id: 'settings',
      title: 'SETTINGS',
      expandable: true,
      items: [
        ...(isOwner
          ? [{ label: 'School Profile', path: '/app/settings/profile', icon: Building, isOwnerOnly: true }]
          : []),
        { label: 'Users & Permissions', path: '/app/settings/users', icon: ShieldCheck, permission: ['USERS_VIEW', 'USERS_MANAGE_PERMISSIONS', 'USERS_CREATE'] },
        { label: 'Subscription & Billing', path: '/app/subscription', icon: CreditCard },
      ],
    },
  ];
};

