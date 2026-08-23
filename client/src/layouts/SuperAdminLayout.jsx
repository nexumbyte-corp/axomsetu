import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, LayoutDashboard, Building2, CreditCard, Package, FileText, Settings, LogOut, Menu, ChevronDown, Bell, Lock } from 'lucide-react';
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

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Schools', path: '/admin/schools', icon: Building2 },
    { label: 'Plans', path: '/admin/plans', icon: Package },
    { label: 'Subscriptions', path: '/admin/subscriptions', icon: CreditCard },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: FileText },
    { label: 'Platform', path: '/admin/platform', icon: Settings },
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
    <nav className="space-y-1">
      <div className="pb-3 border-b border-slate-100 mb-3 px-1">
        <BrandLogo size="md" showCompany={true} />
      </div>
      {navItems.map((item) => {
        const IconComp = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-colors ${isActive
                ? 'bg-indigo-50 text-indigo-700 font-bold shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`
            }
          >
            <IconComp className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-slate-600" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
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

      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white h-16 flex items-center px-2.5 sm:px-6">
        <div className="flex items-center justify-between w-full gap-1.5 sm:gap-4">
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 active:bg-slate-700 transition-colors"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-extrabold text-white leading-tight truncate max-w-[120px] sm:max-w-none">
                  {BRAND_CONFIG.productName}
                </h1>
                <span className="text-[9px] sm:text-[10px] text-indigo-400 font-medium tracking-wide hidden sm:block">
                  Platform Administration
                </span>
              </div>
            </Link>
          </div>

          {/* Active Page Header Badge */}
          {headerInfo && (
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800 text-white shadow-xs shrink min-w-0 max-w-xs lg:max-w-md mx-2 border border-slate-700">
              {headerInfo.icon && (
                <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <headerInfo.icon className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-xs font-extrabold text-white truncate tracking-wide">{headerInfo.title}</h2>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {headerInfo?.actions && (
              <div className="hidden sm:flex items-center gap-2">
                {headerInfo.actions}
              </div>
            )}

            <button
              onClick={() => setToast({ type: 'info', message: 'No new platform notifications.' })}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
            </button>

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            <Dropdown
              align="right"
              trigger={
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {adminName.charAt(0)}
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-semibold text-white leading-tight">{adminName}</p>
                    <p className="text-[10px] text-slate-400 leading-tight">Platform Admin</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>
              }
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{adminName}</p>
                <p className="text-[11px] text-slate-500 truncate">{adminEmail}</p>
                <span className="mt-1 inline-block text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
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

      <div className="flex-1 flex max-w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col justify-between w-64 sticky top-16 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 p-4 shrink-0 self-start">
          <div className="overflow-y-auto flex-1">
            {renderNav()}
          </div>
          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center font-mono">
            &copy; {BRAND_CONFIG.copyrightYear} {BRAND_CONFIG.productName}
            <span className="block text-[9px] text-slate-400 font-sans mt-0.5">{BRAND_CONFIG.poweredBy}</span>
          </div>
        </aside>

        {/* Mobile Nav Drawer */}
        <Drawer
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          title="Platform Navigation"
          position="left"
        >
          {renderNav(() => setIsMobileNavOpen(false))}
        </Drawer>

        {/* Main Content Area */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>

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

      {/* Change Password Modal for Super Admin */}
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

