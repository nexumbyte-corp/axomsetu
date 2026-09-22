import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Search,
  Plus,
  CheckCircle2,
  ShieldAlert,
  XCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Power,
  MoreVertical,
  UserCheck,
  CreditCard,
  Trash2,
  Building2,
  Mail,
  Phone,
  MapPin,
  User,
  Lock,
  KeyRound,
} from 'lucide-react';
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
  const [planFilter, setPlanFilter] = useState('');
  const [trialFilter, setTrialFilter] = useState('');
  const [plansList, setPlansList] = useState([]);
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
    maxStudentLimit: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const trialPlan = plansList.find((p) => p.isTrial || p.code === 'TRIAL');
  const trialStudentLimit = trialPlan?.maxStudentLimit || 100;

  const generateRandomPassword = () => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const special = '@#$%!*';
    const all = uppercase + lowercase + numbers + special;

    let generated = '';
    generated += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    generated += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    generated += numbers.charAt(Math.floor(Math.random() * numbers.length));
    generated += special.charAt(Math.floor(Math.random() * special.length));

    for (let i = 4; i < 12; i++) {
      generated += all.charAt(Math.floor(Math.random() * all.length));
    }
    generated = generated
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('');

    setCreateForm((prev) => ({
      ...prev,
      adminPassword: generated,
      password: generated,
    }));
    setShowPassword(true);
    if (createErrors.adminPassword) {
      setCreateErrors((prev) => ({ ...prev, adminPassword: null }));
    }
  };

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

    if (!createForm.phone?.trim()) {
      errors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(createForm.phone.trim())) {
      errors.phone = 'Phone number must be exactly 10 digits.';
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
            list = list.filter((s) => s.subscription?.plan?.isTrial || s.subscription?.plan?.code === 'TRIAL' || s.subscription?.planNameSnapshot?.toLowerCase().includes('trial'));
          } else if (trialFilter === 'NON_TRIAL') {
            list = list.filter((s) => !s.subscription?.plan?.isTrial && s.subscription?.plan?.code !== 'TRIAL' && !s.subscription?.planNameSnapshot?.toLowerCase().includes('trial'));
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

  useEffect(() => {
    if (location.state?.openCreateModal) {
      setIsCreateModalOpen(true);
      window.history.replaceState({}, document.title);
    }

    const handleOpenModal = () => setIsCreateModalOpen(true);
    window.addEventListener('open-create-school-modal', handleOpenModal);
    return () => window.removeEventListener('open-create-school-modal', handleOpenModal);
  }, [location.state]);

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
      const payload = {
        name: createForm.name.trim(),
        schoolName: createForm.name.trim(),
        email: createForm.email.trim(),
        phone: createForm.phone.trim(),
        address: createForm.address?.trim() || '',
        ownerName: (createForm.adminName || createForm.ownerName || '').trim(),
        adminName: (createForm.adminName || createForm.ownerName || '').trim(),
        password: createForm.adminPassword || createForm.password,
        adminPassword: createForm.adminPassword || createForm.password,
        ...(createForm.maxStudentLimit && Number(createForm.maxStudentLimit) > 0
          ? { maxStudentLimit: parseInt(createForm.maxStudentLimit, 10) }
          : {}),
        termsAccepted: true,
      };
      await adminService.createSchool(payload);
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
        maxStudentLimit: '',
      });
      setCreateErrors({});
      fetchSchools(1);
    } catch (err) {
      const rawErrors = err.errors || err.response?.data?.errors;
      if (rawErrors && Array.isArray(rawErrors)) {
        const mapped = {};
        rawErrors.forEach((eItem) => {
          const key = eItem.field || (eItem.path && eItem.path[0]);
          if (key === 'ownerName' || key === 'adminName') mapped.adminName = eItem.message;
          else if (key === 'password' || key === 'adminPassword') mapped.adminPassword = eItem.message;
          else if (key === 'name' || key === 'schoolName') mapped.name = eItem.message;
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
    <div className="space-y-4">
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

      {/* Compact Quick Stats & Filter Controls Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-3">
        {/* Quick Filter Status Badges */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-100 text-xs font-semibold">
          <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider mr-1">Directory Overview:</span>
          <button
            onClick={() => { setStatusFilter(''); setTrialFilter(''); }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${!statusFilter && !trialFilter
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
          >
            All Schools ({pagination.total || schools.length})
          </button>
          <button
            onClick={() => { setStatusFilter('ACTIVE'); setTrialFilter(''); }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${statusFilter === 'ACTIVE'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
          >
            Active Status
          </button>
          <button
            onClick={() => { setStatusFilter(''); setTrialFilter('TRIAL'); }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${trialFilter === 'TRIAL'
                ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
          >
            Trial Mode
          </button>
          <button
            onClick={() => { setStatusFilter('SUSPENDED'); setTrialFilter(''); }}
            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-colors ${statusFilter === 'SUSPENDED'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
          >
            Suspended
          </button>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
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
                  const isTrialPlan = sub?.plan?.isTrial || sub?.plan?.code === 'TRIAL' || sub?.planNameSnapshot?.toLowerCase().includes('trial');
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
                        {sub && (
                          <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                            {sub?.maxStudentLimitSnapshot
                              ? `${sub.maxStudentLimitSnapshot} Students Limit`
                              : sub?.plan?.maxStudentLimit
                              ? `${sub.plan.maxStudentLimit} Students Limit`
                              : isTrialPlan
                              ? `${trialStudentLimit} Students Limit`
                              : 'Unlimited Students'}
                          </span>
                        )}
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
          setShowPassword(false);
        }}
        size="lg"
        title="Register School"
      >
        <form onSubmit={handleCreateSubmit} autoComplete="off" className="space-y-4">
          <Input
            label="School Name *"
            icon={Building2}
            required
            minLength={2}
            maxLength={100}
            placeholder="Enter School Name"
            value={createForm.name}
            onChange={(e) => {
              setCreateForm({ ...createForm, name: e.target.value });
              if (createErrors.name) setCreateErrors({ ...createErrors, name: null });
            }}
            error={createErrors.name}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address *"
              icon={Mail}
              type="email"
              required
              maxLength={100}
              placeholder="Enter Email Address"
              value={createForm.email}
              onChange={(e) => {
                setCreateForm({ ...createForm, email: e.target.value });
                if (createErrors.email) setCreateErrors({ ...createErrors, email: null });
              }}
              error={createErrors.email}
            />
            <Input
              label="Phone Number *"
              icon={Phone}
              required
              maxLength={10}
              placeholder="Enter Phone Number"
              value={createForm.phone}
              onChange={(e) => {
                setCreateForm({ ...createForm, phone: e.target.value });
                if (createErrors.phone) setCreateErrors({ ...createErrors, phone: null });
              }}
              error={createErrors.phone}
            />
          </div>

          <Input
            label="Address"
            icon={MapPin}
            minLength={3}
            maxLength={300}
            placeholder="Enter Address"
            value={createForm.address}
            onChange={(e) => {
              setCreateForm({ ...createForm, address: e.target.value });
              if (createErrors.address) setCreateErrors({ ...createErrors, address: null });
            }}
            error={createErrors.address}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Owner Name *"
              icon={User}
              required
              minLength={2}
              maxLength={100}
              placeholder="Enter Owner Name"
              value={createForm.adminName}
              onChange={(e) => {
                setCreateForm({ ...createForm, adminName: e.target.value, ownerName: e.target.value });
                if (createErrors.adminName) setCreateErrors({ ...createErrors, adminName: null });
              }}
              error={createErrors.adminName}
            />

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Password <span className="text-rose-500">*</span>
                </span>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3 h-3" />
                  Generate
                </button>
              </div>

              <Input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={100}
                icon={Lock}
                placeholder="Enter Password"
                value={createForm.adminPassword}
                onChange={(e) => {
                  setCreateForm({ ...createForm, adminPassword: e.target.value, password: e.target.value });
                  if (createErrors.adminPassword) setCreateErrors({ ...createErrors, adminPassword: null });
                }}
                error={createErrors.adminPassword}
                endElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>
          </div>

          {/* Automatic Free Trial & Student Limit Banner */}
          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-950">Free Trial Plan Automatically Applied</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300/60">
                  {trialPlan?.maxStudentLimit ? `${trialPlan.maxStudentLimit} Students Limit` : 'Dynamic Trial Limit'}
                </span>
              </div>
              <p className="text-amber-800/90 text-[11px] mt-0.5">
                New school will automatically receive a 30-Day Free Trial with an active student capacity of {trialStudentLimit} students as per the Trial plan. You can optionally override this limit below.
              </p>
            </div>
          </div>

          <Input
            label={`Custom Student Limit (Optional - defaults to Trial plan: ${trialStudentLimit})`}
            type="number"
            min={1}
            max={50000}
            placeholder={`Auto: ${trialStudentLimit} students`}
            value={createForm.maxStudentLimit}
            onChange={(e) => setCreateForm({ ...createForm, maxStudentLimit: e.target.value })}
            helperText="Leave empty to automatically apply the active Trial plan student limit."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(false);
                setCreateErrors({});
                setShowPassword(false);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
              loadingText="Registering..."
            >
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
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSuspendModalOpen(false)} disabled={submitting}>
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
            <Button type="button" variant="outline" size="sm" onClick={() => setIsActivateModalOpen(false)} disabled={submitting}>
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
