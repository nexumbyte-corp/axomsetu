import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Building2, Plus, ArrowLeft, Key, Edit2, AlertTriangle, Printer, Trash2 } from 'lucide-react';
import { adminService } from '../../services/adminService.js';
import { subscriptionService } from '../../services/subscriptionService.js';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Toast } from '../../components/ui/Toast.jsx';
import { formatDate } from '../../utils/formatters.js';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/ui/Table.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { HardDeleteSchoolModal } from '../../components/admin/HardDeleteSchoolModal.jsx';

export const SchoolDetailsPage = () => {
  const { schoolId } = useParams();
  const _navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'info';

  const [data, setData] = useState(null);
  const [schoolUsers, setSchoolUsers] = useState([]);
  const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState(false);
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

  // Assign Subscription Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignPlans, setAssignPlans] = useState([]);
  const [assignForm, setAssignForm] = useState({
    planId: '',
    durationMonths: '12',
    startDate: new Date().toISOString().split('T')[0],
    amount: '',
    maxStudentLimit: '',
    isEnterprise: false,
    remarks: '',
  });
  const [submittingAssign, setSubmittingAssign] = useState(false);

  // Edit Subscription & Capacity State
  const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);
  const [editSubForm, setEditSubForm] = useState({
    maxStudentLimit: '',
    finalPrice: '',
    endDate: '',
    status: 'ACTIVE',
    remarks: '',
  });
  const [submittingEditSub, setSubmittingEditSub] = useState(false);

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

  const handleOpenAssignModal = async () => {
    try {
      const res = await subscriptionService.adminListPlans();
      if (res.success) setAssignPlans(res.data || []);
    } catch (err) {
      console.error(err);
    }
    setAssignForm({
      planId: '',
      durationMonths: '12',
      startDate: new Date().toISOString().split('T')[0],
      amount: '',
      maxStudentLimit: '',
      isEnterprise: false,
      remarks: '',
    });
    setIsAssignModalOpen(true);
  };

  const handleAssignSubscriptionSubmit = async (e) => {
    e.preventDefault();
    setSubmittingAssign(true);
    try {
      const res = await subscriptionService.adminCreateManualSubscription({
        schoolId,
        ...assignForm,
      });
      if (res.success) {
        setToast({ type: 'success', message: 'Subscription assigned successfully to school.' });
        setIsAssignModalOpen(false);
        fetchSchoolDetails();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to assign subscription' });
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleOpenEditSubModal = () => {
    if (!subscription) return;
    setEditSubForm({
      maxStudentLimit: subscription.maxStudentLimitSnapshot !== null && subscription.maxStudentLimitSnapshot !== undefined
        ? String(subscription.maxStudentLimitSnapshot)
        : '',
      finalPrice: subscription.finalPriceSnapshot !== null && subscription.finalPriceSnapshot !== undefined
        ? String(subscription.finalPriceSnapshot)
        : '',
      endDate: subscription.endDate ? new Date(subscription.endDate).toISOString().split('T')[0] : '',
      status: subscription.status || 'ACTIVE',
      remarks: subscription.remarks || '',
    });
    setIsEditSubModalOpen(true);
  };

  const handleEditSubSubmit = async (e) => {
    e.preventDefault();
    if (!subscription?.id) return;
    setSubmittingEditSub(true);
    try {
      const res = await subscriptionService.adminUpdateSubscriptionDetails(subscription.id, editSubForm);
      if (res.success) {
        setToast({ type: 'success', message: 'Subscription capacity & details updated successfully.' });
        setIsEditSubModalOpen(false);
        fetchSchoolDetails();
      }
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to update subscription details' });
    } finally {
      setSubmittingEditSub(false);
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

  const { school, owner: _owner, subscription, subscriptionsHistory = [], termsAcceptances = [] } = data;

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

        <div className="flex items-center gap-2">
          <Button
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => setIsHardDeleteModalOpen(true)}
          >
            Hard Delete School
          </Button>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-2 sm:gap-6 text-xs font-bold tab-scroll-container overflow-x-auto whitespace-nowrap scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab('info')}
          className={`pb-3 shrink-0 transition-colors ${
            activeTab === 'info'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          School Information
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`pb-3 shrink-0 transition-colors ${
            activeTab === 'subscription'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Subscription Information
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 shrink-0 transition-colors ${
            activeTab === 'users'
              ? 'border-b-2 border-indigo-600 text-indigo-700 font-extrabold'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Users & Permissions ({schoolUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('legal')}
          className={`pb-3 shrink-0 transition-colors ${
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
            <form onSubmit={handleUpdateSchoolSubmit} autoComplete="off" className="space-y-4 max-w-2xl">
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
                  {formatDate(school.createdAt)}
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
              <h3 className="text-sm font-bold text-slate-900">Active Subscription Status</h3>
              <div className="flex flex-wrap items-center gap-2">
                {subscription && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Printer}
                      onClick={() => _navigate(`/admin/subscriptions/${subscription.id}/invoice`)}
                      title="View & Print Official B2B Business Invoice"
                    >
                      View Invoice
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Edit2}
                      onClick={handleOpenEditSubModal}
                    >
                      Edit Capacity & Details
                    </Button>
                  </>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  onClick={handleOpenAssignModal}
                >
                  Assign Subscription / Enterprise
                </Button>
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
            </div>

            {subscription ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 bg-indigo-50/50 rounded-lg border border-indigo-100">
                  <span className="text-indigo-700 font-bold block uppercase text-[10px]">Current Plan</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-extrabold text-slate-900 block">
                      {subscription.planNameSnapshot || subscription.plan?.name}
                    </span>
                    {(subscription.isEnterpriseSnapshot || subscription.plan?.isEnterprise) && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                        ENTERPRISE
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Student Capacity Limit</span>
                  <span className="text-lg font-bold text-slate-900 font-mono mt-1 block">
                    {subscription.maxStudentLimitSnapshot ? (
                      <span className="text-indigo-700 font-extrabold">{subscription.maxStudentLimitSnapshot} Active Students</span>
                    ) : (
                      'Unlimited Students'
                    )}
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
                    {formatCurrency(subscription.finalPriceSnapshot ?? subscription.plan?.finalPrice ?? 0)}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Start Date</span>
                  <span className="font-bold text-slate-900 font-mono mt-1 block">
                    {formatDate(subscription.startDate)}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Expiry Date</span>
                  <span className="font-bold text-slate-900 font-mono mt-1 block">
                    {formatDate(subscription.endDate, 'N/A (Expired)')}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 sm:col-span-2">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Days Remaining</span>
                  <span className={`text-lg font-bold font-mono mt-1 block ${daysRemaining !== null && daysRemaining <= 7 ? 'text-rose-600' : 'text-slate-900'}`}>
                    {daysRemaining !== null ? `${daysRemaining} days remaining` : '0 days'}
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
                    <th className="pb-2 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subscriptionsHistory.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-bold text-slate-900">{sub.planNameSnapshot || sub.plan?.name}</td>
                      <td className="py-2.5 font-mono text-slate-600">{formatDate(sub.startDate)}</td>
                      <td className="py-2.5 font-mono text-slate-600">
                        {formatDate(sub.endDate, 'N/A (Expired)')}
                      </td>
                      <td className="py-2.5">
                        <Badge variant={sub.status === 'ACTIVE' ? 'success' : sub.status === 'SUSPENDED' ? 'warning' : 'danger'}>{sub.status}</Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Printer}
                          onClick={() => _navigate(`/admin/subscriptions/${sub.id}/invoice`)}
                          title="View & Print Subscription Invoice"
                        />
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
              <form onSubmit={handleCreateUserSubmit} autoComplete="off" className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
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
                            {formatDate(u.createdAt)}
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
        <form onSubmit={handleResetPasswordSubmit} autoComplete="off" className="bg-white p-5 rounded-xl border border-slate-300 shadow-lg space-y-4 max-w-md mx-auto">
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

      {/* Assign Enterprise / Subscription Modal */}
      {isAssignModalOpen && (
        <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title={`Assign Subscription — ${school.name}`}>
          <form onSubmit={handleAssignSubscriptionSubmit} autoComplete="off" className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 block">Super Admin Direct Subscription Grant</span>
              <span className="text-slate-500">Assign a standard subscription or custom Enterprise plan directly to {school.name}.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Subscription Plan"
                value={assignForm.planId}
                onChange={(e) => {
                  const sel = assignPlans.find((p) => p.id === e.target.value);
                  let autoMonths = assignForm.durationMonths;
                  if (sel && !sel.isEnterprise && sel.type !== 'ENTERPRISE') {
                    if (sel.durationUnit === 'YEAR') {
                      autoMonths = String((sel.durationValue || 1) * 12);
                    } else if (sel.durationUnit === 'MONTH') {
                      autoMonths = String(sel.durationValue || 1);
                    } else if (sel.type === 'MONTHLY') autoMonths = '1';
                    else if (sel.type === 'QUARTERLY') autoMonths = '3';
                    else if (sel.type === 'HALFYEARLY') autoMonths = '6';
                    else if (sel.type === 'YEARLY') autoMonths = '12';
                  }
                  setAssignForm((prev) => ({
                    ...prev,
                    planId: e.target.value,
                    durationMonths: autoMonths,
                    amount: sel ? String(sel.finalPrice) : prev.amount,
                    maxStudentLimit: sel && sel.maxStudentLimit ? String(sel.maxStudentLimit) : prev.maxStudentLimit,
                    isEnterprise: sel ? Boolean(sel.isEnterprise) : prev.isEnterprise,
                  }));
                }}
              >
                <option value="">-- Custom / Enterprise Plan --</option>
                {assignPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatCurrency(p.finalPrice)})
                  </option>
                ))}
              </Select>

              <Select
                label="Duration (Months) *"
                value={assignForm.durationMonths}
                onChange={(e) => setAssignForm({ ...assignForm, durationMonths: e.target.value })}
              >
                <option value="1">1 Month</option>
                <option value="3">3 Months</option>
                <option value="6">6 Months</option>
                <option value="12">12 Months (1 Year)</option>
                <option value="24">24 Months (2 Years)</option>
                <option value="36">36 Months (3 Years)</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Final Price (₹) *"
                type="number"
                min="0"
                placeholder="e.g. 25000"
                value={assignForm.amount}
                onChange={(e) => setAssignForm({ ...assignForm, amount: e.target.value })}
                required
              />

              <Input
                label="Max Active Student Limit"
                type="number"
                min="1"
                placeholder="e.g. 1000 (Empty = Unlimited)"
                value={assignForm.maxStudentLimit}
                onChange={(e) => setAssignForm({ ...assignForm, maxStudentLimit: e.target.value })}
              />
            </div>

            <DatePicker
              label="Start Date"
              value={assignForm.startDate}
              onChange={(val) => setAssignForm({ ...assignForm, startDate: val })}
            />

            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer bg-purple-50/60 p-3 rounded-lg border border-purple-200">
              <input
                type="checkbox"
                checked={assignForm.isEnterprise}
                onChange={(e) => setAssignForm({ ...assignForm, isEnterprise: e.target.checked })}
                className="rounded border-purple-300 text-purple-600 focus:ring-purple-500 w-4 h-4"
              />
              <div>
                <span className="font-bold text-purple-950 block">Enterprise Custom Plan</span>
                <span className="text-[10px] text-purple-700 font-normal">Flag this subscription as an Enterprise custom tier.</span>
              </div>
            </label>

            <Input
              label="Remarks / Contract Notes"
              placeholder="e.g. Contract ref #1042 / Special Enterprise discount"
              value={assignForm.remarks}
              onChange={(e) => setAssignForm({ ...assignForm, remarks: e.target.value })}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)} disabled={submittingAssign}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submittingAssign}>
                Assign Subscription
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {/* Edit Subscription Capacity & Details Modal */}
      {isEditSubModalOpen && subscription && (
        <Modal isOpen={isEditSubModalOpen} onClose={() => setIsEditSubModalOpen(false)} title={`Edit Subscription & Capacity — ${school.name}`}>
          <form onSubmit={handleEditSubSubmit} autoComplete="off" className="space-y-4">
            <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-900">
              <span className="font-bold block">Super Admin Direct Capacity Override</span>
              <span className="text-indigo-700">Update the maximum active student limit, total price, status, or expiry date for this school subscription.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Max Active Student Capacity Limit"
                type="number"
                min="1"
                placeholder="e.g. 500 (Empty = Unlimited)"
                value={editSubForm.maxStudentLimit}
                onChange={(e) => setEditSubForm({ ...editSubForm, maxStudentLimit: e.target.value })}
              />

              <Input
                label="Subscription Price (₹)"
                type="number"
                min="0"
                placeholder="e.g. 15000"
                value={editSubForm.finalPrice}
                onChange={(e) => setEditSubForm({ ...editSubForm, finalPrice: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DatePicker
                label="Expiry Date"
                value={editSubForm.endDate}
                onChange={(val) => setEditSubForm({ ...editSubForm, endDate: val })}
              />

              <Select
                label="Subscription Status"
                value={editSubForm.status}
                onChange={(e) => setEditSubForm({ ...editSubForm, status: e.target.value })}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED</option>
                <option value="EXPIRED">EXPIRED</option>
              </Select>
            </div>

            <Input
              label="Remarks / Capacity Adjustment Notes"
              placeholder="e.g. Upgraded student limit upon admin request..."
              value={editSubForm.remarks}
              onChange={(e) => setEditSubForm({ ...editSubForm, remarks: e.target.value })}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsEditSubModalOpen(false)} disabled={submittingEditSub}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={submittingEditSub}>
                Save Subscription Capacity
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Permanent Hard Delete School Modal */}
      <HardDeleteSchoolModal
        isOpen={isHardDeleteModalOpen}
        onClose={() => setIsHardDeleteModalOpen(false)}
        school={school}
        onSuccess={() => {
          _navigate('/admin/schools');
        }}
      />
    </div>
  );
};
