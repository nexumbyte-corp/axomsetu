import React from 'react';
import { Outlet } from 'react-router-dom';
import { Building } from 'lucide-react';
import { useAcademicYear } from '../../context/AcademicYearContext.jsx';

export const HostelLayout = () => {
  const { currentAcademicYear } = useAcademicYear();

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
      </div>

      {/* Nested Route Content */}
      <Outlet />
    </div>
  );
};

