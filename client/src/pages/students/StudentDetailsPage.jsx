import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
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
  ChevronRight,
} from 'lucide-react';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { usePermission } from '../../hooks/usePermission.js';
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
import { EditEnrollmentModal } from '../../components/students/EditEnrollmentModal.jsx';
import { StudentTransferModal } from '../../components/students/StudentTransferModal.jsx';
import { StudentFeeOverridesTab } from '../../components/students/StudentFeeOverridesTab.jsx';
import { DuesAdviceCard } from '../../components/fees/DuesAdviceCard.jsx';
import { PhotoPreviewModal } from '../../components/students/PhotoPreviewModal.jsx';

export const StudentDetailsPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { selectedYear, selectedYearId, academicYears } = useAcademicYear();
  const { can } = usePermission();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Active Tab State: 'overview' | 'fees' | 'overrides' | 'history'
  const [activeTab, setActiveTab] = useState('overview');

  // School Profile State for Print Header
  const [schoolInfo, setSchoolInfo] = useState(null);

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
  const [activeModal, setActiveModal] = useState(null); // 'PROMOTE' | 'EDIT_ENROLLMENT' | 'TRANSFER' | 'STATUS_CONFIRM' | 'DELETE_HARD'
  const [selectedEnrollmentForEdit, setSelectedEnrollmentForEdit] = useState(null);
  const [targetStatus, setTargetStatus] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

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
      <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
        <Skeleton height="140px" width="100%" className="rounded-2xl" />
        <Skeleton height="50px" width="100%" className="rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton height="350px" className="lg:col-span-1 rounded-2xl" />
          <Skeleton height="350px" className="lg:col-span-2 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-xl mx-auto space-y-4 my-12">
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center max-w-xl mx-auto space-y-4 my-12">
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

  const handleConfirmStatusChange = async () => {
    if (!targetStatus) return;
    setStatusUpdating(true);
    try {
      await studentService.updateStudentStatus(student.id, targetStatus);
      toast.success(`Student status updated to ${targetStatus}`);
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

  const tabs = [
    { id: 'overview', label: 'Overview & Placement', icon: GraduationCap },
    { id: 'fees', label: 'Financial Dues & Fee Structure', icon: CreditCard, badge: pendingFees.length > 0 ? pendingFees.length : null },
    { id: 'overrides', label: 'Fee Overrides & Discounts', icon: DollarSign },
    { id: 'history', label: 'History & Progression', icon: History, badge: transferHistories.length > 0 ? transferHistories.length : null },
  ];

  return (
    <>
      <div className="space-y-6 print:hidden max-w-7xl mx-auto">
        {/* Module Header Bar */}
        <ModulePageHeader
          icon={User}
          title={`Student Profile: ${student.name}`}
          description={`Admission No: ${student.admissionNo} • ${selectedYear?.name || 'Academic Year'}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/students')}
                icon={ArrowLeft}
              >
                Back to List
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/app/students/${student.id}/edit`)}
                icon={Edit}
              >
                Edit Record
              </Button>

              {!isLocked && currentAcademic && student.status !== 'GRADUATED' && student.status !== 'LEFT' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveModal('PROMOTE')}
                  icon={Sparkles}
                >
                  Academic Transition
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
                      icon={Edit}
                      onClick={() => {
                        setSelectedEnrollmentForEdit(currentAcademic);
                        setActiveModal('EDIT_ENROLLMENT');
                      }}
                    >
                      Edit Enrollment ({selectedYear?.name})
                    </DropdownItem>
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

        {/* Clean Professional Enterprise Student Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Left: Passport Photo & Executive Details */}
            <div className="flex items-center gap-5">
              {/* Passport Photo Box */}
              <div
                className={`relative w-20 h-26 rounded-xl bg-slate-50 border-2 border-slate-200 shadow-2xs overflow-hidden flex items-center justify-center shrink-0 group ${
                  student.photoUrl ? 'cursor-pointer hover:border-indigo-500 transition-colors' : ''
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
                  <StudentAvatar name={student.name} size="passport" className="w-full h-full border-none rounded-none text-xl" />
                )}
              </div>

              {/* Student Details Header Info */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold text-slate-900">{student.name}</h1>
                  <StudentStatusBadge status={student.status} size="sm" />
                  {student.hostel?.enrolled ? (
                    <Badge variant="purple" size="sm" className="font-semibold">
                      <Building2 className="w-3 h-3 mr-1 inline" />
                      Hostel Resident
                    </Badge>
                  ) : student.hostel?.status === 'EXITED' ? (
                    <Badge variant="warning" size="sm" className="font-semibold">
                      <Building2 className="w-3 h-3 mr-1 inline" />
                      Exited Hosteller
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      Day Scholar
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-semibold border border-slate-200">
                    Adm No: {student.admissionNo}
                  </span>

                  {currentAcademic && (
                    <span className="bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md font-semibold flex items-center gap-1 border border-slate-200">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
                      Class {currentAcademic.class?.name || '—'}
                      {currentAcademic.section ? ` (${currentAcademic.section.name})` : ''}
                    </span>
                  )}

                  {student.gender && (
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md font-semibold capitalize border border-slate-200">
                      {student.gender.toLowerCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Dues Balance Box */}
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Dues Balance</span>
                <span className={`text-xl font-bold font-mono ${pendingDues > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {formatCurrency(pendingDues)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/app/students/${student.id}/ledger`)}
                icon={FileText}
              >
                View Ledger
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Switcher Bar */}
        <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 font-bold bg-indigo-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== null && tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & PLACEMENT */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (1 col): Placement & Guardian */}
            <div className="space-y-6 lg:col-span-1">
              {/* Unified Student & Family Details Card */}
              <Card className="shadow-xs border-slate-200">
                <CardHeader
                  title="Student Details"
                  subtitle="Academic placement, guardian info, and residential contact"
                />
                <CardContent className="space-y-4 text-xs">
                  {/* Academic Placement Subsection */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block border-b border-slate-100 pb-1">
                      Academic Placement ({selectedYear?.name || 'Current Year'})
                    </span>

                    {currentAcademic ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Class & Section</span>
                          <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                            Class {currentAcademic.class?.name || '—'} {currentAcademic.section ? `(${currentAcademic.section.name})` : ''}
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Medium & Stream</span>
                          <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                            {currentAcademic.medium?.name || '—'} {currentAcademic.stream ? `(${currentAcademic.stream.name})` : ''}
                          </span>
                        </div>

                        {currentAcademic.rollNumber !== null && currentAcademic.rollNumber !== undefined && (
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="text-slate-400 font-bold uppercase text-[10px] block">Roll Number</span>
                            <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">
                              {currentAcademic.rollNumber}
                            </span>
                          </div>
                        )}

                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Admission Date</span>
                          <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                            {formatDate(student.admissionDate || student.createdAt)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 italic py-1">No active enrollment placement for selected year.</p>
                    )}
                  </div>

                  {/* Guardian & Contact Subsection */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block border-b border-slate-100 pb-1">
                      Guardian & Family Contact
                    </span>

                    <div className="space-y-3">
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Father / Guardian Name</span>
                        <span className="font-bold text-slate-900 text-sm mt-0.5 block">{student.guardianName || '—'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Contact Phone Number</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-1">
                          <Phone className="w-3.5 h-3.5 text-indigo-600" />
                          {student.phone ? (
                            <a href={`tel:${student.phone}`} className="hover:underline text-indigo-600 font-mono font-medium">
                              {student.phone}
                            </a>
                          ) : (
                            '—'
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Residential Address</span>
                        <span className="text-slate-700 flex items-start gap-1.5 mt-1 leading-relaxed">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          {student.address || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column (2 cols): Hostel & Quick Financial Summary */}
            <div className="space-y-6 lg:col-span-2">
              {/* Hostel Accommodation Card */}
              <Card className="shadow-xs border-slate-200">
                <CardHeader
                  title="Hostel Accommodation"
                  subtitle={student.hostel?.enrolled ? 'Active Hostel Enrollment' : 'Residential Accommodation Status'}
                  action={
                    !student.hostel?.enrolled ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        onClick={() => navigate('/app/hostel/admission', { state: { student } })}
                      >
                        + Admit to Hostel
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                        onClick={() => navigate('/app/hostel/residents', { state: { hostelId: student.hostel.hostelId } })}
                      >
                        View Hostel Dashboard
                      </Button>
                    )
                  }
                />
                <CardContent className="text-xs">
                  {student.hostel?.enrolled ? (
                    <div className="space-y-3 bg-purple-50/40 p-4 rounded-xl border border-purple-100">
                      <div className="flex items-center justify-between pb-2 border-b border-purple-200">
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-purple-600" />
                          {student.hostel.hostelName}
                        </span>
                        <Badge variant="purple" size="sm">{student.hostel.hostelType || 'Hostel'}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Room Number</span>
                          <span className="font-semibold text-slate-800 text-sm">Room {student.hostel.roomNumber}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Bed Allocation</span>
                          <span className="font-bold text-purple-700 text-sm">{student.hostel.bedNumber}</span>
                        </div>
                      </div>
                      {student.hostel.startDate && (
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Hostel Admission Date</span>
                          <span className="font-semibold text-slate-700">{formatDate(student.hostel.startDate)}</span>
                        </div>
                      )}
                    </div>
                  ) : student.hostel?.status === 'EXITED' ? (
                    <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                        <span className="font-bold text-slate-900 text-xs">{student.hostel.hostelName}</span>
                        <Badge variant="warning" size="sm">HOSTEL EXITED</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Previous Room & Bed</span>
                          <span className="font-semibold text-slate-800">Room {student.hostel.roomNumber} ({student.hostel.bedNumber})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Exit Date</span>
                          <span className="font-semibold text-rose-700 font-mono">{formatDate(student.hostel.endDate)}</span>
                        </div>
                      </div>
                      {student.hostel.exitReason && (
                        <div>
                          <span className="text-slate-400 font-bold uppercase text-[10px] block">Exit Reason</span>
                          <span className="font-medium text-slate-700 italic">"{student.hostel.exitReason}"</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 rounded-xl text-slate-600 text-xs text-center border border-slate-100 flex items-center justify-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span>Student is currently a <strong>Day Scholar</strong> (Not enrolled in hostel accommodation).</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Fee Dues Highlights */}
              <Card className="shadow-xs border-slate-200">
                <CardHeader
                  title="Fee Status Overview"
                  subtitle="Current year fee collection breakdown"
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('fees')}
                      icon={ChevronRight}
                    >
                      View Full Details
                    </Button>
                  }
                />
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-slate-500 font-semibold block text-[11px] mb-1">Total Generated Dues</span>
                      <span className="text-base font-bold text-slate-900 font-mono">
                        {formatCurrency(student.feeSummary?.generated)}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                      <span className="text-emerald-800 font-semibold block text-[11px] mb-1">Total Paid Receipts</span>
                      <span className="text-base font-bold text-emerald-700 font-mono">
                        {formatCurrency(student.feeSummary?.paid)}
                      </span>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${
                      pendingDues > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className={`${pendingDues > 0 ? 'text-rose-700' : 'text-slate-500'} font-semibold block text-[11px] mb-1`}>
                        Outstanding Balance
                      </span>
                      <span className={`text-base font-bold font-mono ${pendingDues > 0 ? 'text-rose-800' : 'text-slate-900'}`}>
                        {formatCurrency(pendingDues)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: FINANCIAL DUES & FEE STRUCTURE */}
        {activeTab === 'fees' && (
          <div className="space-y-6">
            {/* Fee Summary Executive Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {student.feeSummary?.discount > 0 ? (
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 shadow-2xs">
                  <span className="text-amber-800 font-bold block uppercase text-[10px] tracking-wider mb-1">Original Master Fee</span>
                  <span className="text-xl font-bold font-mono text-slate-600 line-through">
                    {formatCurrency(student.feeSummary?.original)}
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 font-bold block uppercase text-[10px] tracking-wider mb-1 font-mono">Billed Master Head</span>
                  <span className="text-xl font-bold font-mono text-slate-800">
                    {formatCurrency(student.feeSummary?.generated)}
                  </span>
                </div>
              )}

              {student.feeSummary?.discount > 0 && (
                <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 shadow-2xs">
                  <span className="text-emerald-800 font-bold block uppercase text-[10px] tracking-wider mb-1">Total Concessions</span>
                  <span className="text-xl font-bold font-mono text-emerald-700">
                    - {formatCurrency(student.feeSummary?.discount)}
                  </span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
                <span className="text-emerald-800 font-bold block uppercase text-[10px] tracking-wider mb-1">Total Paid Receipts</span>
                <span className="text-xl font-bold text-emerald-700 font-mono">
                  {formatCurrency(student.feeSummary?.paid)}
                </span>
              </div>

              <div className={`p-4 rounded-xl border shadow-2xs ${
                pendingDues > 0 ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`${pendingDues > 0 ? 'text-rose-800' : 'text-slate-500'} font-bold block uppercase text-[10px] tracking-wider mb-1`}>
                  Pending Outstanding
                </span>
                <span className={`text-xl font-bold font-mono ${pendingDues > 0 ? 'text-rose-800' : 'text-slate-900'}`}>
                  {formatCurrency(pendingDues)}
                </span>
              </div>
            </div>

            {/* Pending Fees Table Card */}
            <Card className="shadow-xs border-slate-200">
              <CardHeader
                title="Pending Dues Charges List"
                subtitle={`Unpaid and partial fee charges in chronological ascending order (${selectedYear?.name || 'Selected Year'})`}
                action={
                  pendingFees.length > 0 ? (
                    <DocumentActions
                      templateId="duesAdvice"
                      data={{
                        student,
                        currentAcademic,
                        pendingFees,
                        schoolHeader: schoolInfo,
                        academicYear: selectedYear,
                      }}
                      filename={`Dues_Slip_${student.admissionNo || 'Student'}.pdf`}
                      title={`Pending Dues Statement - ${student.name}`}
                    />
                  ) : null
                }
              />
              <CardContent>
                {pendingLoading ? (
                  <div className="p-4 space-y-2">
                    <Skeleton height="35px" width="100%" />
                    <Skeleton height="35px" width="100%" />
                  </div>
                ) : pendingFees.length === 0 ? (
                  <div className="p-6 bg-emerald-50/80 rounded-xl border border-emerald-200 text-center text-xs text-emerald-800 font-semibold space-y-1">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                    <p className="text-sm">All fee charges for this student are fully settled.</p>
                    <p className="text-slate-600 font-normal">There are zero pending dues for the selected academic year.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                          <tr>
                            <th className="py-3 px-3.5">#</th>
                            <th className="py-3 px-3.5">Fee Head</th>
                            <th className="py-3 px-3.5">Month</th>
                            <th className="py-3 px-3.5 text-right">Billed Amount</th>
                            <th className="py-3 px-3.5 text-right">Paid Amount</th>
                            <th className="py-3 px-3.5 text-right">Pending Balance</th>
                            <th className="py-3 px-3.5 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pendingFees.map((fee, idx) => (
                            <tr key={fee.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3.5 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                              <td className="py-3 px-3.5 font-bold text-slate-900">{fee.title}</td>
                              <td className="py-3 px-3.5 font-semibold text-indigo-700 font-mono">
                                {fee.month} {fee.year ? `(${fee.year})` : ''}
                              </td>
                              <td className="py-3 px-3.5 text-right font-mono text-slate-700">₹{fee.amount}</td>
                              <td className="py-3 px-3.5 text-right font-mono text-emerald-600 font-semibold">₹{fee.paidAmount || 0}</td>
                              <td className="py-3 px-3.5 text-right font-extrabold font-mono text-rose-700 text-sm">₹{fee.balance}</td>
                              <td className="py-3 px-3.5 text-center">
                                <Badge variant={fee.status === 'PARTIAL' ? 'amber' : 'red'} size="sm">
                                  {fee.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                          <tr>
                            <td colSpan="5" className="py-3 px-3.5 text-right text-slate-700 uppercase font-bold text-[11px]">
                              Total Outstanding Dues:
                            </td>
                            <td className="py-3 px-3.5 text-right font-extrabold font-mono text-rose-700 text-sm">
                              ₹{pendingFees.reduce((sum, f) => sum + Number(f.balance || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Master Fee Structure Card */}
            <Card className="shadow-xs border-slate-200">
              <CardHeader
                title="Master Fee Structure"
                subtitle={`Applicable academic fee structure for Class ${currentAcademic?.class?.name || '—'} (${selectedYear?.name || 'Selected Year'})`}
              />
              <CardContent className="space-y-4">
                {student.currentFeeStructure?.isConfigured ? (
                  <div>
                    {student.currentFeeStructure.academicFees?.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                            <tr>
                              <th className="py-3 px-3.5">Fee Head</th>
                              <th className="py-3 px-3.5">Billing Cycle</th>
                              <th className="py-3 px-3.5 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {student.currentFeeStructure.academicFees.map((head, idx) => {
                              const hasDiscount = head.discountAmount > 0 || (head.originalAmount && head.originalAmount > head.amount);
                              return (
                                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-3 px-3.5 font-semibold text-slate-800">
                                    {head.title}
                                    {head.isOverridden && (
                                      <span className="ml-2 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                                        Custom Override
                                      </span>
                                    )}
                                    {hasDiscount && (
                                      <span className="ml-1.5 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded font-mono">
                                        Discount: {formatCurrency(head.discountAmount || (head.originalAmount - head.amount))}
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
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                        No academic fee heads configured for this class.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs text-slate-600 font-medium">
                      No master fee structure is currently configured for this class, medium, and stream placement.
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

        {/* TAB 3: FEE OVERRIDES & CONCESSIONS */}
        {activeTab === 'overrides' && (
          <Card className="shadow-xs border-slate-200">
            <CardHeader
              title="Student Fee Overrides & Concessions"
              subtitle={`Student-specific fee head overrides for ${selectedYear?.name || 'Selected Year'}`}
            />
            <CardContent>
              <StudentFeeOverridesTab studentId={student.id} isLocked={isLocked} />
            </CardContent>
          </Card>
        )}

        {/* TAB 4: HISTORY & PROGRESSION */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Academic Progression Card */}
            <Card className="shadow-xs border-slate-200">
              <CardHeader title="Academic Progression History" subtitle="Year-by-year enrollment placement record" />
              <CardContent className="space-y-3">
                {student.enrollments && student.enrollments.length > 0 ? (
                  student.enrollments.map((enr) => {
                    const isSelected = enr.academicYear?.id === selectedYearId || enr.academicYearId === selectedYearId;
                    return (
                      <div
                        key={enr.id}
                        className={`p-4 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'border-indigo-300 bg-indigo-50/50 shadow-2xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900 mb-1.5 text-sm">
                          <span className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-indigo-600" />
                            {enr.academicYear?.name}
                          </span>
                          <Badge variant={enr.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                            Class {enr.class?.name || '—'}
                          </Badge>
                        </div>
                        <div className="text-slate-600 text-xs flex justify-between font-medium pt-1">
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
              <Card className="shadow-xs border-slate-200">
                <CardHeader
                  title="Mid-Session Transfer History"
                  subtitle="Historical Medium & Stream transfers within an academic year"
                />
                <CardContent className="space-y-3 text-xs">
                  {transferHistories.map((h) => (
                    <div key={h.id} className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2">
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

        {selectedEnrollmentForEdit && activeModal === 'EDIT_ENROLLMENT' && (
          <EditEnrollmentModal
            isOpen={true}
            onClose={() => {
              setActiveModal(null);
              setSelectedEnrollmentForEdit(null);
            }}
            student={student}
            enrollment={selectedEnrollmentForEdit}
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

        {/* Confirm Status Change Dialog */}
        <ConfirmDialog
          isOpen={activeModal === 'STATUS_CONFIRM'}
          onClose={() => {
            setActiveModal(null);
            setTargetStatus(null);
          }}
          onConfirm={handleConfirmStatusChange}
          title="Update Student Status"
          message={`Are you sure you want to change status of ${student.name} to ${targetStatus}?`}
          confirmText="Update Status"
          loading={statusUpdating}
          loadingText="Updating..."
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
          schoolHeader={schoolInfo}
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
    </>
  );
};
