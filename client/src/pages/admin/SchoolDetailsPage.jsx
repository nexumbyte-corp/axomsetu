import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Users,
  CreditCard,
  CheckCircle2,
  ShieldAlert,
  XCircle,
  Plus,
  Trash2,
  UserCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  RefreshCw,
  Key,
  Shield,
  Edit2,
  Lock,
  Power,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { subscriptionService } from '../../services/subscriptionService.js';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Modal } from '../../components/ui/Modal.jsx';

export const SchoolDetailsPage = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'info';

  const [data, setData] = useState(null);
  const [schoolUsers, setSchoolUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab); // 'info' | 'subscription' | 'users'

  // Inline User Creation / Editing Form State
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    schoolRole: 'SCHOOL_ADMIN',
    isOwner: false,
    systemRole: 'SCHOOL_ADMIN',
  });
  const [submittingUser, setSubmittingUser] = useState(false);

  // Reset Password State
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);

  // Edit School Info State
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [schoolForm, setSchoolForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
  });
  const [submittingSchool, setSubmittingSchool] = useState(false);

  // Expire Subscription State
  const [isExpireModalOpen, setIsExpireModalOpen] = useState(false);
  const [expireReason, setExpireReason] = useState('');
  const [submittingExpire, setSubmittingExpire] = useState(false);

  const fetchSchoolDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getSchoolDetails(schoolId);
      setData(res.data);
      if (res.data?.school) {
        setSchoolForm({
          name: res.data.school.name || '',
          address: res.data.school.address || '',
          phone: res.data.school.phone || '',
          email: res.data.school.email || '',
        });
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to fetch school details' });
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  const fetchSchoolUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const res = await adminService.listSchoolUsers(schoolId);
      if (res.success) {
        setSchoolUsers(res.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchSchoolDetails();
    fetchSchoolUsers();
  }, [fetchSchoolDetails, fetchSchoolUsers]);

  const handleUpdateSchoolSubmit = async (e) => {
    e.preventDefault();
    setSubmittingSchool(true);
    try {
      await adminService.updateSchool(schoolId, schoolForm);
      setToast({ type: 'success', message: 'School details updated successfully.' });
      setIsEditingSchool(false);
      fetchSchoolDetails();
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to update school details' });
    } finally {
      setSubmittingSchool(false);
    }
  };

  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.email) {
      setToast({ type: 'danger', message: 'Name and email are required.' });
      return;
    }
    setSubmittingUser(true);
    try {
      await adminService.addSchoolAdmin(schoolId, userFormData);
      setToast({ type: 'success', message: `User ${userFormData.name} added successfully to ${school.name}.` });
      setIsCreatingUser(false);
      setUserFormData({ name: '', email: '', password: '', schoolRole: 'SCHOOL_ADMIN', isOwner: false, systemRole: 'SCHOOL_ADMIN' });
      fetchSchoolUsers();
      fetchSchoolDetails();
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to add user to school' });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleToggleUserStatus = async (userItem) => {
    try {
      const res = await adminService.updateSchoolUserStatus(schoolId, userItem.id, !userItem.isActive);
      if (res.success) {
        setToast({
          type: 'success',
          message: `User ${userItem.name} ${!userItem.isActive ? 'activated' : 'deactivated'} successfully.`,
        });
        fetchSchoolUsers();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to update user status' });
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setToast({ type: 'danger', message: 'Password must be at least 6 characters.' });
      return;
    }
    setSubmittingReset(true);
    try {
      await adminService.resetUserPassword(resettingUser.userId, newPassword);
      setToast({ type: 'success', message: `Password reset successfully for ${resettingUser.name}.` });
      setResettingUser(null);
      setNewPassword('');
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to reset user password' });
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleExpireSubscriptionSubmit = async (e) => {
    e.preventDefault();
    if (!data?.subscription?.id) return;
    setSubmittingExpire(true);
    try {
      const res = await subscriptionService.adminExpireSubscription(data.subscription.id, expireReason.trim() || null);
      if (res.success) {
        setToast({ type: 'success', message: 'Subscription expired successfully.' });
        setIsExpireModalOpen(false);
        setExpireReason('');
        fetchSchoolDetails();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to expire subscription' });
    } finally {
      setSubmittingExpire(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" label="Loading school details..." />
      </div>
    );
  }

  if (!data?.school) {
    return (
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <p className="text-slate-500 text-sm">School record not found.</p>
        <Link to="/admin/schools" className="mt-4 inline-block text-xs font-semibold text-indigo-600">
          Back to Schools
        </Link>
      </div>
    );
  }

  const { school, owner, subscription, subscriptionsHistory = [], termsAcceptances = [] } = data;

  let daysRemaining = null;
  if (subscription?.endDate) {
    daysRemaining = Math.max(0, Math.ceil((new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div>
        <Link
          to="/admin/schools"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Schools</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-xs shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{school.name}</h1>
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                {school.code}
              </span>
              {school.status === 'ACTIVE' && <Badge variant="success">ACTIVE</Badge>}
              {school.status === 'SUSPENDED' && <Badge variant="danger">SUSPENDED</Badge>}
              {school.status === 'INACTIVE' && <Badge variant="neutral">INACTIVE</Badge>}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
              <span>Contact: {school.email || '-'}</span>
              <span>•</span>
              <span>Phone: {school.phone || '-'}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="border-b border-slate-200 flex gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('info')}
          className={`pb-3 transition-colors ${
            activeTab === 'info'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          School Information
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`pb-3 transition-colors ${
            activeTab === 'subscription'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Subscription Information
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 transition-colors ${
            activeTab === 'users'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Users & Permissions ({schoolUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('legal')}
          className={`pb-3 transition-colors ${
            activeTab === 'legal'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Legal Consent Audit ({termsAcceptances.length})
        </button>
      </div>

      {/* Tab 1: School Information */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900">School Profile & Contact Details</h3>
            {!isEditingSchool ? (
              <Button variant="outline" size="sm" icon={Edit2} onClick={() => setIsEditingSchool(true)}>
                Edit School Info
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditingSchool(false)}>
                Cancel Editing
              </Button>
            )}
          </div>

          {isEditingSchool ? (
            <form onSubmit={handleUpdateSchoolSubmit} className="space-y-4 max-w-2xl">
              <Input
                label="School Name *"
                value={schoolForm.name}
                onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <Input
                  label="Contact Email"
                  type="email"
                  value={schoolForm.email}
                  onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                />
                <Input
                  label="Phone Number"
                  value={schoolForm.phone}
                  onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                />
              </div>

              <Input
                label="Address"
                value={schoolForm.address}
                onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
              />

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingSchool(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" loading={submittingSchool}>
                  Save Profile Changes
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">School Name</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{school.name}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">School Code / ID</span>
                <span className="font-mono font-bold text-slate-900 text-sm mt-0.5 block">{school.code}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Current Status</span>
                <span className="mt-0.5 block">
                  <Badge variant={school.status === 'ACTIVE' ? 'success' : 'danger'}>{school.status}</Badge>
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Primary Contact Email</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{school.email || 'Not provided'}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Phone Number</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{school.phone || 'Not provided'}</span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block text-[11px]">Registered Date</span>
                <span className="font-mono text-slate-700 mt-0.5 block">
                  {new Date(school.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <span className="text-slate-400 font-semibold block text-[11px]">Address</span>
                <span className="font-medium text-slate-800 mt-0.5 block">{school.address || 'No address specified'}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Subscription Information */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Active Subscription Status</h3>
              {subscription?.status === 'ACTIVE' && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={AlertTriangle}
                  className="text-rose-600 hover:bg-rose-50 border-rose-200"
                  onClick={() => {
                    setExpireReason('');
                    setIsExpireModalOpen(true);
                  }}
                >
                  Expire Subscription
                </Button>
              )}
            </div>

            {subscription ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <span className="text-indigo-700 font-bold block uppercase text-[10px]">Current Plan</span>
                  <span className="text-lg font-extrabold text-slate-900 mt-1 block">
                    {subscription.plan?.name || subscription.planNameSnapshot}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Subscription Status</span>
                  <span className="mt-1.5 block">
                    <Badge variant={subscription.status === 'ACTIVE' ? 'success' : subscription.status === 'SUSPENDED' ? 'warning' : 'danger'}>
                      {subscription.status}
                    </Badge>
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Subscription Amount</span>
                  <span className="text-lg font-bold text-emerald-600 font-mono mt-1 block">
                    {formatCurrency(subscription.finalPriceSnapshot || subscription.plan?.price)}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Start Date</span>
                  <span className="font-bold text-slate-900 font-mono mt-1 block">
                    {new Date(subscription.startDate).toLocaleDateString('en-IN')}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Expiry Date</span>
                  <span className="font-bold text-slate-900 font-mono mt-1 block">
                    {subscription.endDate ? (
                      new Date(subscription.endDate).toLocaleDateString('en-IN')
                    ) : (
                      <span className="text-rose-600">N/A (Expired)</span>
                    )}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Days Remaining</span>
                  <span className={`text-lg font-bold font-mono mt-1 block ${daysRemaining !== null && daysRemaining <= 7 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {daysRemaining !== null ? `${daysRemaining} days` : '0 days'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4">No active subscription found for this school.</p>
            )}
          </div>

          {/* Subscriptions Log History */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">Subscription History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="pb-2">Plan</th>
                    <th className="pb-2">Start Date</th>
                    <th className="pb-2">End Date</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptionsHistory.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-bold text-slate-900">{sub.plan?.name || sub.planNameSnapshot}</td>
                      <td className="py-2.5 font-mono text-slate-600">{new Date(sub.startDate).toLocaleDateString()}</td>
                      <td className="py-2.5 font-mono text-slate-600">
                        {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : <span className="text-rose-600 font-medium">N/A (Expired)</span>}
                      </td>
                      <td className="py-2.5">
                        <Badge variant={sub.status === 'ACTIVE' ? 'success' : sub.status === 'SUSPENDED' ? 'warning' : 'danger'}>{sub.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Users & Permissions Management */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">School User Accounts</h3>
                <p className="text-xs text-slate-500">Manage user accounts and permissions directly within this school tenant context.</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setIsCreatingUser(!isCreatingUser)}
              >
                {isCreatingUser ? 'Close Form' : 'Create User'}
              </Button>
            </div>

            {/* Inline Create User Form */}
            {isCreatingUser && (
              <form onSubmit={handleCreateUserSubmit} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Add Admin / User to {school.name}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <Input
                    label="Full Name *"
                    required
                    placeholder="Enter user name"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  />
                  <Input
                    label="Email Address *"
                    type="email"
                    required
                    placeholder="user@school.com"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  />
                  <Input
                    label="Password (if creating new account)"
                    type="password"
                    placeholder="Min 6 characters"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  />
                  <Select
                    label="Tenant School Role"
                    value={userFormData.schoolRole}
                    onChange={(e) => setUserFormData({ ...userFormData, schoolRole: e.target.value })}
                  >
                    <option value="SCHOOL_ADMIN">SCHOOL_ADMIN (School Admin)</option>
                    <option value="STAFF">STAFF (Staff Member)</option>
                    <option value="OWNER">OWNER (School Owner)</option>
                  </Select>
                </div>

                <div className="flex items-center gap-4 pt-1 text-xs">
                  <label className="flex items-center gap-2 text-slate-700 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={userFormData.isOwner}
                      onChange={(e) =>
                        setUserFormData({
                          ...userFormData,
                          isOwner: e.target.checked,
                          schoolRole: e.target.checked ? 'OWNER' : userFormData.schoolRole,
                        })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Designate as Primary School Owner (Demotes existing owner)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatingUser(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" loading={submittingUser}>
                    Save & Add Admin
                  </Button>
                </div>
              </form>
            )}

            {/* Users Data Table */}
            {loadingUsers ? (
              <div className="py-8 flex justify-center">
                <Spinner label="Loading users list..." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                          No users registered under this school tenant.
                        </TableCell>
                      </TableRow>
                    ) : (
                      schoolUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-bold text-slate-900">
                            {u.name}
                            {u.isOwner && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800">
                                OWNER
                              </span>
                            )}
                          </TableCell>

                          <TableCell className="text-slate-600 text-xs">{u.email}</TableCell>

                          <TableCell className="font-semibold text-slate-700 text-xs">{u.role}</TableCell>

                          <TableCell>
                            <Badge variant={u.isActive ? 'success' : 'neutral'}>
                              {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-xs font-mono text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString('en-IN')}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="xs"
                                icon={Key}
                                onClick={() => {
                                  setResettingUser(u);
                                  setNewPassword('');
                                }}
                              >
                                Reset Pass
                              </Button>

                              {!u.isOwner && (
                                <Button
                                  variant={u.isActive ? 'outline' : 'primary'}
                                  size="xs"
                                  onClick={() => handleToggleUserStatus(u)}
                                >
                                  {u.isActive ? 'Deactivate' : 'Activate'}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Legal Consent Audit History */}
      {activeTab === 'legal' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Legal Consent Audit Records</h3>
                <p className="text-xs text-slate-500">Immutable audit log of Terms & Conditions and Privacy Policy electronic acceptances.</p>
              </div>
              <Badge variant="neutral" className="bg-slate-100 font-mono text-slate-700">
                IMMUTABLE AUDIT LOG
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Accepted Date & Time</TableHead>
                    <TableHead>Accepted By User</TableHead>
                    <TableHead>Terms Version</TableHead>
                    <TableHead>Privacy Policy Version</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {termsAcceptances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                        No legal consent records found for this school tenant.
                      </TableCell>
                    </TableRow>
                  ) : (
                    termsAcceptances.map((acc) => (
                      <TableRow key={acc.id}>
                        <TableCell className="text-xs font-mono font-bold text-slate-900">
                          {new Date(acc.acceptedAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-900">
                          {acc.user?.name || 'Administrator'}
                          <span className="text-[10px] text-slate-400 block font-normal">{acc.user?.email || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Version {acc.termsVersion}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Version {acc.privacyPolicyVersion}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600">
                          {acc.ipAddress || 'Client Server IP'}
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-slate-500 max-w-[200px] truncate" title={acc.userAgent || 'Web Browser'}>
                          {acc.userAgent || 'Standard Web Browser'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Dialog */}
      {resettingUser && (
        <form onSubmit={handleResetPasswordSubmit} className="bg-white p-5 rounded-xl border border-slate-300 shadow-lg space-y-4 max-w-md mx-auto">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
            Reset Password — {resettingUser.name}
          </h3>
          <Input
            label="New Password *"
            type="password"
            placeholder="Min 6 characters"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setResettingUser(null)} disabled={submittingReset}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submittingReset}>
              Confirm Password Reset
            </Button>
          </div>
        </form>
      )}

      {/* Expire Subscription Dialog Modal */}
      {isExpireModalOpen && (
        <Modal
          isOpen={isExpireModalOpen}
          onClose={() => setIsExpireModalOpen(false)}
          title={`Expire Subscription — ${school.name}`}
        >
          <form onSubmit={handleExpireSubscriptionSubmit} className="space-y-4">
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs leading-relaxed">
              <strong>Warning:</strong> Are you sure you want to manually expire the active subscription for{' '}
              <strong>{school.name}</strong>?
              <br />
              This action will immediately change the subscription status to <strong>EXPIRED</strong>, clear the end date to <strong>NULL</strong>, and enforce school access restrictions immediately.
            </div>

            <Input
              label="Reason for Expiration (Optional)"
              placeholder="e.g. Non-payment / Policy violation / Admin request"
              value={expireReason}
              onChange={(e) => setExpireReason(e.target.value)}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsExpireModalOpen(false)} disabled={submittingExpire}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white" loading={submittingExpire}>
                Confirm Expire Subscription
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
