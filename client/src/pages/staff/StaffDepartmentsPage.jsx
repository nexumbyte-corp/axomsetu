import React, { useEffect, useState } from 'react';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StaffSubNav } from './StaffSubNav.jsx';
import { Building2, Briefcase, Users } from 'lucide-react';

export const StaffDepartmentsPage = () => {
  const [loading, setLoading] = useState(true);
  const [departmentsMap, setDepartmentsMap] = useState({});
  const [designationsMap, setDesignationsMap] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await staffService.getStaffList({ limit: 200 });
      const staff = res.data || [];

      const deptCounts = {};
      const desigCounts = {};

      staff.forEach((st) => {
        const d = st.department || 'Unassigned';
        const des = st.designation || 'General Staff';
        deptCounts[d] = (deptCounts[d] || 0) + 1;
        desigCounts[des] = (desigCounts[des] || 0) + 1;
      });

      setDepartmentsMap(deptCounts);
      setDesignationsMap(desigCounts);
    } catch (err) {
      console.error('Failed to load department metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        icon={Building2}
        title="Staff Departments & Designations"
        description="Overview of active departments and designation roles across school staff."
      />

      <StaffSubNav />

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Departments Card */}
          <Card className="p-5 bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Building2 className="w-4 h-4 text-indigo-600" /> School Departments ({Object.keys(departmentsMap).length})
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              {Object.entries(departmentsMap).map(([dept, count]) => (
                <div key={dept} className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{dept}</span>
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold rounded-lg flex items-center gap-1">
                    <Users className="w-3 h-3" /> {count} staff
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Designations Card */}
          <Card className="p-5 bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Briefcase className="w-4 h-4 text-indigo-600" /> Staff Designations ({Object.keys(designationsMap).length})
            </h3>

            <div className="divide-y divide-slate-100 text-xs">
              {Object.entries(designationsMap).map(([desig, count]) => (
                <div key={desig} className="py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{desig}</span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono font-bold rounded-lg flex items-center gap-1">
                    <Users className="w-3 h-3" /> {count} staff
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
