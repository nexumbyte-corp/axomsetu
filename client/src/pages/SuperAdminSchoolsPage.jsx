import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Plus, CheckCircle2, ShieldAlert, XCircle, Eye, ExternalLink, Power, MoreVertical, UserCheck, CreditCard, Trash2 } from 'lucide-react';
import { adminService } from '../services/adminService.js';
import { subscriptionService } from '../services/subscriptionService.js';
import { storage } from '../utils/storage.js';
import { formatDate } from '../utils/formatters.js';
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
import { HardDeleteSchoolModal } from '../components/admin/HardDeleteSchoolModal.jsx';

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
  const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [createErrors, setCreateErrors] = useState({});

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

  const validateCreateSchool = () => {
    const errors = {};
    const phoneRegex = /^[0-9+\-\s()]{7,15}$/;

    if (!createForm.name.trim()) {
      errors.name = 'School name is required.';
    } else if (createForm.name.trim().length < 2) {
      errors.name = 'School name must be at least 2 characters.';
    } else if (createForm.name.trim().length > 100) {
      errors.name = 'School name must not exceed 100 characters.';
    }

    if (createForm.phone?.trim()) {
      if (!phoneRegex.test(createForm.phone.trim())) {
        errors.phone = 'Phone number must be 7 to 15 digits (optional +, -, spaces or parentheses).';
      }
    }

    if (!createForm.email.trim()) {
      errors.email = 'Primary contact email is required.';
    } else if (!/\S+@\S+\.\S+/.test(createForm.email)) {
      errors.email = 'Enter a valid email address.';
    } else if (createForm.email.trim().length > 100) {
      errors.email = 'Email must not exceed 100 characters.';
    }

    if (createForm.address?.trim()) {
      if (createForm.address.trim().length < 3) {
        errors.address = 'Address must be at least 3 characters.';
      } else if (createForm.address.trim().length > 300) {
        errors.address = 'Address must not exceed 300 characters.';
      }
    }

    const owner = (createForm.adminName || createForm.ownerName || '').trim();
    if (!owner) {
      errors.adminName = 'School owner name is required.';
    } else if (owner.length < 2) {
      errors.adminName = 'School owner name must be at least 2 characters.';
    } else if (owner.length > 100) {
      errors.adminName = 'School owner name must not exceed 100 characters.';
    }

    const pass = createForm.adminPassword || createForm.password || '';
    if (!pass) {
      errors.adminPassword = 'Initial owner password is required.';
    } else if (pass.length < 8) {
      errors.adminPassword = 'Password must be at least 8 characters long.';
    } else if (pass.length > 100) {
      errors.adminPassword = 'Password must not exceed 100 characters.';
    }

    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
    if (!validateCreateSchool()) return;

    setSubmitting(true);
    try {
      await adminService.createSchool({
        ...createForm,
        ownerName: createForm.adminName || createForm.ownerName,
        password: createForm.adminPassword || createForm.password,
        termsAccepted: true,
      });
      setToast({ type: 'success', message: `School ${createForm.name} registered successfully!` });
      setIsCreateModalOpen(false);
      setCreateForm({
        name: '',
        code: '',
        email: '',
        phone: '',
        address: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
      });
      setCreateErrors({});
      fetchSchools(1);
    } catch (err) {
      const rawErrors = err.errors || err.response?.data?.errors;
      if (rawErrors && Array.isArray(rawErrors)) {
        const mapped = {};
        rawErrors.forEach((eItem) => {
          const key = eItem.field || (eItem.path && eItem.path[0]);
          if (key === 'ownerName') mapped.adminName = eItem.message;
          else if (key === 'password') mapped.adminPassword = eItem.message;
          else if (key) mapped[key] = eItem.message;
        });
        setCreateErrors(mapped);
      }
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
        <>
          <Table minWidth="min-w-[900px]">
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
                            {formatDate(expiryDate)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-500">
                        {formatDate(sch.createdAt)}
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

                          <DropdownItem
                            icon={Trash2}
                            danger
                            onClick={() => {
                              setSelectedSchool(sch);
                              setIsHardDeleteModalOpen(true);
                            }}
                          >
                            Hard Delete School (Permanent)
                          </DropdownItem>
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
        </>
      )}

      {/* Create School Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateErrors({});
        }}
        title="Register School Tenant"
      >
        <form onSubmit={handleCreateSubmit} autoComplete="off" className="space-y-4">
          <Input
            label="School Name *"
            required
            minLength={2}
            maxLength={100}
            placeholder="School Name"
            value={createForm.name}
            onChange={(e) => {
              setCreateForm({ ...createForm, name: e.target.value });
              if (createErrors.name) setCreateErrors({ ...createErrors, name: null });
            }}
            error={createErrors.name}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Primary Contact Email *"
              type="email"
              required
              maxLength={100}
              placeholder="Email Address"
              value={createForm.email}
              onChange={(e) => {
                setCreateForm({ ...createForm, email: e.target.value });
                if (createErrors.email) setCreateErrors({ ...createErrors, email: null });
              }}
              error={createErrors.email}
            />
            <Input
              label="Phone Number"
              minLength={7}
              maxLength={15}
              placeholder="Phone Number"
              value={createForm.phone}
              onChange={(e) => {
                setCreateForm({ ...createForm, phone: e.target.value });
                if (createErrors.phone) setCreateErrors({ ...createErrors, phone: null });
              }}
              error={createErrors.phone}
            />
          </div>

          <Input
            label="School Address"
            minLength={3}
            maxLength={300}
            placeholder="School Address"
            value={createForm.address}
            onChange={(e) => {
              setCreateForm({ ...createForm, address: e.target.value });
              if (createErrors.address) setCreateErrors({ ...createErrors, address: null });
            }}
            error={createErrors.address}
          />

          <Input
            label="School Owner Name *"
            required
            minLength={2}
            maxLength={100}
            placeholder="Owner Full Name"
            value={createForm.adminName}
            onChange={(e) => {
              setCreateForm({ ...createForm, adminName: e.target.value, ownerName: e.target.value });
              if (createErrors.adminName) setCreateErrors({ ...createErrors, adminName: null });
            }}
            error={createErrors.adminName}
          />

          <Input
            label="Initial Owner Password *"
            type="password"
            required
            minLength={8}
            maxLength={100}
            placeholder="Password"
            value={createForm.adminPassword}
            onChange={(e) => {
              setCreateForm({ ...createForm, adminPassword: e.target.value, password: e.target.value });
              if (createErrors.adminPassword) setCreateErrors({ ...createErrors, adminPassword: null });
            }}
            error={createErrors.adminPassword}
          />

          <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(false);
                setCreateErrors({});
              }}
              disabled={submitting}
            >
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
        <form onSubmit={handleSuspendSubmit} autoComplete="off" className="space-y-4">
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

      {/* Permanent Hard Delete School Modal */}
      <HardDeleteSchoolModal
        isOpen={isHardDeleteModalOpen}
        onClose={() => setIsHardDeleteModalOpen(false)}
        school={selectedSchool}
        onSuccess={(msg) => {
          setToast({ type: 'success', message: msg });
          fetchSchools(1);
        }}
      />
    </div>
  );
};
