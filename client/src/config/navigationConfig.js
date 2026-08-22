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
  FileSpreadsheet,
  UserPlus,
  Settings,
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
        { label: 'Subscription', path: '/app/subscription', icon: CreditCard },
      ],
    },
    {
      id: 'academic-setup',
      title: 'ACADEMIC SETUP',
      expandable: true,
      items: [
        { label: 'Academic Years', path: '/app/academic-years', icon: Calendar, permission: 'ACADEMICS_VIEW' },
        { label: 'Classes', path: '/app/classes', icon: BookOpen, permission: 'ACADEMICS_VIEW' },
        { label: 'Mediums', path: '/app/mediums', icon: Languages, permission: 'ACADEMICS_VIEW' },
        { label: 'Streams', path: '/app/streams', icon: GitBranch, permission: 'ACADEMICS_VIEW' },
        { label: 'Sections', path: '/app/sections', icon: Layers, permission: 'ACADEMICS_VIEW' },
      ],
    },
    {
      id: 'operations',
      title: 'OPERATIONS',
      expandable: true,
      items: [
        { label: 'Students', path: '/app/students', icon: Users, permission: 'STUDENTS_VIEW' },
        { label: 'Fee Management', path: '/app/fees', icon: CreditCard, permission: 'FEES_VIEW' },
        { label: 'Staff & Payroll', path: '/app/staff', icon: Briefcase, permission: 'STAFF_VIEW' },
      ],
    },
    {
      id: 'hostel',
      title: 'HOSTEL MANAGEMENT',
      expandable: true,
      items: [
        { label: 'Overview', path: '/app/hostel', icon: LayoutDashboard, end: true, permission: 'HOSTEL_VIEW' },
        { label: 'Residents', path: '/app/hostel/residents', icon: Users, permission: 'HOSTEL_VIEW' },
        { label: 'Hostel Fees', path: '/app/hostel/fees', icon: CreditCard, permission: 'HOSTEL_SETUP' },
        { label: 'Rooms & Beds', path: '/app/hostel/setup', icon: Settings, permission: 'HOSTEL_SETUP' },
        { label: 'Reports', path: '/app/hostel/reports', icon: BarChart3, permission: 'HOSTEL_VIEW' },
      ],
    },
    {
      id: 'reports',
      title: 'REPORTS',
      expandable: true,
      items: [
        { label: 'Finance & Ledger', path: '/app/finance', icon: Wallet, permission: 'EXPENSE_VIEW' },
        { label: 'Reports', path: '/app/reports', icon: BarChart3, permission: 'REPORTS_VIEW' },
      ],
    },
    {
      id: 'settings',
      title: 'SETTINGS',
      expandable: true,
      items: [
        ...(isOwner
          ? [{ label: 'School Profile', path: '/app/settings/profile', icon: Building, permission: 'SETTINGS_VIEW', isOwnerOnly: true }]
          : []),
        { label: 'Users & Permissions', path: '/app/settings/users', icon: FileSpreadsheet, permission: 'USERS_VIEW' },
      ],
    },
  ];
};
