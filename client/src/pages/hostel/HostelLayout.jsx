import React from 'react';
import { Outlet } from 'react-router-dom';
import { Building } from 'lucide-react';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';

export const HostelLayout = () => {
  return (
    <div className="space-y-6">
      <ModulePageHeader
        icon={Building}
        title="Hostel Management"
        description="Manage hostels, rooms, bed availability, admissions, transfers, exits, and hostel fees"
      />

      {/* Nested Route Content */}
      <Outlet />
    </div>
  );
};


