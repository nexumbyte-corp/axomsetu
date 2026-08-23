import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Filter, KeyRound, Edit2, Building, UserCheck, RefreshCw, MoreVertical } from 'lucide-react';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { Spinner } from '../components/ui/Spinner.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { Dropdown, DropdownItem } from '../components/ui/Dropdown.jsx';
import { adminService } from '../services/adminService.js';
import { formatDate } from '../utils/formatters.js';

export const SuperAdminUsersPage = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Forms State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [roleForm, setRoleForm] = useState({
    role: 'SUPER_ADMIN',
  });

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.listUsers({
        page: pagination.page,
        limit: pagination.limit,
        search,
        role: roleFilter,
      });

      setUsers(res.data || []);
      if (res.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          totalPages: res.pagination.totalPages,
        }));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to fetch platform users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await adminService.createSuperAdmin(createForm);
      setSuccessMsg(`Super Admin account created for ${createForm.email}!`);
      setIsCreateModalOpen(false);
      setCreateForm({ name: '', email: '', password: '', phone: '' });
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create Super Admin account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (u) => {
    setSelectedUser(u);
    setEditForm({ name: u.name, email: u.email, phone: u.phone || '' });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await adminService.updateUserProfile(selectedUser.id, editForm);
      setSuccessMsg(`Profile for ${editForm.email} updated successfully!`);
      setIsEditModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRole = (u) => {
    setSelectedUser(u);
    setRoleForm({ role: u.role });
    setIsRoleModalOpen(true);
  };

  const handleRoleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await adminService.changeUserRole(selectedUser.id, roleForm.role);
      setSuccessMsg(`Role for ${selectedUser.email} updated to ${roleForm.role}!`);
      setIsRoleModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user role.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenResetPassword = (u) => {
    setSelectedUser(u);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setIsResetPasswordModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await adminService.resetUserPassword(selectedUser.id, passwordForm.newPassword);
      setSuccessMsg(`Password for ${selectedUser.email} reset successfully!`);
      setIsResetPasswordModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to reset user password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold">Platform User Directory</h1>
          </div>
          <p className="text-xs text-slate-300">
            Manage global Super Admins, School Administrators, credentials, and access roles across the platform.
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => {
            setCreateForm({ name: '', email: '', password: '', phone: '' });
            setIsCreateModalOpen(true);
          }}
        >
          Create Super Admin
        </Button>
      </div>

      {successMsg && <Alert type="success" message={successMsg} onClose={() => setSuccessMsg(null)} />}
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      {/* Filter Bar */}
      <Card className="p-4 bg-white">
        <form onSubmit={handleSearchSubmit} autoComplete="off" className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search user by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={[
                { value: '', label: 'All Roles' },
                { value: 'SUPER_ADMIN', label: 'Super Admin' },
                { value: 'SCHOOL_ADMIN', label: 'School Admin' },
              ]}
            />
          </div>

          <Button type="submit" variant="secondary" icon={Filter} size="sm">
            Filter
          </Button>

          <Button
            type="button"
            variant="neutral"
            icon={RefreshCw}
            size="sm"
            onClick={fetchUsers}
          />
        </form>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-2">
            <Spinner size="lg" />
            <p className="text-xs text-slate-500 font-medium">Loading platform users...</p>
          </div>
        ) : users.length === 0 ? (
          <EmptyState title="No Users Found" description="Try adjusting search or role filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">User Name & Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Associated School(s)</th>
                  <th className="p-3.5">Created Date</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      <div className="text-slate-500 font-mono text-[11px]">{u.email}</div>
                    </td>

                    <td className="p-3.5">
                      <Badge variant={u.role === 'SUPER_ADMIN' ? 'danger' : 'indigo'}>
                        {u.role}
                      </Badge>
                    </td>

                    <td className="p-3.5 font-mono">{u.phone || '-'}</td>

                    <td className="p-3.5">
                      {Array.isArray(u.schools) && u.schools.length > 0 ? (
                        <div className="space-y-0.5">
                          {u.schools.map((s) => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 mr-1"
                            >
                              <Building className="w-3 h-3 text-indigo-600" />
                              {s.name} ({s.code})
                              {s.isOwner && (
                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">
                                  Owner
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Platform Level / Global</span>
                      )}
                    </td>

                    <td className="p-3.5">{formatDate(u.createdAt)}</td>

                    <td className="p-3.5 text-center">
                      <Dropdown
                        align="right"
                        trigger={
                          <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                      >
                        <DropdownItem icon={Edit2} onClick={() => handleOpenEdit(u)}>
                          Edit Profile
                        </DropdownItem>
                        <DropdownItem icon={UserCheck} onClick={() => handleOpenRole(u)}>
                          Change Role
                        </DropdownItem>
                        <DropdownItem icon={KeyRound} onClick={() => handleOpenResetPassword(u)}>
                          Reset Password
                        </DropdownItem>
                      </Dropdown>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL 1: Create Super Admin */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Super Admin Account"
          size="md"
        >
          <form onSubmit={handleCreateSubmit} autoComplete="off" className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
              <Input
                placeholder="Enter user full name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                <Input
                  placeholder="Enter 10-digit phone number"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Initial Password *</label>
              <Input
                type="password"
                placeholder="Min 8 characters with numbers & symbols"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                Create Super Admin
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: Edit Profile */}
      {isEditModalOpen && selectedUser && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Edit User Profile: ${selectedUser.name}`}
          size="md"
        >
          <form onSubmit={handleEditSubmit} autoComplete="off" className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Full Name *</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address *</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number</label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                Save Profile Changes
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 3: Change Role */}
      {isRoleModalOpen && selectedUser && (
        <Modal
          isOpen={isRoleModalOpen}
          onClose={() => setIsRoleModalOpen(false)}
          title={`Change Role: ${selectedUser.email}`}
          size="md"
        >
          <form onSubmit={handleRoleSubmit} autoComplete="off" className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Select Role *</label>
              <Select
                value={roleForm.role}
                onChange={(e) => setRoleForm({ role: e.target.value })}
                options={[
                  { value: 'SUPER_ADMIN', label: 'SUPER_ADMIN (Full Platform Access)' },
                  { value: 'SCHOOL_ADMIN', label: 'SCHOOL_ADMIN (School Scoped)' },
                ]}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsRoleModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={submitting}>
                Update Role
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 4: Reset Password */}
      {isResetPasswordModalOpen && selectedUser && (
        <Modal
          isOpen={isResetPasswordModalOpen}
          onClose={() => setIsResetPasswordModalOpen(false)}
          title={`Reset Password for ${selectedUser.email}`}
          size="md"
        >
          <form onSubmit={handleResetPasswordSubmit} autoComplete="off" className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">New Password *</label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Confirm New Password *</label>
              <Input
                type="password"
                placeholder="Re-type new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setIsResetPasswordModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" type="submit" loading={submitting}>
                Reset Password
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
