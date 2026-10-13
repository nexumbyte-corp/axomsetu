import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  UserCheck,
  UserX,
  Lock,
  Phone,
  MapPin,
  User,
  ShieldAlert,
  AlertCircle,
  FileText,
  RefreshCw,
  Building2,
  Trash2,
  ArrowRightLeft,
  GraduationCap,
  CreditCard,
  History,
  ZoomIn,
  CheckCircle2,
  DollarSign,
  Edit2,
  Copy,
  Check,
  Home,
  MessageSquare,
} from 'lucide-react';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';
import { UpdateHostelAdmissionDateModal } from '../../components/hostel/UpdateHostelAdmissionDateModal.jsx';
import { StudentStatusModal } from '../../components/students/StudentStatusModal.jsx';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { usePermission } from '../../hooks/usePermission.js';
import { useAuth } from '../../hooks/useAuth.js';
import { studentService } from '../../services/student.service.js';
import { academicService } from '../../services/academic.service.js';
import { paymentService } from '../../services/payment.service.js';
import { schoolService } from '../../services/school.service.js';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Card, CardHeader, CardContent } from '../../components/ui/Card.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Dropdown, DropdownItem, DropdownDivider } from '../../components/ui/Dropdown.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { formatDate } from '../../utils/formatters.js';

import { StudentAvatar } from '../../components/students/StudentAvatar.jsx';
import { StudentStatusBadge } from '../../components/students/StudentStatusBadge.jsx';
import { IndividualPromotionModal } from '../../components/students/IndividualPromotionModal.jsx';
import { StudentTransferModal } from '../../components/students/StudentTransferModal.jsx';
import { StudentFeeOverridesTab } from '../../components/students/StudentFeeOverridesTab.jsx';
import { DuesAdviceCard } from '../../components/fees/DuesAdviceCard.jsx';
import { PhotoPreviewModal } from '../../components/students/PhotoPreviewModal.jsx';

export const StudentDetailsPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { selectedYear, selectedYearId, academicYears = [] } = useAcademicYear();
  const { can } = usePermission();
  const { user } = useAuth();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Active Tab State: 'overview' | 'fees' | 'overrides' | 'history'
  const [activeTab, setActiveTab] = useState('overview');

  // School Profile State for Print Header
  const [schoolInfo, setSchoolInfo] = useState(null);

  const schoolHeader =
    schoolInfo ||
    user?.schoolAdmins?.[0]?.school ||
    user?.school ||
    user?.staffProfile?.school ||
    user?.studentProfile?.school ||
    {};

  // Setup options for modals
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [mediums, setMediums] = useState([]);
  const [streams, setStreams] = useState([]);

  // Pending Fees State
  const [pendingFees, setPendingFees] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  // Transfer History State
  const [transferHistories, setTransferHistories] = useState([]);

  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'PROMOTE' | 'TRANSFER' | 'STATUS_CONFIRM' | 'DELETE_HARD'
  const [targetStatus, setTargetStatus] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [hostelDateModalOpen, setHostelDateModalOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // Copied chip state
  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key, label) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text).trim());
    setCopiedKey(key);
    toast.success(`${label} copied!`);
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  // 1. Load Academic Setup Options & School Profile
  useEffect(() => {
    const fetchSetupOptions = async () => {
      try {
        const [clsRes, secRes, medRes, strRes, profileRes] = await Promise.allSettled([
          academicService.getClasses(),
          academicService.getSections(),
          academicService.getMediums(),
          academicService.getStreams(),
          schoolService.getTenantProfile(),
        ]);
        if (clsRes.status === 'fulfilled' && clsRes.value?.success) setClasses(clsRes.value.data || []);
        if (secRes.status === 'fulfilled' && secRes.value?.success) setSections(secRes.value.data || []);
        if (medRes.status === 'fulfilled' && medRes.value?.success) setMediums(medRes.value.data || []);
        if (strRes.status === 'fulfilled' && strRes.value?.success) setStreams(strRes.value.data || []);
        if (profileRes.status === 'fulfilled' && profileRes.value?.success) setSchoolInfo(profileRes.value.data);
      } catch (err) {
        console.error('Failed loading setup options', err);
      }
    };
    fetchSetupOptions();
  }, []);

  // 2. Fetch Student Details by ID
  const fetchStudentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await studentService.getStudent(studentId, selectedYearId);
      if (res.success && res.data) {
        setStudent(res.data);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        setError(err.message || 'Failed loading student profile');
      }
    } finally {
      setLoading(false);
    }
  }, [studentId, selectedYearId]);

  // 3. Fetch Pending Fees in ASC Chronological Order
  const fetchPendingFees = useCallback(async () => {
    if (!studentId) return;
    setPendingLoading(true);
    try {
      const res = await paymentService.getStudentLedger(studentId, { academicYearId: selectedYearId });
      const rawData = res.data || res;
      if (rawData && Array.isArray(rawData.charges)) {
        const MONTH_ORDER = {
          APRIL: 1, MAY: 2, JUNE: 3, JULY: 4, AUGUST: 5, SEPTEMBER: 6,
          OCTOBER: 7, NOVEMBER: 8, DECEMBER: 9, JANUARY: 10, FEBRUARY: 11, MARCH: 12,
        };

        const unpaid = rawData.charges
          .filter((c) => (c.status === 'UNPAID' || c.status === 'PARTIAL') && Number(c.balance || 0) > 0)
          .sort((a, b) => {
            const orderA = MONTH_ORDER[a.month] || 99;
            const orderB = MONTH_ORDER[b.month] || 99;
            if (orderA !== orderB) return orderA - orderB;
            return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
          });

        setPendingFees(unpaid);
      }
    } catch (err) {
      console.error('Failed fetching pending fees:', err);
    } finally {
      setPendingLoading(false);
    }
  }, [studentId, selectedYearId]);

  const fetchTransferHistories = useCallback(async () => {
    if (!studentId) return;
    try {
      const res = await studentService.getTransferHistory(studentId);
      if (res.success && Array.isArray(res.data)) {
        setTransferHistories(res.data);
      }
    } catch (err) {
      console.error('Failed fetching transfer history:', err);
    }
  }, [studentId]);

  useEffect(() => {
    fetchStudentData();
    fetchPendingFees();
    fetchTransferHistories();
  }, [fetchStudentData, fetchPendingFees, fetchTransferHistories]);

  if (loading) {
    return (
      <div className="space-y-6 w-full max-w-7xl mx-auto py-2">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex items-center gap-6">
          <Skeleton height="96px" width="80px" className="rounded-xl shrink-0" />
          <div className="space-y-3 flex-1">
            <Skeleton height="28px" width="240px" className="rounded-lg" />
            <Skeleton height="20px" width="380px" className="rounded-md" />
            <Skeleton height="18px" width="180px" className="rounded-md" />
          </div>
        </div>
        <Skeleton height="44px" width="100%" className="rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton height="320px" className="rounded-2xl" />
          <Skeleton height="320px" className="rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center max-w-xl mx-auto space-y-4 my-12">
        <Alert variant="danger" icon={ShieldAlert} title="Unable to load student profile">
          {error}
        </Alert>
        <Button variant="outline" size="sm" onClick={fetchStudentData} icon={RefreshCw}>
          Retry Loading Profile
        </Button>
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 text-center max-w-xl mx-auto space-y-4 my-12">
        <EmptyState
          icon={User}
          title="Student Record Not Found"
          description="The requested student profile does not exist or has been removed from this school workspace."
          actionText="Back to Students List"
          onAction={() => navigate('/app/students')}
        />
      </div>
    );
  }

  const isLocked = Boolean(selectedYear?.isLocked);

  // Derive Current Academic Enrollment
  const currentAcademic = student.academic || student.enrollments?.find(
    (e) => e.academicYear?.id === selectedYearId || e.academicYearId === selectedYearId
  );

  const handleConfirmStatusChange = async (payload) => {
    if (!targetStatus) return;
    setStatusUpdating(true);
    try {
      const res = await studentService.updateStudentStatus(
        student.id,
        payload || { status: targetStatus }
      );
      if (res?.data?.hostelExit?.isHosteler) {
        toast.success(`Student status updated to ${targetStatus} and hostel exit processed successfully`);
      } else {
        toast.success(`Student status updated to ${targetStatus}`);
      }
      fetchStudentData();
    } catch (err) {
      toast.error(err.message || 'Failed updating status');
    } finally {
      setStatusUpdating(false);
      setActiveModal(null);
      setTargetStatus(null);
    }
  };

  const handleDeleteStudentHard = async () => {
    try {
      setStatusUpdating(true);
      const res = await studentService.deleteStudentHard(studentId);
      toast.success(res.message || `Student '${student.name}' deleted successfully.`);
      setActiveModal(null);
      navigate('/app/students');
    } catch (err) {
      toast.error(err.message || 'Failed to delete student.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const pendingDues = parseFloat(student.feeSummary?.pending || 0);
  const totalBilled = parseFloat(student.feeSummary?.generated || 0);
  const totalPaid = parseFloat(student.feeSummary?.paid || 0);
  const collectionPercentage = totalBilled > 0 ? Math.min(100, Math.round((totalPaid / totalBilled) * 100)) : 100;

  const getCleanPhone = (p) => {
    if (!p) return null;
    return String(p).replace(/[^0-9]/g, '');
  };

  const cleanPhone = getCleanPhone(student.phone);
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone}`
    : null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'fees', label: 'Fees & Dues', icon: CreditCard, badge: pendingFees.length > 0 ? pendingFees.length : null },
    { id: 'overrides', label: 'Fee Overrides', icon: DollarSign },
    { id: 'history', label: 'Progression & History', icon: History, badge: transferHistories.length > 0 ? transferHistories.length : null },
  ];

  return (
    <>
      <div className="space-y-6 print:hidden w-full max-w-7xl mx-auto">
        {/* Module Header Bar - Clean and Uncluttered */}
        <ModulePageHeader
          icon={User}
          title="Student Profile"
          description={`${student.name} • ${student.admissionNo}`}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/students')}
                icon={ArrowLeft}
              >
                Students
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/app/students/${student.id}/edit`)}
                icon={Edit2}
              >
                Edit
              </Button>

              {!isLocked && currentAcademic && student.status !== 'GRADUATED' && student.status !== 'LEFT' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveModal('PROMOTE')}
                  icon={Sparkles}
                >
                  Promote
                </Button>
              )}

              <Dropdown
                align="right"
                trigger={
                  <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 whitespace-nowrap cursor-pointer transition-colors shadow-2xs">
                    Actions ▾
                  </button>
                }
              >
                {!isLocked && currentAcademic && (
                  <>
                    <DropdownItem
                      icon={ArrowRightLeft}
                      onClick={() => setActiveModal('TRANSFER')}
                    >
                      Mid-Session Transfer
                    </DropdownItem>
                    <DropdownItem
                      icon={Building2}
                      onClick={() => {
                        navigate('/app/hostel/admission', { state: { student } });
                      }}
                    >
                      Admit to Hostel
                    </DropdownItem>
                    <DropdownDivider />
                  </>
                )}

                {student.status === 'ACTIVE' && (
                  <DropdownItem
                    icon={UserX}
                    danger
                    onClick={() => {
                      setTargetStatus('LEFT');
                      setActiveModal('STATUS_CONFIRM');
                    }}
                  >
                    Mark as LEFT
                  </DropdownItem>
                )}
                {student.status === 'ACTIVE' && (
                  <DropdownItem
                    icon={UserCheck}
                    onClick={() => {
                      setTargetStatus('GRADUATED');
                      setActiveModal('STATUS_CONFIRM');
                    }}
                  >
                    Mark as GRADUATED
                  </DropdownItem>
                )}
                {student.status !== 'ACTIVE' && (
                  <DropdownItem
                    icon={UserCheck}
                    onClick={() => {
                      setTargetStatus('ACTIVE');
                      setActiveModal('STATUS_CONFIRM');
                    }}
                  >
                    Reactivate Student
                  </DropdownItem>
                )}
                {can('STUDENTS_DELETE') && (
                  <>
                    <DropdownDivider />
                    <DropdownItem
                      icon={Trash2}
                      danger
                      onClick={() => setActiveModal('DELETE_HARD')}
                    >
                      Hard Delete Student
                    </DropdownItem>
                  </>
                )}
              </Dropdown>
            </div>
          }
        />

        {isLocked && (
          <Alert variant="neutral" icon={Lock} title="Locked Historical Academic Year">
            {selectedYear?.name} is locked for administrative edits. Profile details remain viewable, but modifications are restricted.
          </Alert>
        )}

        {/* Minimalist Hero Student Profile Header */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Avatar, Name & Metadata Chips */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-5 min-w-0">
              {/* Photo Box */}
              <div
                className={`relative w-20 h-26 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs overflow-hidden flex items-center justify-center shrink-0 group ${
                  student.photoUrl ? 'cursor-pointer hover:border-indigo-400 transition-colors' : ''
                }`}
                onClick={() => {
                  if (student.photoUrl) setPreviewPhoto(student.photoUrl);
                }}
                title={student.photoUrl ? 'Click to inspect photo' : ''}
              >
                {student.photoUrl ? (
                  <>
                    <img
                      src={student.photoUrl}
                      alt={student.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <ZoomIn className="w-5 h-5 text-white" />
                    </div>
                  </>
                ) : (
                  <StudentAvatar
                    name={student.name}
                    size="passport"
                    className="w-full h-full border-none rounded-none text-xl"
                  />
                )}
              </div>

              {/* Identity & Status */}
              <div className="space-y-2 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
                    {student.name}
                  </h1>
                  <StudentStatusBadge status={student.status} size="sm" />
                  {student.hostel?.enrolled ? (
                    <Badge variant="purple" size="sm" className="font-medium">
                      <Building2 className="w-3 h-3 mr-1 inline" />
                      Hostel Resident
                    </Badge>
                  ) : student.hostel?.status === 'EXITED' ? (
                    <Badge variant="warning" size="sm" className="font-medium">
                      <Building2 className="w-3 h-3 mr-1 inline" />
                      Exited Hosteller
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm" className="font-normal text-slate-600">
                      Day Scholar
                    </Badge>
                  )}
                </div>

                {/* Minimalist Details Bar */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-slate-600">
                  {/* Admission Number Chip with 1-click copy */}
                  <button
                    type="button"
                    onClick={() => handleCopy(student.admissionNo, 'adm', 'Admission number')}
                    className="inline-flex items-center gap-1 font-mono bg-slate-100 hover:bg-slate-200/80 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200/70 transition-colors cursor-pointer"
                    title="Click to copy admission number"
                  >
                    <span>Adm: {student.admissionNo}</span>
                    {copiedKey === 'adm' ? (
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400 group-hover:text-slate-600 shrink-0" />
                    )}
                  </button>

                  {/* Class & Section */}
                  {currentAcademic && (
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border border-slate-200/70">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      Class {currentAcademic.class?.name || '—'}
                      {currentAcademic.section ? ` (${currentAcademic.section.name})` : ''}
                    </span>
                  )}

                  {/* Roll Number */}
                  {currentAcademic?.rollNumber !== null && currentAcademic?.rollNumber !== undefined && (
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[11px] font-mono font-medium border border-slate-200/70">
                      Roll #{currentAcademic.rollNumber}
                    </span>
                  )}

                  {/* Gender */}
                  {student.gender && (
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[11px] font-medium capitalize border border-slate-200/70">
                      {student.gender.toLowerCase()}
                    </span>
                  )}

                  {/* Caste / Category */}
                  {student.caste && (
                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200/70">
                      {student.caste}
                    </span>
                  )}
                </div>

                {/* Guardian & Quick Contact Row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                  {student.guardianName && (
                    <span className="flex items-center gap-1.5 font-medium text-slate-700">
                      <span className="text-slate-400 font-normal">Guardian:</span>
                      {student.guardianName}
                    </span>
                  )}

                  {student.phone && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${student.phone}`}
                        className="inline-flex items-center gap-1 font-mono text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                      >
                        <Phone className="w-3 h-3 text-indigo-500" />
                        {student.phone}
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy(student.phone, 'phone', 'Phone number')}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                        title="Copy phone number"
                      >
                        {copiedKey === 'phone' ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                      {whatsappUrl && (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Minimalist Financial Health Snapshot */}
            <div className="flex items-center gap-3 shrink-0">
              <div
                className={`p-4 rounded-xl border min-w-[210px] space-y-1 ${
                  pendingDues > 0
                    ? 'bg-rose-50/50 border-rose-200/80 text-rose-900'
                    : 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className={pendingDues > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                    {pendingDues > 0 ? 'Outstanding Dues' : 'Fee Status'}
                  </span>
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80">
                    {pendingDues > 0 ? 'Pending' : 'Cleared'}
                  </span>
                </div>
                <div className={`text-xl font-bold font-mono ${pendingDues > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {formatCurrency(pendingDues)}
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs">
                  {pendingDues > 0 && can('FEES_COLLECT') ? (
                    <Button
                      variant="primary"
                      size="xs"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      onClick={() => navigate('/app/fees/collect', { state: { student } })}
                      icon={CreditCard}
                    >
                      Collect Fee
                    </Button>
                  ) : null}
                  <Button
                    variant="outline"
                    size="xs"
                    className="bg-white"
                    onClick={() => navigate(`/app/students/${student.id}/ledger`)}
                    icon={FileText}
                  >
                    Ledger
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Minimalist Tab Switcher Bar */}
        <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 font-bold bg-indigo-50/40 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full ${
                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ─── TAB 1: OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Row: Academic Placement & Guardian Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Card 1: Academic Enrollment */}
              <Card className="shadow-xs border-slate-200/80">
                <CardHeader
                  title="Academic Placement"
                  subtitle={`Session: ${selectedYear?.name || 'Selected Academic Year'}`}
                />
                <CardContent className="pt-2">
                  {currentAcademic ? (
                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-xs">
                      <div>
                        <span className="text-slate-400 text-[11px] font-medium block">Class & Section</span>
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                          Class {currentAcademic.class?.name || '—'} {currentAcademic.section ? `(${currentAcademic.section.name})` : ''}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] font-medium block">Medium & Stream</span>
                        <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                          {currentAcademic.medium?.name || '—'} {currentAcademic.stream ? `(${currentAcademic.stream.name})` : ''}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] font-medium block">Roll Number</span>
                        <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">
                          {currentAcademic.rollNumber ?? 'Not Assigned'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] font-medium block">Admission Date</span>
                        <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                          {formatDate(student.admissionDate || student.createdAt)}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] font-medium block">Category / Caste</span>
                        <span className="font-medium text-slate-800 text-xs mt-0.5 block">
                          {student.caste || 'General / UR'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] font-medium block">Enrollment Status</span>
                        <div className="mt-0.5">
                          <Badge variant={currentAcademic.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                            {currentAcademic.status || 'ACTIVE'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 italic py-3 text-xs">No active enrollment record for selected year.</p>
                  )}
                </CardContent>
              </Card>

              {/* Card 2: Guardian & Residential Contact */}
              <Card className="shadow-xs border-slate-200/80">
                <CardHeader
                  title="Guardian & Residential Details"
                  subtitle="Primary family contact and home address"
                />
                <CardContent className="pt-2">
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 text-[11px] font-medium block">Father / Guardian Name</span>
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                          {student.guardianName || '—'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 text-[11px] font-medium block">Phone Contact</span>
                        {student.phone ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <a
                              href={`tel:${student.phone}`}
                              className="font-mono font-medium text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-indigo-500" />
                              {student.phone}
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopy(student.phone, 'phone-card', 'Phone number')}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
                              title="Copy phone"
                            >
                              {copiedKey === 'phone-card' ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic mt-0.5 block">Not recorded</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 text-[11px] font-medium block">Residential Address</span>
                      <div className="flex items-start justify-between gap-2 mt-1">
                        <span className="text-slate-700 leading-relaxed flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          {student.address || 'No residential address recorded.'}
                        </span>
                        {student.address && (
                          <button
                            type="button"
                            onClick={() => handleCopy(student.address, 'addr', 'Address')}
                            className="p-1 text-slate-400 hover:text-slate-600 rounded shrink-0 cursor-pointer"
                            title="Copy address"
                          >
                            {copiedKey === 'addr' ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Row: Residential Status & Financial Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Card 3: Residential Status */}
              <Card className="shadow-xs border-slate-200/80">
                <CardHeader
                  title="Campus Accommodation"
                  subtitle="Hostel enrollment or day scholar status"
                  action={
                    !student.hostel?.enrolled ? (
                      <Button
                        variant="outline"
                        size="xs"
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold"
                        onClick={() => navigate('/app/hostel/admission', { state: { student } })}
                      >
                        + Admit to Hostel
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="xs"
                        className="text-purple-700 border-purple-200 hover:bg-purple-50 font-semibold"
                        onClick={() => navigate('/app/hostel/residents', { state: { hostelId: student.hostel.hostelId } })}
                      >
                        Hostel Page
                      </Button>
                    )
                  }
                />
                <CardContent className="pt-2">
                  {student.hostel?.enrolled ? (
                    <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-purple-200/70">
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-purple-600" />
                          {student.hostel.hostelName}
                        </span>
                        <Badge variant="purple" size="sm">{student.hostel.hostelType || 'Hostel'}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                          <span className="text-slate-400 font-medium text-[10px] block">Room Number</span>
                          <span className="font-semibold text-slate-800 text-xs mt-0.5 block">Room {student.hostel.roomNumber}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                          <span className="text-slate-400 font-medium text-[10px] block">Bed Allocation</span>
                          <span className="font-bold text-purple-700 text-xs mt-0.5 block">{student.hostel.bedNumber}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-slate-400 font-medium text-[10px] block">Hostel Admission Date</span>
                          <span className="font-semibold text-slate-700">{formatDate(student.hostel.startDate)}</span>
                        </div>
                        {can('HOSTEL_ADMIT') && student.hostel?.id && (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-purple-700 hover:bg-purple-100 font-medium"
                            onClick={() => setHostelDateModalOpen(true)}
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit Date
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : student.hostel?.status === 'EXITED' ? (
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{student.hostel.hostelName}</span>
                        <Badge variant="warning" size="sm">HOSTEL EXITED</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-600 text-xs pt-1">
                        <div>
                          <span className="text-slate-400 text-[10px] block font-medium">Previous Room & Bed</span>
                          <span>Room {student.hostel.roomNumber} ({student.hostel.bedNumber})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-medium">Exit Date</span>
                          <span className="font-mono text-rose-700 font-semibold">{formatDate(student.hostel.endDate)}</span>
                        </div>
                      </div>
                      {student.hostel.exitReason && (
                        <p className="text-[11px] text-slate-600 italic pt-1">"{student.hostel.exitReason}"</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                      <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-500 shadow-2xs">
                        <Home className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-900 text-xs">Day Scholar</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Student commutes to school daily and is not enrolled in campus hostel.
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Card 4: Fee Collection Snapshot */}
              <Card className="shadow-xs border-slate-200/80">
                <CardHeader
                  title="Fee Collection Overview"
                  subtitle="Collection status for the academic year"
                  action={
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setActiveTab('fees')}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      View Details →
                    </Button>
                  }
                />
                <CardContent className="space-y-4 pt-2">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                      <span className="text-slate-400 font-medium text-[10px] block mb-0.5">Total Billed</span>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {formatCurrency(totalBilled)}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                      <span className="text-emerald-700 font-medium text-[10px] block mb-0.5">Total Paid</span>
                      <span className="font-mono font-bold text-emerald-700 text-xs">
                        {formatCurrency(totalPaid)}
                      </span>
                    </div>

                    <div className={`p-3 rounded-xl border ${
                      pendingDues > 0
                        ? 'bg-rose-50/60 border-rose-200/80 text-rose-800'
                        : 'bg-slate-50 border-slate-200/70 text-slate-800'
                    }`}>
                      <span className={`${pendingDues > 0 ? 'text-rose-600' : 'text-slate-400'} font-medium text-[10px] block mb-0.5`}>
                        Outstanding
                      </span>
                      <span className="font-mono font-bold text-xs">
                        {formatCurrency(pendingDues)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                      <span>Collection Progress</span>
                      <span className="font-mono font-bold text-slate-700">{collectionPercentage}% Paid</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${collectionPercentage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ─── TAB 2: FINANCIAL DUES & FEE STRUCTURE ─── */}
        {activeTab === 'fees' && (
          <div className="space-y-6">
            {/* Top Metric Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider block">Master Billed</span>
                <span className="text-lg font-bold font-mono text-slate-900 block">
                  {formatCurrency(totalBilled)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider block">Discounts</span>
                <span className="text-lg font-bold font-mono text-emerald-600 block">
                  {student.feeSummary?.discount > 0 ? `- ${formatCurrency(student.feeSummary.discount)}` : '₹0.00'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                <span className="text-slate-400 font-medium text-[10px] uppercase tracking-wider block">Total Paid</span>
                <span className="text-lg font-bold font-mono text-emerald-700 block">
                  {formatCurrency(totalPaid)}
                </span>
              </div>

              <div className={`p-4 rounded-xl border shadow-2xs space-y-1 ${
                pendingDues > 0 ? 'bg-rose-50/50 border-rose-200 text-rose-900' : 'bg-white border-slate-200/80'
              }`}>
                <span className={`${pendingDues > 0 ? 'text-rose-600' : 'text-slate-400'} font-medium text-[10px] uppercase tracking-wider block`}>
                  Pending Dues
                </span>
                <span className={`text-lg font-bold font-mono ${pendingDues > 0 ? 'text-rose-700' : 'text-slate-900'} block`}>
                  {formatCurrency(pendingDues)}
                </span>
              </div>
            </div>

            {/* Pending Fees Table Card */}
            <Card className="shadow-xs border-slate-200/80">
              <CardHeader
                title="Pending Dues Charges List"
                subtitle={`Unpaid and partial charges in chronological order (${selectedYear?.name || 'Selected Year'})`}
                action={
                  <div className="flex items-center gap-2">
                    {pendingFees.length > 0 && can('FEES_COLLECT') && (
                      <Button
                        variant="primary"
                        size="xs"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        onClick={() => navigate('/app/fees/collect', { state: { student } })}
                        icon={CreditCard}
                      >
                        Collect Fees
                      </Button>
                    )}
                    {pendingFees.length > 0 && (
                      <DocumentActions
                        templateId="duesAdvice"
                        data={{
                          student,
                          currentAcademic,
                          pendingFees,
                          schoolHeader,
                          academicYear: selectedYear,
                        }}
                        filename={`Dues_Slip_${student.admissionNo || 'Student'}.pdf`}
                        title={`Pending Dues Statement - ${student.name}`}
                      />
                    )}
                  </div>
                }
              />
              <CardContent className="pt-2">
                {pendingLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton height="35px" width="100%" />
                    <Skeleton height="35px" width="100%" />
                  </div>
                ) : pendingFees.length === 0 ? (
                  <div className="p-8 bg-emerald-50/60 rounded-xl border border-emerald-200/80 text-center text-xs text-emerald-800 space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                    <p className="text-sm font-bold text-emerald-900">All fee charges are fully settled</p>
                    <p className="text-slate-600 font-normal">There are zero pending dues for this student in the selected academic year.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3.5">#</th>
                          <th className="py-2.5 px-3.5">Fee Head</th>
                          <th className="py-2.5 px-3.5">Billing Month</th>
                          <th className="py-2.5 px-3.5 text-right">Billed Amount</th>
                          <th className="py-2.5 px-3.5 text-right">Paid Amount</th>
                          <th className="py-2.5 px-3.5 text-right">Pending Balance</th>
                          <th className="py-2.5 px-3.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pendingFees.map((fee, idx) => (
                          <tr key={fee.id || idx} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-3.5 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-3.5 font-bold text-slate-900">{fee.title}</td>
                            <td className="py-3 px-3.5 font-semibold text-slate-700 font-mono">
                              {fee.month} {fee.year ? `(${fee.year})` : ''}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono text-slate-700">₹{fee.amount}</td>
                            <td className="py-3 px-3.5 text-right font-mono text-emerald-600 font-semibold">₹{fee.paidAmount || 0}</td>
                            <td className="py-3 px-3.5 text-right font-bold font-mono text-rose-700 text-sm">₹{fee.balance}</td>
                            <td className="py-3 px-3.5 text-center">
                              <Badge variant={fee.status === 'PARTIAL' ? 'warning' : 'danger'} size="sm">
                                {fee.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                        <tr>
                          <td colSpan="5" className="py-3 px-3.5 text-right text-slate-700 uppercase font-bold text-[10px]">
                            Total Outstanding Dues:
                          </td>
                          <td className="py-3 px-3.5 text-right font-bold font-mono text-rose-700 text-sm">
                            ₹{pendingFees.reduce((sum, f) => sum + Number(f.balance || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Master Fee Structure Card */}
            <Card className="shadow-xs border-slate-200/80">
              <CardHeader
                title="Master Fee Structure"
                subtitle={`Applicable academic fee structure for Class ${currentAcademic?.class?.name || '—'} (${selectedYear?.name || 'Selected Year'})`}
              />
              <CardContent className="pt-2">
                {student.currentFeeStructure?.isConfigured ? (
                  <div>
                    {student.currentFeeStructure.academicFees?.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-semibold uppercase text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3.5">Fee Head</th>
                              <th className="py-2.5 px-3.5">Billing Cycle</th>
                              <th className="py-2.5 px-3.5 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {student.currentFeeStructure.academicFees.map((head, idx) => {
                              const hasDiscount = head.discountAmount > 0 || (head.originalAmount && head.originalAmount > head.amount);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="py-3 px-3.5 font-semibold text-slate-800">
                                    {head.title}
                                    {head.isOverridden && (
                                      <span className="ml-2 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono font-normal">
                                        Custom Override
                                      </span>
                                    )}
                                    {hasDiscount && (
                                      <span className="ml-1.5 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded font-mono font-normal">
                                        Concession: {formatCurrency(head.discountAmount || (head.originalAmount - head.amount))}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-3.5 text-slate-600 font-medium">
                                    {head.billingRule === 'ONE_TIME_PER_ACADEMIC_YEAR'
                                      ? 'Once / Academic Year'
                                      : 'Monthly'}
                                  </td>
                                  <td className="py-3 px-3.5 text-right font-bold text-slate-900 font-mono text-sm">
                                    {hasDiscount && head.originalAmount && (
                                      <span className="text-[11px] text-slate-400 line-through font-mono mr-2 font-normal">
                                        {formatCurrency(head.originalAmount)}
                                      </span>
                                    )}
                                    {formatCurrency(head.amount)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-center">
                        No academic fee heads configured for this class.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200/70 space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs text-slate-600 font-medium">
                      No master fee structure configured for this class, medium, and stream placement.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/app/fees/structures')}
                    >
                      Configure Fee Structure
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ─── TAB 3: FEE OVERRIDES ─── */}
        {activeTab === 'overrides' && (
          <Card className="shadow-xs border-slate-200/80">
            <CardHeader
              title="Student Fee Overrides & Discounts"
              subtitle={`Individual student concessions for ${selectedYear?.name || 'Selected Year'}`}
            />
            <CardContent className="pt-2">
              <StudentFeeOverridesTab studentId={student.id} isLocked={isLocked} />
            </CardContent>
          </Card>
        )}

        {/* ─── TAB 4: PROGRESSION & HISTORY ─── */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Academic Progression Card */}
            <Card className="shadow-xs border-slate-200/80">
              <CardHeader
                title="Academic Progression Record"
                subtitle="Year-by-year historical enrollment tracking"
              />
              <CardContent className="space-y-3 pt-2">
                {student.enrollments && student.enrollments.length > 0 ? (
                  student.enrollments.map((enr) => {
                    const isSelected = enr.academicYear?.id === selectedYearId || enr.academicYearId === selectedYearId;
                    return (
                      <div
                        key={enr.id}
                        className={`p-4 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'border-indigo-300 bg-indigo-50/40 shadow-2xs'
                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 mb-1.5 text-sm">
                          <span className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-indigo-600" />
                            {enr.academicYear?.name}
                            {isSelected && (
                              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                                Selected Session
                              </span>
                            )}
                          </span>
                          <Badge variant={enr.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                            Class {enr.class?.name || '—'}
                          </Badge>
                        </div>
                        <div className="text-slate-600 text-xs flex flex-wrap justify-between gap-2 font-medium pt-1">
                          <span>
                            Medium: {enr.medium?.name || '—'} {enr.stream ? `• Stream: ${enr.stream.name}` : ''}
                          </span>
                          <span className="font-mono text-slate-700 font-semibold">
                            Roll Number: {enr.rollNumber ?? enr.rollNo ?? '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No historical enrollment records available.</p>
                )}
              </CardContent>
            </Card>

            {/* Mid-Session Transfer History */}
            {transferHistories && transferHistories.length > 0 && (
              <Card className="shadow-xs border-slate-200/80">
                <CardHeader
                  title="Mid-Session Stream & Medium Transfers"
                  subtitle="Historical internal stream/medium changes"
                />
                <CardContent className="space-y-3 pt-2 text-xs">
                  {transferHistories.map((h) => (
                    <div key={h.id} className="p-4 bg-indigo-50/40 border border-indigo-200/80 rounded-xl space-y-2">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span className="flex items-center gap-1.5 text-indigo-700 text-sm">
                          <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                          {h.fromMedium?.name} {h.fromStream ? `(${h.fromStream.name})` : ''} → {h.toMedium?.name} {h.toStream ? `(${h.toStream.name})` : ''}
                        </span>
                        <Badge variant="indigo" size="sm">{formatDate(h.transferDate)}</Badge>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1 pt-1">
                        <div>Academic Year: <strong>{h.academicYear?.name}</strong> | Class: <strong>{h.class?.name}</strong></div>
                        {h.additionalPayable > 0 && (
                          <div className="text-emerald-700 font-semibold">
                            Additional Fee Head Adjustment: ₹{h.additionalPayable.toFixed(2)}
                          </div>
                        )}
                        {h.reason && <div className="italic text-slate-500 font-medium">"{h.reason}"</div>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Action Modals */}
        {currentAcademic && activeModal === 'PROMOTE' && (
          <IndividualPromotionModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            student={student}
            sourceEnrollment={currentAcademic}
            academicYears={academicYears}
            classes={classes}
            mediums={mediums}
            sections={sections}
            streams={streams}
            onSuccess={fetchStudentData}
          />
        )}

        {currentAcademic && activeModal === 'TRANSFER' && (
          <StudentTransferModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            student={student}
            currentEnrollment={currentAcademic}
            mediums={mediums}
            streams={streams}
            onSuccess={() => {
              fetchStudentData();
              fetchPendingFees();
              fetchTransferHistories();
            }}
          />
        )}

        {/* Student Status Modal with Automated Hostel Exit detection */}
        <StudentStatusModal
          isOpen={activeModal === 'STATUS_CONFIRM'}
          onClose={() => {
            setActiveModal(null);
            setTargetStatus(null);
          }}
          onConfirm={handleConfirmStatusChange}
          student={{
            ...student,
            enrollment: currentAcademic,
          }}
          targetStatus={targetStatus}
          loading={statusUpdating}
        />

        {/* Hard Delete Confirmation Modal */}
        <ConfirmDialog
          isOpen={activeModal === 'DELETE_HARD'}
          onClose={() => setActiveModal(null)}
          onConfirm={handleDeleteStudentHard}
          title={`Hard Delete Student (${student.name})`}
          message={`Are you sure you want to permanently hard-delete '${student.name}' (Adm No: ${student.admissionNo})? All initial registration records will be completely removed from the database. (Hard deletion is allowed for initial registrations without paid fee receipts).`}
          confirmText="Hard Delete Permanently"
          cancelText="Cancel"
          variant="danger"
          loading={statusUpdating}
          loadingText="Deleting..."
        />
      </div>

      {/* Printable Pending Dues Advice / Slip */}
      <div className="hidden print:block fixed inset-0 bg-white p-6 z-[9999]">
        <DuesAdviceCard
          student={student}
          currentAcademic={currentAcademic}
          pendingFees={pendingFees}
          schoolHeader={schoolHeader}
          academicYear={selectedYear}
          copyLabel="Official Student Copy"
        />
      </div>

      {/* Photo Preview Modal */}
      <PhotoPreviewModal
        isOpen={Boolean(previewPhoto)}
        onClose={() => setPreviewPhoto(null)}
        photoUrl={previewPhoto}
        name={student?.name}
        admissionNo={student?.admissionNo}
      />

      {/* Update Hostel Admission Date Modal */}
      {student?.hostel?.id && (
        <UpdateHostelAdmissionDateModal
          isOpen={hostelDateModalOpen}
          onClose={() => setHostelDateModalOpen(false)}
          resident={{
            id: student.hostel.id,
            studentName: student.name,
            admissionNo: student.admissionNo,
            hostelName: student.hostel.hostelName,
            roomNumber: student.hostel.roomNumber,
            bedNumber: student.hostel.bedNumber,
            startDate: student.hostel.startDate,
            endDate: student.hostel.endDate,
            status: student.hostel.status,
          }}
          onSuccess={fetchStudentData}
        />
      )}
    </>
  );
};
