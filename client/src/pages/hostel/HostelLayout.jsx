import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Building,
  LayoutDashboard,
  Settings,
  CreditCard,
  UserPlus,
  Users,
  ArrowLeftRight,
  BarChart3,
} from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';

export const HostelLayout = () => {
  const { currentAcademicYear } = useAcademicYear();

  const tabs = [
    { label: 'Overview', path: '/app/hostel', icon: LayoutDashboard, end: true },
    { label: 'Residents', path: '/app/hostel/residents', icon: Users },
    { label: 'Admission', path: '/app/hostel/admission', icon: UserPlus },
    { label: 'Rooms & Beds', path: '/app/hostel/setup', icon: Settings },
    { label: 'Fees', path: '/app/hostel/fees', icon: CreditCard },
    { label: 'Reports', path: '/app/hostel/reports', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Building className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hostel Management</h1>
              <p className="text-sm text-gray-500">
                Manage hostels, rooms, bed availability, admissions, transfers, exits, and hostel fees
              </p>
            </div>
          </div>
          {currentAcademicYear && (
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
              Academic Year: {currentAcademicYear.name}
            </div>
          )}
        </div>

        {/* Sub-tab Navigation */}
        <div className="mt-6 border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-1 sm:space-x-4 min-w-max pb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  end={tab.end}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Nested Route Content */}
      <Outlet />
    </div>
  );
};
