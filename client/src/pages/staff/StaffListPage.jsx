import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StaffSubNav } from './StaffSubNav.jsx';
import { AddEditStaffModal } from './AddEditStaffModal.jsx';
import { usePermission } from '../../hooks/usePermission.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { formatDate } from '../../utils/formatters.js';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Edit,
  Trash2,
  Phone,
  Building,
  Briefcase,
  ChevronRight,
  Calendar,
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_LEAVE', label: 'On Leave' },
  { value: 'INACTIVE', label: 'Inactive' },
  { value: 'RESIGNED', label: 'Resigned' },
];

export const StaffListPage = () => {
  useDocumentTitle('Staff Directory');
  const navigate = useNavigate();
  const { can } = usePermission();

  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedDesignation, setSelectedDesignation] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Delete modal state
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchStaffData = async () => {
    setLoading(true);
    try {
      const res = await staffService.getStaffList({
        page,
        limit: 10,
        search,
        department: selectedDepartment,
        designation: selectedDesignation,
        status: selectedStatus,
      });

      setStaffList(res.data);
      setPagination(res.pagination);

      if (res.metadata) {
        setDepartments(res.metadata.departments || []);
        setDesignations(res.metadata.designations || []);
      }
    } catch (err) {
      console.error('Error loading staff list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffData();
  }, [page, selectedDepartment, selectedDesignation, selectedStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStaffData();
  };

  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;
    setIsDeleting(true);
    try {
      await staffService.deleteStaff(staffToDelete.id);
      fetchStaffData();
      setStaffToDelete(null);
    } catch (err) {
      console.error('Failed to delete staff:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'ACTIVE':
        return <Badge variant="success">Active</Badge>;
      case 'ON_LEAVE':
        return <Badge variant="warning">On Leave</Badge>;
      case 'INACTIVE':
        return <Badge variant="neutral">Inactive</Badge>;
      case 'RESIGNED':
        return <Badge variant="danger">Resigned</Badge>;
      default:
        return <Badge variant="neutral">{st}</Badge>;
    }
  };

  const deptOptions = [
    { value: 'ALL', label: 'All Departments' },
    ...departments.map((d) => ({ value: d, label: d })),
  ];

  const desigOptions = [
    { value: 'ALL', label: 'All Designations' },
    ...designations.map((d) => ({ value: d, label: d })),
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <ModulePageHeader
        icon={Users}
        title="Staff & Payroll"
        description="Manage Staff Records, Salary Structures, Payroll Processing & Salary History"
        actions={
          can('STAFF_CREATE') && (
            <Button
              variant="primary"
              size="sm"
              icon={UserPlus}
              onClick={() => setIsAddModalOpen(true)}
            >
              Add Staff
            </Button>
          )
        }
      />

      {/* Shared Staff Navigation Tabs */}
      <StaffSubNav />

      {/* Filter and Search Section */}
      <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
        <form onSubmit={handleSearchSubmit} autoComplete="off" className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-1">
            <Input
              placeholder="Search staff by name or employee code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={Search}
            />
          </div>

          <Select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setPage(1);
            }}
            options={deptOptions}
          />

          <Select
            value={selectedDesignation}
            onChange={(e) => {
              setSelectedDesignation(e.target.value);
              setPage(1);
            }}
            options={desigOptions}
          />

          <Select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            options={STATUS_FILTERS}
          />
        </form>
      </Card>

      {/* Staff Display (Desktop Table / Mobile Cards) */}
      <Card className="overflow-hidden shadow-2xs">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner size="lg" />
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No staff records found matching your filters.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block table-responsive-wrapper">
              <table className="w-full text-xs text-left min-w-[700px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Staff</th>
                    <th className="py-3.5 px-4">Employee Code</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Designation</th>
                    <th className="py-3.5 px-4">Joining Date</th>
                    <th className="py-3.5 px-4">Phone</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {staffList.map((st) => (
                    <tr
                      key={st.id}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                      onClick={() => navigate(`/app/staff/${st.id}`)}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors">
                              {st.name}
                            </p>
                            {st.email && <p className="text-[11px] text-slate-500">{st.email}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {st.employeeId}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {st.department || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {st.designation || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-mono">
                        {formatDate(st.joiningDate)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-600 font-mono">
                        {st.phone || '—'}
                      </td>

                      <td className="py-3.5 px-4">{getStatusBadge(st.status)}</td>

                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={Eye}
                            title="View Profile"
                            onClick={() => navigate(`/app/staff/${st.id}`)}
                          />

                          {can('STAFF_EDIT') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Edit}
                              title="Edit Profile"
                              onClick={() => {
                                setSelectedStaff(st);
                                setIsEditModalOpen(true);
                              }}
                            />
                          )}

                          {can('STAFF_DELETE') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={Trash2}
                              title="Delete"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setStaffToDelete(st)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {staffList.map((st) => (
                <div
                  key={st.id}
                  onClick={() => navigate(`/app/staff/${st.id}`)}
                  className="p-4 space-y-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base">
                        {st.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{st.name}</h4>
                        <span className="font-mono text-xs font-bold text-indigo-600">{st.employeeId}</span>
                      </div>
                    </div>
                    {getStatusBadge(st.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{st.department || 'General'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      <span>{st.designation || 'Staff'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{formatDate(st.joiningDate)}</span>
                    </div>
                    {st.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono">{st.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] font-semibold text-indigo-600 flex items-center gap-1">
                      View Profile <ChevronRight className="w-3.5 h-3.5" />
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Edit}
                        onClick={() => {
                          setSelectedStaff(st);
                          setIsEditModalOpen(true);
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        className="text-red-500"
                        onClick={() => setStaffToDelete(st)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={(p) => setPage(p)}
            />
          </div>
        )}
      </Card>

      {/* Add / Edit Staff Modal */}
      <AddEditStaffModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedStaff(null);
        }}
        staff={isEditModalOpen ? selectedStaff : null}
        onSuccess={fetchStaffData}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(staffToDelete)}
        onClose={() => setStaffToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Staff Member"
        message={`Are you sure you want to remove ${staffToDelete?.name} (${staffToDelete?.employeeId})? If financial payment records exist, status will automatically update to INACTIVE.`}
        confirmText="Delete Staff"
        loading={isDeleting}
      />
    </div>
  );
};
