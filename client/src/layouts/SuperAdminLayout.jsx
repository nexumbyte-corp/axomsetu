import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  CreditCard,
  Package,
  FileText,
  Settings,
  LogOut,
  Menu,
  ChevronDown,
  Bell,
  Lock,
  Plus,
  Receipt,
  Activity,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { authService } from '../services/auth.service.js';
import { usePageHeader } from '../context/PageHeaderContext.jsx';

import { Drawer } from '../components/ui/Drawer.jsx';
import { Dropdown, DropdownItem, DropdownDivider } from '../components/ui/Dropdown.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Toast } from '../components/ui/Toast.jsx';

import { BRAND_CONFIG } from '../config/brandConfig.js';
import { BrandLogo } from '../components/common/BrandLogo.jsx';

const SUPER_ADMIN_ROUTE_TITLE_MAP = {
  '/admin/dashboard': 'Dashboard',
  '/admin/schools': 'Schools',
  '/admin/plans': 'Subscription Plans',
  '/admin/plans/new': 'Create Subscription Plan',
  '/admin/subscriptions': 'Subscriptions',
  '/admin/users': 'Users Directory',
  '/admin/payments': 'Payment History',
  '/admin/reports/revenue': 'Revenue Report',
  '/admin/reports/growth': 'Growth Report',
  '/admin/audit-logs': 'Audit Logs',
  '/admin/platform': 'Platform Settings',
  '/admin/settings': 'Platform Settings',
};

const getSuperAdminPageTitle = (locationPath, headerTitle) => {
  if (headerTitle) return headerTitle;
  if (SUPER_ADMIN_ROUTE_TITLE_MAP[locationPath]) return SUPER_ADMIN_ROUTE_TITLE_MAP[locationPath];

  if (locationPath.startsWith('/admin/schools/')) return 'School Details';
  if (locationPath.startsWith('/admin/plans/')) return 'Edit Subscription Plan';
  if (locationPath.startsWith('/admin/subscriptions/')) return 'Subscription Invoice';

  const sortedKeys = Object.keys(SUPER_ADMIN_ROUTE_TITLE_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (key !== '/admin' && locationPath.startsWith(key)) {
      return SUPER_ADMIN_ROUTE_TITLE_MAP[key];
    }
  }
  return 'Platform Administration';
};

export const SuperAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { headerInfo } = usePageHeader();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [toast, setToast] = useState(null);

  // Change Password state for Super Admin
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const activePageTitle = getSuperAdminPageTitle(location.pathname, headerInfo?.title);

  // Dynamically update document title on route/header changes
  useEffect(() => {
    if (activePageTitle) {
      document.title = `${BRAND_CONFIG.productName} | ${activePageTitle}`;
    } else {
      document.title = `${BRAND_CONFIG.productName} — ${BRAND_CONFIG.productTagline}`;
    }
  }, [activePageTitle, location.pathname, headerInfo?.title]);

  // Automatically close drawers, modals, and reset body overflow when navigating routes
  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsLogoutModalOpen(false);
    setIsPasswordModalOpen(false);
    document.body.style.overflow = '';
  }, [location.pathname]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      setToast({ type: 'error', message: 'Current password is required' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setToast({ type: 'error', message: 'New password must be at least 8 characters' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setToast({ type: 'error', message: 'Passwords do not match' });
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await authService.changePassword(passwordForm);
      if (res.data?.success) {
        setToast({ type: 'success', message: 'Password changed successfully!' });
        setIsPasswordModalOpen(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to change password' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const adminName = user?.name || 'Super Admin';
  const adminEmail = user?.email || '';

  const navGroups = [
    {
      title: 'CORE PLATFORM',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Schools', path: '/admin/schools', icon: Building2 },
        { label: 'Subscriptions', path: '/admin/subscriptions', icon: CreditCard },
        { label: 'Plans', path: '/admin/plans', icon: Package },
      ],
    },
    {
      title: 'FINANCIAL & AUDIT',
      items: [
        { label: 'Payments', path: '/admin/payments', icon: Receipt },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { label: 'Platform Settings', path: '/admin/platform', icon: Settings },
      ],
    },
  ];

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      setIsLogoutModalOpen(false);
      document.body.style.overflow = '';
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const renderNav = (onItemClick) => (
    <nav className="space-y-4 text-xs font-medium">
      <div className="pb-3 border-b border-slate-100 px-1 flex items-center justify-between">
        <BrandLogo size="md" showCompany={true} />
        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-indigo-50 text-indigo-700 tracking-wider">
          v2.4 HQ
        </span>
      </div>

      {navGroups.map((group, idx) => (
        <div key={idx} className="space-y-1">
          <div className="px-3 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
            {group.title}
          </div>
          {group.items.map((item) => {
            const IconComp = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all duration-150 group ${isActive
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shrink-0 ${isActive
                          ? 'bg-indigo-500/30 text-white'
                          : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-800'
                        }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* Sleek Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white h-14 flex items-center px-3 sm:px-6 shadow-xs">
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
          {/* Brand & Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 active:bg-slate-700 transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0 ring-2 ring-indigo-500/20">
                <ShieldCheck className="w-4 h-4 sm:w-4 sm:h-4" />
              </div>
              <div className="hidden xs:block">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-sm font-extrabold text-white leading-tight truncate">
                    {BRAND_CONFIG.productName}
                  </h1>
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded uppercase tracking-wider">
                    HQ
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Active Page Badge & System Live Indicator */}
          <div className="flex items-center gap-3 min-w-0">
            {headerInfo && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/80 text-white shadow-2xs border border-slate-700/80">
                {headerInfo.icon && (
                  <div className="w-5 h-5 rounded bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <headerInfo.icon className="w-3 h-3" />
                  </div>
                )}
                <h2 className="text-xs font-bold text-white truncate tracking-tight">{headerInfo.title}</h2>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Platform Active</span>
            </div>
          </div>

          {/* Icon Quick Actions & Profile Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Quick Actions */}
            <div className="hidden sm:flex items-center gap-1.5">
              <Link
                to="/admin/schools"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xs transition-colors"
                title="Register New Tenant School"
              >
                <Plus className="w-3.5 h-3.5" />
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">School</span>
              </Link>
              <Link
                to="/admin/plans/new"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-2xs transition-colors"
                title="Create Subscription Plan"
              >
                <Plus className="w-3.5 h-3.5" />
                <Package className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Plan</span>
              </Link>
            </div>

            <button
              onClick={() => setToast({ type: 'info', message: 'No new platform notifications.' })}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full ring-2 ring-slate-900" />
            </button>

            <div className="h-5 w-px bg-slate-800 hidden sm:block" />

            {/* Profile Dropdown */}
            <Dropdown
              align="right"
              trigger={
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-800 transition-colors">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-2xs ring-1 ring-white/20">
                    {adminName.charAt(0)}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-semibold text-white leading-none">{adminName}</p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5">Super Admin</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
                </button>
              }
            >
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <p className="text-xs font-bold text-slate-900 truncate">{adminName}</p>
                <p className="text-[11px] text-slate-500 truncate">{adminEmail}</p>
                <span className="mt-1.5 inline-block text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded uppercase tracking-wider">
                  SUPER ADMIN
                </span>
              </div>
              <DropdownItem icon={Lock} onClick={() => setIsPasswordModalOpen(true)}>
                Change Password
              </DropdownItem>
              <DropdownDivider />
              <DropdownItem icon={LogOut} danger onClick={() => setIsLogoutModalOpen(true)}>
                Sign Out
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <div className="flex-1 flex max-w-full">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden lg:flex flex-col justify-between w-56 sticky top-14 h-[calc(100vh-3.5rem)] bg-white border-r border-slate-200 p-3.5 shrink-0 self-start">
          <div className="overflow-y-auto flex-1 scrollbar-thin">
            {renderNav()}
          </div>
          <div className="pt-3 border-t border-slate-100 text-[10px] text-slate-400 text-center font-mono">
            &copy; {BRAND_CONFIG.copyrightYear} {BRAND_CONFIG.productName}
            <span className="block text-[9px] text-slate-400 font-sans mt-0.5">{BRAND_CONFIG.poweredBy}</span>
          </div>
        </aside>

        {/* Mobile Nav Drawer */}
        <Drawer
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          title="Super Admin Navigation"
          position="left"
        >
          {renderNav(() => setIsMobileNavOpen(false))}
        </Drawer>

        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-full min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>

      {/* Sign Out Confirm Dialog */}
      <ConfirmDialog
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Sign Out Confirmation"
        message="Are you sure you want to sign out of Platform Administration?"
        confirmText="Sign Out"
        loading={isLoggingOut}
        loadingText="Signing out..."
      />

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Change Platform Password"
        description="Update your Super Admin account security password."
      >
        <form onSubmit={handleChangePassword} autoComplete="off" className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Password *</label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Password (min 8 chars) *</label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password *</label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
            >
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
