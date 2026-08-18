import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Sparkles, UserCheck, UserX, Lock, Phone, MapPin, User, ShieldAlert, AlertCircle, FileText, RefreshCw, Building2 } from 'lucide-react';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
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

import { StudentAvatar } from '../../components/students/StudentAvatar.jsx';
import { StudentStatusBadge } from '../../components/students/StudentStatusBadge.jsx';
import { IndividualPromotionModal } from '../../components/students/IndividualPromotionModal.jsx';
import { EditEnrollmentModal } from '../../components/students/EditEnrollmentModal.jsx';
import { StudentFeeOverridesTab } from '../../components/students/StudentFeeOverridesTab.jsx';
import { DuesAdviceCard } from '../../components/fees/DuesAdviceCard.jsx';
import { PhotoPreviewModal } from '../../components/students/PhotoPreviewModal.jsx';

export const StudentDetailsPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { selectedYear, selectedYearId, academicYears } = useAcademicYear();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

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

  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'PROMOTE' | 'EDIT_ENROLLMENT' | 'STATUS_CONFIRM'
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

  useEffect(() => {
    fetchStudentData();
    fetchPendingFees();
  }, [fetchStudentData, fetchPendingFees]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height="80px" width="100%" className="rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton height="300px" className="lg:col-span-1 rounded-xl" />
          <Skeleton height="300px" className="lg:col-span-2 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-4 my-8">
        <Alert variant="danger" icon={ShieldAlert} title="Unable to load profile">
          {error}
        </Alert>
        <Button variant="outline" onClick={fetchStudentData} icon={RefreshCw}>
          Retry Loading Profile
        </Button>
      </div>
    );
  }

  if (notFound || !student) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-xl mx-auto space-y-4 my-8">
        <EmptyState
          icon={User}
          title="Student Not Found"
          description="The student record you requested does not exist or belongs to another school workspace."
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const pendingDues = parseFloat(student.feeSummary?.pending || 0);

  return (
    <>
      <div className="space-y-6 print:hidden">
      {/* Module Page Header */}
      <ModulePageHeader
        icon={User}
        title={`Student Profile: ${student.name}`}
        description={`Admission No: ${student.admissionNo} | Academic Year: ${selectedYear?.name || 'Current'}`}
        actions={
          <div className="flex items-center gap-2">
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
                <button className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700">
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
            </Dropdown>
          </div>
        }
      />

      {isLocked && (
        <Alert variant="neutral" icon={Lock} title="Historical Locked Academic Year">
          {selectedYear?.name} is locked. You can view student details and history, but modifications for this year are restricted.
        </Alert>
      )}

      {/* Enterprise Student Executive Summary Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Passport Format Student Photo Box */}
            <div
              className={`w-20 h-26 rounded-xl bg-slate-100 border-2 border-slate-300 shadow-2xs overflow-hidden flex items-center justify-center shrink-0 ${
                student.photoUrl ? 'cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all' : ''
              }`}
              onClick={() => {
                if (student.photoUrl) setPreviewPhoto(student.photoUrl);
              }}
              title={student.photoUrl ? 'Click to view full photo' : ''}
            >
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <StudentAvatar name={student.name} size="passport" className="w-full h-full border-none rounded-none" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{student.name}</h1>
                <StudentStatusBadge status={student.status} size="sm" />
                {student.hostel?.enrolled ? (
                  <Badge variant="purple" size="sm" className="font-semibold">
                    <Building2 className="w-3 h-3 mr-1 inline" />
                    Hostel Resident
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">Day Scholar</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-semibold">
                  Adm No: {student.admissionNo}
                </span>
                <span>Guardian: <strong>{student.guardianName}</strong></span>
                {student.phone && (
                  <span className="flex items-center gap-1 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {student.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Dues KPI Block */}
          <div className="flex items-center gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
            <div className="text-right px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 min-w-[160px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Dues Balance</span>
              <span className={`text-base font-bold font-mono ${pendingDues > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
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

      {/* Main ERP Layout: 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1 col): Academic & Master Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Current Academic Enrollment */}
          <Card>
            <CardHeader
              title="Academic Placement"
              subtitle={`Academic placement for ${selectedYear?.name || 'Selected Year'}`}
            />
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Academic Year</span>
                  <span className="font-semibold text-slate-800">{selectedYear?.name || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Admission Date</span>
                  <span className="font-semibold text-slate-800">{formatDate(student.createdAt)}</span>
                </div>
              </div>

              {currentAcademic ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Class</span>
                      <span className="font-bold text-slate-900 text-sm">Class {currentAcademic.class?.name || '—'}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Section</span>
                      <span className="font-semibold text-slate-800">
                        {currentAcademic.section ? `Section ${currentAcademic.section.name}` : '—'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Medium</span>
                      <span className="font-semibold text-slate-800">{currentAcademic.medium?.name || '—'}</span>
                    </div>

                    {(currentAcademic.class?.hasStream || currentAcademic.stream) && (
                      <div>
                        <span className="text-slate-400 font-bold uppercase text-[10px] block">Stream</span>
                        <span className="font-semibold text-slate-800">{currentAcademic.stream?.name || 'Not Applicable'}</span>
                      </div>
                    )}
                  </div>

                  {currentAcademic.rollNumber !== null && currentAcademic.rollNumber !== undefined && (
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Roll Number</span>
                      <span className="font-mono text-slate-800 font-bold">{currentAcademic.rollNumber}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-500 italic py-2">No active enrollment placement for the selected academic year.</p>
              )}
            </CardContent>
          </Card>

          {/* Hostel Accommodation Card */}
          <Card>
            <CardHeader
              title="Hostel Accommodation"
              subtitle={student.hostel?.enrolled ? 'Active Hostel Enrollment' : 'Residential Status'}
              action={
                !student.hostel?.enrolled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-indigo-600"
                    onClick={() => navigate('/app/hostel/admission', { state: { student } })}
                  >
                    + Admit to Hostel
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-indigo-600"
                    onClick={() => navigate('/app/hostel/residents', { state: { hostelId: student.hostel.hostelId } })}
                  >
                    View in Hostel
                  </Button>
                )
              }
            />
            <CardContent className="text-xs">
              {student.hostel?.enrolled ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-bold text-slate-900 text-sm">{student.hostel.hostelName}</span>
                    <Badge variant="purple" size="sm">{student.hostel.hostelType || 'Hostel'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Room Number</span>
                      <span className="font-semibold text-slate-800">Room {student.hostel.roomNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Bed Number</span>
                      <span className="font-bold text-indigo-600">{student.hostel.bedNumber}</span>
                    </div>
                  </div>
                  {student.hostel.startDate && (
                    <div>
                      <span className="text-slate-400 font-bold uppercase text-[10px] block">Hostel Admission Date</span>
                      <span className="font-semibold text-slate-700">{formatDate(student.hostel.startDate)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-xs text-center border border-slate-100">
                  Student is currently a <strong>Day Scholar</strong> (Not enrolled in hostel).
                </div>
              )}
            </CardContent>
          </Card>

          {/* Guardian & Contact Card */}
          <Card>
            <CardHeader title="Guardian Information" />
            <CardContent className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Father / Guardian Name</span>
                <span className="font-semibold text-slate-800 text-sm">{student.guardianName}</span>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Contact Phone</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {student.phone || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-bold uppercase text-[10px] block">Residential Address</span>
                <span className="text-slate-700 flex items-start gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  {student.address || '—'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Academic Progression Timeline */}
          <Card>
            <CardHeader title="Academic Progression" subtitle="Enrollment history across years" />
            <CardContent className="space-y-2.5">
              {student.enrollments && student.enrollments.length > 0 ? (
                student.enrollments.map((enr) => {
                  const isSelected = enr.academicYear?.id === selectedYearId || enr.academicYearId === selectedYearId;
                  return (
                    <div
                      key={enr.id}
                      className={`p-3 rounded-lg border text-xs ${
                        isSelected ? 'border-indigo-300 bg-indigo-50/40 font-medium' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800 mb-1">
                        <span>{enr.academicYear?.name}</span>
                        <Badge variant={enr.status === 'ACTIVE' ? 'success' : 'neutral'} size="sm">
                          Class {enr.class?.name || '—'}
                        </Badge>
                      </div>
                      <div className="text-slate-500 text-[11px] flex justify-between">
                        <span>
                          {enr.medium?.name} {enr.stream ? `(${enr.stream.name})` : ''}
                        </span>
                        <span>Roll: {enr.rollNumber ?? enr.rollNo ?? '—'}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-500 italic py-2 text-center">No historical enrollment records.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (2 cols): Fee Structure, Overrides & Dues Summary */}
        <div className="space-y-6 lg:col-span-2">
          {/* Fee Summary / Ledger Dues */}
          <Card>
            <CardHeader
              title="Fee Summary"
              subtitle="Generated dues, concessions, and payments received"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/app/students/${student.id}/ledger`)}
                  icon={FileText}
                >
                  View Full Ledger
                </Button>
              }
            />
            <CardContent>
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${student.feeSummary?.discount > 0 ? '4' : '3'} gap-3 text-xs`}>
                {student.feeSummary?.discount > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200">
                    <span className="text-amber-700 font-semibold block mb-1">Total Original Fee</span>
                    <span className="text-base font-bold font-mono text-slate-700 line-through">
                      {formatCurrency(student.feeSummary?.original)}
                    </span>
                  </div>
                )}

                {student.feeSummary?.discount > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                    <span className="text-emerald-800 font-bold block mb-1">Concession / Discount</span>
                    <span className="text-base font-bold font-mono text-emerald-700">
                      - {formatCurrency(student.feeSummary?.discount)}
                    </span>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-semibold block mb-1">
                    {student.feeSummary?.discount > 0 ? 'Net Payable Fee' : 'Total Generated'}
                  </span>
                  <span className="text-lg font-bold text-slate-900 font-mono">
                    {formatCurrency(student.feeSummary?.generated)}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200">
                  <span className="text-emerald-700 font-semibold block mb-1">Total Paid</span>
                  <span className="text-lg font-bold text-emerald-800 font-mono">
                    {formatCurrency(student.feeSummary?.paid)}
                  </span>
                </div>

                <div className={`p-3 rounded-lg border ${
                  pendingDues > 0
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`${pendingDues > 0 ? 'text-rose-700' : 'text-slate-500'} font-semibold block mb-1`}>
                    Total Pending
                  </span>
                  <span className={`text-lg font-bold font-mono ${pendingDues > 0 ? 'text-rose-800' : 'text-slate-900'}`}>
                    {formatCurrency(pendingDues)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Fees List Card (Chronological ASC Order) */}
          <Card>
            <CardHeader
              title="Pending Dues List"
              subtitle={`Unpaid and partial fee charges in chronological ascending order (${selectedYear?.name || 'Selected Year'})`}
              action={
                pendingFees.length > 0 ? (
                  <DocumentActions
                    templateId="feeReport"
                    data={{
                      reportMeta: { title: `Fee Dues Slip - ${student.name}` },
                      data: pendingFees.map((f) => ({
                        ...f,
                        studentName: student.name,
                        admissionNo: student.admissionNo,
                        className: currentAcademic?.class?.name || '',
                        dueAmount: f.balance,
                        paidAmount: f.paidAmount || 0,
                      })),
                      summary: {
                        totalDues: pendingFees.reduce((sum, f) => sum + Number(f.balance || 0), 0),
                      },
                    }}
                    filename={`Dues_Slip_${student.admissionNo || 'Student'}.pdf`}
                    title={`Pending Dues Slip - ${student.name}`}
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
                <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 text-center text-xs text-emerald-800 font-medium">
                  🎉 All fee charges for this student are fully settled. Zero pending dues.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">#</th>
                          <th className="py-2.5 px-3">Fee Head</th>
                          <th className="py-2.5 px-3">Month</th>
                          <th className="py-2.5 px-3 text-right">Billed Amount</th>
                          <th className="py-2.5 px-3 text-right">Paid Amount</th>
                          <th className="py-2.5 px-3 text-right">Pending Balance</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pendingFees.map((fee, idx) => (
                          <tr key={fee.id || idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{fee.title}</td>
                            <td className="py-2.5 px-3 font-semibold text-indigo-700 font-mono">
                              {fee.month} {fee.year ? `(${fee.year})` : ''}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">₹{fee.amount}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-600">₹{fee.paidAmount || 0}</td>
                            <td className="py-2.5 px-3 text-right font-extrabold font-mono text-rose-700">₹{fee.balance}</td>
                            <td className="py-2.5 px-3 text-center">
                              <Badge variant={fee.status === 'PARTIAL' ? 'amber' : 'red'} size="sm">
                                {fee.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs">
                        <tr>
                          <td colSpan="5" className="py-2.5 px-3 text-right text-slate-700 uppercase font-bold text-[11px]">
                            Total Outstanding Dues:
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold font-mono text-rose-700 text-sm">
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

          {/* Current Master Fee Structure Card */}
          <Card>
            <CardHeader
              title="Master Fee Structure"
              subtitle={`Applicable academic fee structure for Class ${currentAcademic?.class?.name || '—'} (${selectedYear?.name || 'Selected Year'})`}
            />
            <CardContent className="space-y-4">
              {student.currentFeeStructure?.isConfigured ? (
                <div>
                  {student.currentFeeStructure.academicFees?.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Fee Head</th>
                            <th className="py-2.5 px-3">Billing Cycle</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {student.currentFeeStructure.academicFees.map((head, idx) => {
                            const hasDiscount = head.discountAmount > 0 || (head.originalAmount && head.originalAmount > head.amount);
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-2.5 px-3 font-semibold text-slate-800">
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
                                <td className="py-2.5 px-3 text-slate-500">
                                  {head.billingRule === 'ONE_TIME_PER_ACADEMIC_YEAR'
                                    ? 'Once / Academic Year'
                                    : 'Monthly'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
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
                      No academic fee heads configured.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-5 text-center rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">
                    No fee structure is currently configured for this class, medium, and stream.
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

          {/* Student Fee Overrides Section */}
          <Card>
            <CardHeader
              title="Student Fee Overrides & Concessions"
              subtitle={`Student-specific fee head overrides for ${selectedYear?.name || 'Selected Year'}`}
            />
            <CardContent>
              <StudentFeeOverridesTab studentId={student.id} isLocked={isLocked} />
            </CardContent>
          </Card>
        </div>
      </div>

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
        name={student.name}
        admissionNo={student.admissionNo}
      />
    </>
  );
};
