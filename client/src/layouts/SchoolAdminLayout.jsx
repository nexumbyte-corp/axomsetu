import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, LogOut, Menu, ChevronDown, Building, Lock, HelpCircle, User } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import { usePermission } from '../hooks/usePermission.js';
import { useAcademicYear } from '../hooks/useAcademicYear.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { usePageHeader } from '../context/PageHeaderContext.jsx';
import { SupportModal } from '../components/support/SupportModal.jsx';
import { ChangePasswordModal } from '../components/auth/ChangePasswordModal.jsx';
import { Drawer } from '../components/ui/Drawer.jsx';
import { Dropdown, DropdownItem, DropdownDivider } from '../components/ui/Dropdown.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Badge } from '../components/ui/Badge.jsx';

import { BRAND_CONFIG } from '../config/brandConfig.js';
import { getSidebarNavigation } from '../config/navigationConfig.js';
import { SchoolHeaderLogo } from '../components/common/SchoolHeaderLogo.jsx';

export const SchoolAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isOwner, hasFullAccess, can, roleLabel } = usePermission();
  const { academicYears, selectedYear, selectedYearId, setSelectedYearId } = useAcademicYear();
  const { isSubscriptionActive } = useSubscription();
  const { headerInfo } = usePageHeader();


  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({});
  const [openSubMenus, setOpenSubMenus] = useState({});

  // Helper to check if a navigation item matches the current path
  const isItemActive = (item, currentPath) => {
    if (item.disabled || !item.path || item.path === '#') return false;
    if (item.end) {
      return currentPath === item.path;
    }
    return currentPath === item.path || currentPath.startsWith(item.path + '/');
  };

  // Get current navigation groups based on permissions & subscription
  const navGroups = getSidebarNavigation({ isSubscriptionActive, isOwner, hasFullAccess, can });

  // Auto-expand the group and sub-menu containing the active route whenever location changes
  useEffect(() => {
    setIsMobileNavOpen(false);
    setIsLogoutModalOpen(false);
    setIsPasswordModalOpen(false);
    setIsSupportOpen(false);
    document.body.style.overflow = '';

    const currentPath = location.pathname;
    navGroups.forEach((group) => {
      let groupHasActive = false;
      group.items.forEach((item) => {
        if (item.children && item.children.length > 0) {
          const hasActiveChild = item.children.some((child) => isItemActive(child, currentPath));
          if (hasActiveChild || isItemActive(item, currentPath)) {
            groupHasActive = true;
            setOpenSubMenus((prev) => ({ ...prev, [item.label]: true }));
          }
        } else if (isItemActive(item, currentPath)) {
          groupHasActive = true;
        }
      });

      if (groupHasActive) {
        setOpenGroups((prev) => ({ ...prev, [group.id]: true }));
      }
    });
  }, [location.pathname, isSubscriptionActive, isOwner, hasFullAccess]);

  const toggleGroup = (groupId, currentlyExpanded) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !currentlyExpanded,
    }));
  };

  const toggleSubMenu = (itemLabel, e) => {
    e?.stopPropagation();
    setOpenSubMenus((prev) => ({
      ...prev,
      [itemLabel]: !prev[itemLabel],
    }));
  };

  const school = user?.schoolAdmins?.[0]?.school;
  const schoolName = school?.name || 'School Workspace';
  const schoolLogoUrl = school?.logoUrl;
  const ownerName = user?.name || 'School Admin';
  const ownerEmail = user?.email || '';

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

  const renderNavItems = (onItemClick) => (
    <div className="space-y-4">
      {navGroups.map((group) => {
        const visibleItems = group.items.filter((item) => {
          if (item.permission && !can(item.permission)) return false;
          if (item.children) {
            const visibleChildren = item.children.filter((child) => !child.permission || can(child.permission));
            return visibleChildren.length > 0;
          }
          return true;
        });
        if (visibleItems.length === 0) return null;

        const hasActiveChildGroup = visibleItems.some((item) => {
          if (isItemActive(item, location.pathname)) return true;
          if (item.children) {
            return item.children.some((child) => isItemActive(child, location.pathname));
          }
          return false;
        });
        const isExpanded = openGroups[group.id] ?? (hasActiveChildGroup || group.id === 'main');

        return (
          <div key={group.id} className="select-none">
            <button
              type="button"
              onClick={() => toggleGroup(group.id, isExpanded)}
              aria-expanded={isExpanded}
              aria-controls={`nav-group-${group.id}`}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors rounded-md hover:bg-slate-50 cursor-pointer"
            >
              <span>{group.title}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            <div
              id={`nav-group-${group.id}`}
              className={`space-y-1 transition-all duration-200 overflow-hidden ${
                isExpanded ? 'max-h-[600px] opacity-100 mt-1' : 'max-h-0 opacity-0'
              }`}
            >
              {visibleItems.map((item) => {
                const IconComp = item.icon;

                if (item.disabled) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between px-3 py-2.5 sm:py-2 text-xs font-semibold rounded-lg text-slate-400 opacity-60 cursor-not-allowed select-none"
                      title="Module coming soon"
                    >
                      <div className="flex items-center gap-3">
                        <IconComp className="w-4 h-4 shrink-0 text-slate-400" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  );
                }

                // If item has sub-items (children)
                if (item.children && item.children.length > 0) {
                  const visibleChildren = item.children.filter(
                    (child) => !child.permission || can(child.permission)
                  );
                  if (visibleChildren.length === 0) return null;

                  const isSubActive = visibleChildren.some((child) => isItemActive(child, location.pathname));
                  const isSubOpen = openSubMenus[item.label] ?? isSubActive;

                  return (
                    <div key={item.label} className="space-y-1">
                      <button
                        type="button"
                        onClick={(e) => toggleSubMenu(item.label, e)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                          isSubActive
                            ? 'bg-indigo-50 text-indigo-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComp className={`w-4 h-4 shrink-0 ${isSubActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                          <span>{item.label}</span>
                        </div>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                            isSubOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      <div
                        className={`pl-3.5 ml-3 border-l-2 border-indigo-100 space-y-1 transition-all duration-200 overflow-hidden ${
                          isSubOpen ? 'max-h-[350px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                        }`}
                      >
                        {visibleChildren.map((child) => {
                          const ChildIcon = child.icon;
                          return (
                            <NavLink
                              key={child.path + (child.end ? '-end' : '')}
                              to={child.path}
                              end={child.end}
                              onClick={onItemClick}
                              className={({ isActive }) =>
                                `flex items-center gap-2.5 px-2.5 py-2 sm:py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                  isActive
                                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`
                              }
                            >
                              {ChildIcon && <ChildIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />}
                              <span>{child.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    onClick={onItemClick}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 sm:py-2 text-xs font-semibold rounded-lg transition-colors ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-bold'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <IconComp className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

const ROUTE_TITLE_MAP = {
  '/app': 'Dashboard',
  '/app/subscription': 'Subscription',
  '/app/academic-years': 'Academic Years',
  '/app/classes': 'Classes',
  '/app/mediums': 'Mediums',
  '/app/streams': 'Streams',
  '/app/sections': 'Sections',
  '/app/students': 'Students',
  '/app/students/new': 'Add Student',
  '/app/students/promote': 'Bulk Promotion',
  '/app/fees': 'Fee Management',
  '/app/staff': 'Staff & Payroll',
  '/app/hostel': 'Hostel Overview',
  '/app/hostel/residents': 'Hostel Residents',
  '/app/hostel/admission': 'Hostel Admission',
  '/app/hostel/fees': 'Hostel Fees',
  '/app/hostel/setup': 'Rooms & Beds',
  '/app/hostel/reports': 'Hostel Reports',
  '/app/finance': 'Finance & Ledger',
  '/app/reports': 'Reports',
  '/app/settings/profile': 'School Profile',
  '/app/settings/users': 'Users & Permissions',
};

const getPageTitle = (locationPath, headerTitle) => {
  if (headerTitle) return headerTitle;
  if (ROUTE_TITLE_MAP[locationPath]) return ROUTE_TITLE_MAP[locationPath];
  const sortedKeys = Object.keys(ROUTE_TITLE_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (key !== '/app' && locationPath.startsWith(key)) {
      return ROUTE_TITLE_MAP[key];
    }
  }
  return 'Dashboard';
};

  const activePageTitle = getPageTitle(location.pathname, headerInfo?.title);

  // Dynamically update document title on route/header changes
  useEffect(() => {
    if (activePageTitle) {
      document.title = `${BRAND_CONFIG.productName} | ${activePageTitle}`;
    } else {
      document.title = `${BRAND_CONFIG.productName} — ${BRAND_CONFIG.productTagline}`;
    }
  }, [activePageTitle, location.pathname, headerInfo?.title]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs h-16 flex items-center px-2.5 sm:px-6">
        <div className="flex items-center justify-between w-full gap-1.5 sm:gap-4">
          {/* Left Side: Branding Hierarchy */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/app" className="flex items-center gap-1.5 sm:gap-3">
              <SchoolHeaderLogo logoUrl={schoolLogoUrl} schoolName={schoolName} />
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] sm:text-xs font-black tracking-wider text-indigo-600 uppercase">
                    {BRAND_CONFIG.productName}
                  </span>
                  <span className="text-slate-300 font-normal hidden sm:inline">|</span>
                  <h1 className="text-xs font-bold text-slate-900 truncate hidden sm:block max-w-[120px] md:max-w-[150px] lg:max-w-[180px]">
                    {schoolName}
                  </h1>
                </div>
                <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-tight hidden sm:block">
                  {BRAND_CONFIG.poweredBy}
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Dynamic Route-Aware Page Title & Page Actions */}
          <div className="hidden sm:flex items-center gap-3 min-w-0 flex-1 justify-center px-1 sm:px-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 tracking-wide truncate">
                {activePageTitle}
              </h2>
            </div>
            {headerInfo?.actions && (
              <div className="hidden md:flex items-center gap-2 shrink-0">
                {headerInfo.actions}
              </div>
            )}
          </div>

          {/* Right Side: Global Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Dynamic Support Button */}
            <button
              onClick={() => setIsSupportOpen(true)}
              className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
              title="Platform Help & Support"
            >
              <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="hidden md:inline">Support</span>
            </button>

            {academicYears.length > 0 && (
              <div className="relative">
                <Dropdown
                  align="right"
                  trigger={
                    <button className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer">
                      <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="truncate max-w-[65px] xs:max-w-[90px] sm:max-w-[130px] font-bold">
                        {selectedYear ? selectedYear.name : 'Year'}
                      </span>
                      {selectedYear?.isCurrent && (
                        <span className="hidden md:inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Current
                        </span>
                      )}
                      {selectedYear?.isLocked && <Lock className="w-3 h-3 text-slate-400 ml-0.5 shrink-0" />}
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  }
                >
                  <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Switch Academic Year
                  </div>
                  {academicYears.map((yr) => (
                    <DropdownItem
                      key={yr.id}
                      onClick={() => setSelectedYearId(yr.id)}
                      className={yr.id === selectedYearId ? 'bg-indigo-50 text-indigo-700 font-bold' : ''}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{yr.name}</span>
                        <div className="flex items-center gap-1">
                          {yr.isCurrent && (
                            <Badge variant="success" size="sm">
                              Current
                            </Badge>
                          )}
                          {yr.isLocked && (
                            <Badge variant="neutral" size="sm">
                              Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                    </DropdownItem>
                  ))}
                </Dropdown>
              </div>
            )}

            {/* User Profile Menu */}
            <Dropdown
              align="right"
              trigger={
                <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {ownerName.charAt(0)}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
                </button>
              }
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{ownerName}</p>
                <p className="text-[11px] text-slate-500 truncate">{ownerEmail}</p>
                <span className="mt-1 inline-block text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {roleLabel?.toUpperCase() || 'SCHOOL OWNER'}
                </span>
              </div>
              <DropdownItem icon={User} onClick={() => navigate('/app/profile')}>
                My Profile
              </DropdownItem>
              {isOwner && (
                <DropdownItem icon={Building} onClick={() => navigate('/app/settings/profile')}>
                  School Profile
                </DropdownItem>
              )}
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
        {/* Desktop Sidebar Navigation (Fixed/Sticky within Viewport) */}
        <aside className="hidden lg:flex flex-col justify-between w-64 sticky top-16 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 p-4 shrink-0 self-start">
          <div className="overflow-y-auto flex-1">
            {renderNavItems()}
          </div>
          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center font-mono">
            &copy; {BRAND_CONFIG.copyrightYear} {BRAND_CONFIG.productName}
            <span className="block text-[9px] text-slate-400 font-sans mt-0.5">{BRAND_CONFIG.poweredBy}</span>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        <Drawer
          isOpen={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          title="School Navigation"
          position="left"
        >
          {renderNavItems(() => setIsMobileNavOpen(false))}
        </Drawer>

        {/* Page Content Outlet */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden space-y-4">
          <Outlet />
        </main>
      </div>

      {/* Support Modal */}
      <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Sign Out Confirmation"
        message="Are you sure you want to sign out of your school workspace?"
        confirmText="Sign Out"
        loading={isLoggingOut}
        loadingText="Logging out..."
      />

      {/* Change Password Modal for All Users */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};

