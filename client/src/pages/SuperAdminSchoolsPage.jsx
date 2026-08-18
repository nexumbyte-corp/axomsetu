import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, CheckCircle2, ShieldAlert, XCircle, Eye, ExternalLink, Power, MoreVertical, UserCheck, CreditCard } from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { subscriptionService } from '../services/subscriptionService.js';
import { storage } from '../utils/storage.js';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { TableSkeleton } from '../components/ui/Skeleton.jsx';
import { Toast } from '../components/ui/Toast.jsx';
import { ModulePageHeader } from '../components/ui/ModulePageHeader.jsx';
import { Dropdown, DropdownItem } from '../components/ui/Dropdown.jsx';

export const SuperAdminSchoolsPage = () => {
  const navigate = useNavigate();
  const [schools, setSchools] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter] = useState('');
  const [trialFilter, setTrialFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const fetchSchools = useCallback(
    async (page = pagination.page) => {
      setLoading(true);
      try {
        const params = { page, limit: pagination.limit };
        if (search) params.search = search;
        if (statusFilter) params.status = statusFilter;

        const res = await adminService.listSchools(params);
        if (res.success && res.data) {
          let list = res.data.items || res.data || [];

          // Apply client-side filters for Trial & Plan if selected
          if (trialFilter === 'TRIAL') {
            list = list.filter((s) => s.subscription?.plan?.isTrial || s.subscription?.plan?.code === 'TRIAL');
          } else if (trialFilter === 'NON_TRIAL') {
            list = list.filter((s) => !s.subscription?.plan?.isTrial && s.subscription?.plan?.code !== 'TRIAL');
          }

          if (planFilter) {
            list = list.filter((s) => s.subscription?.plan?.id === planFilter || s.subscription?.plan?.name === planFilter);
          }

          setSchools(list);
          if (res.pagination) {
            setPagination(res.pagination);
          }
        }
      } catch (err) {
        setToast({ type: 'danger', message: err.message || 'Failed to fetch schools directory' });
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, pagination.page, search, statusFilter, trialFilter, planFilter]
  );

  useEffect(() => {
    fetchSchools(1);
  }, [search, statusFilter, trialFilter, planFilter]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res = await subscriptionService.adminListPlans();
        if (res.success) setPlansList(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    loadPlans();
  }, []);

  const handleOpenSchoolContext = (school) => {
    storage.setSchoolContext({
      id: school.id,
      name: school.name,
      code: school.code,
    });
    window.dispatchEvent(new Event('school-context-changed'));
    setToast({
      type: 'success',
      message: `Controlled School Context opened for ${school.name}.`,
    });
    navigate('/app');
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.createSchool({
        ...createForm,
        termsAccepted: true,
      });
      setToast({ type: 'success', message: `School ${createForm.name} registered successfully!` });
      setIsCreateModalOpen(false);
      fetchSchools(1);
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to register school' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSuspendSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setToast({ type: 'danger', message: 'Suspension reason is mandatory.' });
      return;
    }
    setSubmitting(true);
    try {
      await adminService.changeSchoolStatus(selectedSchool.id, 'SUSPENDED', reason);
      setToast({
        type: 'success',
        message: `School ${selectedSchool.name} suspended. All data preserved.`,
      });
      setIsSuspendModalOpen(false);
      setReason('');
      fetchSchools();
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to suspend school' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateSubmit = async () => {
    setSubmitting(true);
    try {
      await adminService.changeSchoolStatus(selectedSchool.id, 'ACTIVE', 'Reactivated by Super Admin');
      setToast({ type: 'success', message: `School ${selectedSchool.name} reactivated!` });
      setIsActivateModalOpen(false);
      fetchSchools();
    } catch (err) {
      setToast({ type: 'danger', message: err.message || 'Failed to activate school' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <ModulePageHeader
        title="Schools"
        description="Central platform directory for managing registered school tenants, subscription lifecycles, and user access."
        actions={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsCreateModalOpen(true)}>
            Register School
          </Button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shadow-2xs">
        <div className="lg:col-span-2">
          <Input
            placeholder="Search school name, code, email, or phone..."
            icon={Search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active Status</option>
            <option value="SUSPENDED">Suspended Status</option>
            <option value="INACTIVE">Inactive Status</option>
          </Select>
        </div>

        <div>
          <Select value={trialFilter} onChange={(e) => setTrialFilter(e.target.value)}>
            <option value="">All Trial Statuses</option>
            <option value="TRIAL">Trial Schools</option>
            <option value="NON_TRIAL">Paid Subscriptions</option>
          </Select>
        </div>
      </div>

      {/* Schools Table */}
      {loading ? (
        <TableSkeleton rows={8} cols={8} />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School Name</TableHead>
                <TableHead>Code / ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subscription / Plan</TableHead>
                <TableHead>Trial Status</TableHead>
                <TableHead>Subscription Expiry</TableHead>
                <TableHead>Registered Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    No schools found matching search or filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                schools.map((sch) => {
                  const sub = sch.subscription;
                  const isTrialPlan = sub?.plan?.isTrial || sub?.plan?.code === 'TRIAL';
                  const expiryDate = sub?.endDate ? new Date(sub.endDate) : null;
                  const isExpired = expiryDate && expiryDate < new Date();

                  return (
                    <TableRow key={sch.id}>
                      <TableCell className="font-bold text-slate-900">
                        <Link to={`/admin/schools/${sch.id}`} className="hover:text-indigo-600">
                          {sch.name}
                        </Link>
                        <span className="text-[10px] text-slate-400 block">{sch.email || sch.phone || '-'}</span>
                      </TableCell>

                      <TableCell className="font-mono text-xs font-bold text-slate-700">{sch.code}</TableCell>

                      <TableCell>
                        {sch.status === 'ACTIVE' && (
                          <Badge variant="success" icon={CheckCircle2}>
                            ACTIVE
                          </Badge>
                        )}
                        {sch.status === 'SUSPENDED' && (
                          <Badge variant="danger" icon={ShieldAlert}>
                            SUSPENDED
                          </Badge>
                        )}
                        {sch.status === 'INACTIVE' && (
                          <Badge variant="neutral" icon={XCircle}>
                            INACTIVE
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-semibold text-slate-800">
                        {sub?.plan?.name || sub?.planNameSnapshot || 'No Plan'}
                      </TableCell>

                      <TableCell>
                        {isTrialPlan ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            TRIAL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            PAID
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-600">
                        {expiryDate ? (
                          <span className={isExpired ? 'text-rose-600 font-bold' : ''}>
                            {expiryDate.toLocaleDateString('en-IN')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-500">
                        {new Date(sch.createdAt).toLocaleDateString('en-IN')}
                      </TableCell>

                      <TableCell className="text-right">
                        <Dropdown
                          align="right"
                          trigger={
                            <button className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          }
                        >
                          <DropdownItem icon={Eye} onClick={() => navigate(`/admin/schools/${sch.id}`)}>
                            View School Details
                          </DropdownItem>

                          <DropdownItem icon={UserCheck} onClick={() => navigate(`/admin/schools/${sch.id}?tab=users`)}>
                            Manage Users
                          </DropdownItem>

                          <DropdownItem icon={CreditCard} onClick={() => navigate(`/admin/schools/${sch.id}?tab=subscription`)}>
                            Manage Subscription
                          </DropdownItem>

                          <DropdownItem icon={ExternalLink} onClick={() => handleOpenSchoolContext(sch)}>
                            Open Tenant Context
                          </DropdownItem>

                          {sch.status === 'ACTIVE' ? (
                            <DropdownItem
                              icon={ShieldAlert}
                              danger
                              onClick={() => {
                                setSelectedSchool(sch);
                                setReason('');
                                setIsSuspendModalOpen(true);
                              }}
                            >
                              Suspend Access
                            </DropdownItem>
                          ) : (
                            <DropdownItem
                              icon={Power}
                              onClick={() => {
                                setSelectedSchool(sch);
                                setIsActivateModalOpen(true);
                              }}
                            >
                              Activate Access
                            </DropdownItem>
                          )}
                        </Dropdown>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            onPageChange={(p) => fetchSchools(p)}
          />
        </div>
      )}

      {/* Create School Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Register School Tenant">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="School Name *"
            required
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Primary Contact Email *"
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            />
            <Input
              label="Phone Number"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
          </div>

          <Input
            label="School Owner Name *"
            required
            value={createForm.adminName}
            onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value, ownerName: e.target.value })}
          />

          <Input
            label="Initial Owner Password *"
            type="password"
            required
            value={createForm.adminPassword}
            onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value, password: e.target.value })}
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={submitting} loadingText="Registering...">
              Register School
            </Button>
          </div>
        </form>
      </Modal>

      {/* Suspend School Confirmation Dialog Modal */}
      <Modal
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        title={`Suspend School — ${selectedSchool?.name}`}
      >
        <form onSubmit={handleSuspendSubmit} className="space-y-4">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs leading-relaxed">
            <strong>Warning:</strong> Suspending this school will restrict school admin and staff logins.
            All tenant records, financial ledgers, and student data remain preserved.
          </div>

          <Input
            label="Reason for Suspension *"
            placeholder="e.g. Overdue subscription payment"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsSuspendModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={submitting} loadingText="Suspending...">
              Confirm Suspension
            </Button>
          </div>
        </form>
      </Modal>

      {/* Activate School Confirmation Dialog Modal */}
      <Modal
        isOpen={isActivateModalOpen}
        onClose={() => setIsActivateModalOpen(false)}
        title={`Activate Access — ${selectedSchool?.name}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Activating <strong>{selectedSchool?.name}</strong> will restore full login access for school administrators and staff.
          </p>

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setIsActivateModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={submitting}
              loadingText="Activating..."
              onClick={handleActivateSubmit}
            >
              Confirm Activate Access
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
