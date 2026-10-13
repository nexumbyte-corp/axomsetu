import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  CheckCircle2,
  Receipt,
  Building,
  Edit2,
  Plus,
  Search,
  Ban,
  RotateCcw,
  Users,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { useAcademicYear } from '../../context/AcademicYearContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { formatDate } from '../../utils/formatters.js';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StudentDetailsCell } from '../../components/hostel/StudentDetailsCell.jsx';
import { StudentPhotoModal } from '../../components/hostel/StudentPhotoModal.jsx';

const FEE_MONTHS_ALL = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

const getOrderedMonthsForAcademicYear = (academicYearObj) => {
  if (!academicYearObj || !academicYearObj.startDate) {
    return FEE_MONTHS_ALL;
  }

  const startDate = new Date(academicYearObj.startDate);
  const startMonthIdx = startDate.getUTCMonth();

  const ordered = [];
  for (let i = 0; i < 12; i++) {
    const idx = (startMonthIdx + i) % 12;
    ordered.push(FEE_MONTHS_ALL[idx]);
  }
  return ordered;
};

const getCurrentSystemMonth = () => {
  const currentMonthIdx = new Date().getMonth();
  return FEE_MONTHS_ALL[currentMonthIdx] || 'JANUARY';
};


export const HostelFeeSetupPage = () => {
  const navigate = useNavigate();
  const { currentAcademicYear, academicYears } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('generate'); // 'generate' | 'rates' | 'history'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [hostels, setHostels] = useState([]);
  const [hostelFeeConfigs, setHostelFeeConfigs] = useState({});

  // Fee Rates Setup Modal State
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [feeFormData, setFeeFormData] = useState({
    monthlyFeeEnabled: true,
    monthlyFeeAmount: 3000,
    admissionFeeEnabled: true,
    admissionFeeAmount: 1000,
  });

  // Dynamic Academic Year Month Ordering
  const selectedYearObj = academicYears?.find((a) => a.id === selectedAcademicYearId);
  const orderedBillingMonths = getOrderedMonthsForAcademicYear(selectedYearObj);

  // Monthly Billing State
  const [billingMonth, setBillingMonth] = useState(() => getCurrentSystemMonth());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'READY' | 'MODIFIED' | 'WAIVED' | 'ALREADY_GENERATED'
  const [studentsList, setStudentsList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [billingError, setBillingError] = useState(null);
  const [selectedPhotoStudent, setSelectedPhotoStudent] = useState(null);

  // Confirmation Modal & Result Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [genResult, setGenResult] = useState(null);

  // History & Ledger State
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [feeRecords, setFeeRecords] = useState([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyMonthFilter, setHistoryMonthFilter] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('ALL');

  // Bulk input
  const [bulkAmountInput, setBulkAmountInput] = useState('');

  useEffect(() => {
    if (currentAcademicYear) {
      setSelectedAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear]);

  // Fetch hostels and fee configurations
  const fetchHostelsAndConfigs = useCallback(async () => {
    if (!selectedAcademicYearId) return;
    try {
      setLoading(true);
      const hostelRes = await hostelService.listHostels();
      const hostelsData = hostelRes.data || [];
      setHostels(hostelsData);

      const configMap = {};
      await Promise.all(
        hostelsData.map(async (h) => {
          try {
            const cfgRes = await hostelService.getFeeConfig({
              academicYearId: selectedAcademicYearId,
              hostelId: h.id,
            });
            if (cfgRes.data) {
              configMap[h.id] = cfgRes.data;
            }
          } catch (err) {
            console.error(`Failed loading fee config for hostel ${h.name}:`, err);
          }
        })
      );
      setHostelFeeConfigs(configMap);
    } catch {
      toast.error('Failed to load hostel setup data');
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYearId]);

  // Fetch billed history and charges
  const fetchFeeRecords = useCallback(async () => {
    if (!selectedAcademicYearId) return;
    try {
      setRecordsLoading(true);
      const res = await hostelService.getReport('fees', {
        academicYearId: selectedAcademicYearId,
      });
      if (res.data) {
        setFeeRecords(res.data.charges || []);
      }
    } catch (err) {
      console.error('Failed loading hostel fee ledger:', err);
    } finally {
      setRecordsLoading(false);
    }
  }, [selectedAcademicYearId]);

  // Fetch billing candidates for the current month and hostel
  const fetchEligibleStudents = useCallback(async () => {
    if (!selectedAcademicYearId || !billingMonth) return;
    try {
      setStudentsLoading(true);
      setBillingError(null);
      const res = await hostelService.getEligibleStudentsForBilling({
        academicYearId: selectedAcademicYearId,
        month: billingMonth,
        hostelId: selectedHostelId || undefined,
      });

      if (res.data && res.data.students) {
        setStudentsList(res.data.students);
      } else {
        setStudentsList([]);
      }
    } catch (err) {
      setStudentsList([]);
      setBillingError(err.message || 'Error loading billing candidates');
    } finally {
      setStudentsLoading(false);
    }
  }, [selectedAcademicYearId, billingMonth, selectedHostelId]);

  useEffect(() => {
    if (selectedAcademicYearId) {
      fetchHostelsAndConfigs();
      fetchFeeRecords();
    }
  }, [selectedAcademicYearId, fetchHostelsAndConfigs, fetchFeeRecords]);

  useEffect(() => {
    if (selectedAcademicYearId && billingMonth && activeTab === 'generate') {
      fetchEligibleStudents();
    }
  }, [selectedAcademicYearId, billingMonth, selectedHostelId, activeTab, fetchEligibleStudents]);

  // Handle rates modal
  const handleOpenFeeModal = (hostel) => {
    setEditingHostel(hostel);
    const existingConfig = hostelFeeConfigs[hostel.id] || {};
    setFeeFormData({
      monthlyFeeEnabled: existingConfig.monthlyFeeEnabled ?? true,
      monthlyFeeAmount: existingConfig.monthlyFeeAmount ?? 3000,
      admissionFeeEnabled: existingConfig.admissionFeeEnabled ?? true,
      admissionFeeAmount: existingConfig.admissionFeeAmount ?? 1000,
    });
    setIsFeeModalOpen(true);
  };

  const handleSaveHostelFeeRates = async (e) => {
    e.preventDefault();
    if (!editingHostel) return;

    try {
      setSubmitting(true);
      await hostelService.saveFeeConfig({
        academicYearId: selectedAcademicYearId,
        hostelId: editingHostel.id,
        monthlyFeeEnabled: feeFormData.monthlyFeeEnabled,
        monthlyFeeAmount: parseFloat(feeFormData.monthlyFeeAmount) || 0,
        admissionFeeEnabled: feeFormData.admissionFeeEnabled,
        admissionFeeAmount: parseFloat(feeFormData.admissionFeeAmount) || 0,
      });

      toast.success(`Fee rates saved for ${editingHostel.name}`);
      setIsFeeModalOpen(false);
      fetchHostelsAndConfigs();
    } catch (err) {
      toast.error(err.message || 'Failed to save hostel fee rates');
    } finally {
      setSubmitting(false);
    }
  };

  // Selection handlers
  const handleToggleStudentSelect = (studentId) => {
    setStudentsList((prev) =>
      prev.map((s) => (s.studentId === studentId && s.isSelectable ? { ...s, isSelected: !s.isSelected } : s))
    );
  };

  // In-line fee adjustment
  const handleAppliedFeeChange = (studentId, val) => {
    const num = parseFloat(val);
    const feeVal = isNaN(num) ? 0 : num;
    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.studentId === studentId) {
          const isWaived = feeVal === 0;
          return {
            ...s,
            appliedFee: feeVal,
            status: isWaived ? 'WAIVED' : (feeVal < s.defaultFee ? 'REDUCED' : (feeVal > s.defaultFee ? 'INCREASED' : 'READY')),
            reason: isWaived ? (s.reason || 'Hostel Break / Waived') : s.reason,
          };
        }
        return s;
      })
    );
  };

  const handleReasonChange = (studentId, val) => {
    setStudentsList((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, reason: val } : s))
    );
  };

  // Bulk Actions
  const handleApplyBulkAmount = () => {
    const amt = parseFloat(bulkAmountInput);
    if (isNaN(amt) || amt < 0) {
      toast.error('Enter a valid non-negative fee amount');
      return;
    }

    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.isSelected && s.isSelectable) {
          const isWaived = amt === 0;
          return {
            ...s,
            appliedFee: amt,
            status: isWaived ? 'WAIVED' : (amt < s.defaultFee ? 'REDUCED' : (amt > s.defaultFee ? 'INCREASED' : 'READY')),
            reason: isWaived ? (s.reason || 'Hostel Break / Waived') : s.reason,
          };
        }
        return s;
      })
    );
    toast.success(`Applied ₹${amt.toLocaleString('en-IN')} to selected`);
    setBulkAmountInput('');
  };

  const handleBulkSetZero = () => {
    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.isSelected && s.isSelectable) {
          return {
            ...s,
            appliedFee: 0,
            status: 'WAIVED',
            reason: s.reason || 'Hostel Break / Waived',
          };
        }
        return s;
      })
    );
    toast.success('Waived fees (₹0) for selected residents');
  };

  const handleBulkResetToDefault = () => {
    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.isSelected && s.isSelectable) {
          return {
            ...s,
            appliedFee: s.defaultFee,
            status: 'READY',
            reason: '',
          };
        }
        return s;
      })
    );
    toast.success('Reset selected to standard rates');
  };

  const handleCopyPreviousMonthFees = () => {
    let copiedCount = 0;
    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.isSelected && s.isSelectable && s.previousMonthFee !== null && s.previousMonthFee !== undefined) {
          copiedCount++;
          const prevAmt = Number(s.previousMonthFee);
          const isWaived = prevAmt === 0;
          return {
            ...s,
            appliedFee: prevAmt,
            status: isWaived ? 'WAIVED' : (prevAmt < s.defaultFee ? 'REDUCED' : 'READY'),
            reason: isWaived ? 'Copied from Previous Month (Waived)' : `Copied from Previous Month (₹${prevAmt})`,
          };
        }
        return s;
      })
    );

    if (copiedCount > 0) {
      toast.success(`Copied previous fee for ${copiedCount} resident(s)`);
    } else {
      toast.info('No previous month records found for selected residents');
    }
  };

  // Filtered Students Calculation (Instant client-side search & status filtering)
  const filteredStudents = useMemo(() => {
    return studentsList.filter((s) => {
      if (statusFilter === 'READY') {
        if (s.status === 'ALREADY_GENERATED' || !s.isSelectable) return false;
        if (Number(s.appliedFee) === 0 || Number(s.appliedFee) !== Number(s.defaultFee)) return false;
      } else if (statusFilter === 'MODIFIED') {
        if (s.status === 'ALREADY_GENERATED' || !s.isSelectable) return false;
        if (Number(s.appliedFee) === Number(s.defaultFee) || Number(s.appliedFee) === 0) return false;
      } else if (statusFilter === 'WAIVED') {
        if (Number(s.appliedFee) !== 0 && s.status !== 'WAIVED') return false;
      } else if (statusFilter === 'ALREADY_GENERATED') {
        if (s.status !== 'ALREADY_GENERATED') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = (s.studentName || '').toLowerCase().includes(q);
        const matchAdm = (s.admissionNo || '').toLowerCase().includes(q);
        const matchGuardian = (s.guardianName || '').toLowerCase().includes(q);
        const matchHostel = (s.hostelName || '').toLowerCase().includes(q);
        const matchRoom = (s.roomNumber || '').toLowerCase().includes(q);
        if (!matchName && !matchAdm && !matchGuardian && !matchHostel && !matchRoom) {
          return false;
        }
      }

      return true;
    });
  }, [studentsList, statusFilter, searchQuery]);

  // Selection state on filtered list
  const selectableFiltered = useMemo(() => filteredStudents.filter((s) => s.isSelectable), [filteredStudents]);
  const allFilteredChecked =
    selectableFiltered.length > 0 && selectableFiltered.every((s) => s.isSelected);
  const someFilteredChecked =
    selectableFiltered.some((s) => s.isSelected) && !allFilteredChecked;

  const handleToggleSelectFiltered = () => {
    const targetState = !allFilteredChecked;
    const filteredIds = new Set(selectableFiltered.map((s) => s.studentId));
    setStudentsList((prev) =>
      prev.map((s) => (filteredIds.has(s.studentId) ? { ...s, isSelected: targetState } : s))
    );
  };

  // Real-time calculations
  const selectableCount = studentsList.filter((s) => s.isSelectable).length;
  const selectedStudents = useMemo(
    () => studentsList.filter((s) => s.isSelected && s.isSelectable),
    [studentsList]
  );
  const selectedCount = selectedStudents.length;

  const totalSelectedAmount = useMemo(
    () => selectedStudents.reduce((sum, s) => sum + (Number(s.appliedFee) || 0), 0),
    [selectedStudents]
  );

  const waivedInSelected = useMemo(
    () => selectedStudents.filter((s) => Number(s.appliedFee) === 0).length,
    [selectedStudents]
  );

  // Status Tab Counts
  const readyCount = useMemo(
    () =>
      studentsList.filter(
        (s) => s.isSelectable && Number(s.appliedFee) === Number(s.defaultFee)
      ).length,
    [studentsList]
  );
  const modifiedCount = useMemo(
    () =>
      studentsList.filter(
        (s) =>
          s.isSelectable &&
          Number(s.appliedFee) !== Number(s.defaultFee) &&
          Number(s.appliedFee) > 0
      ).length,
    [studentsList]
  );
  const waivedCount = useMemo(
    () => studentsList.filter((s) => Number(s.appliedFee) === 0 || s.status === 'WAIVED').length,
    [studentsList]
  );
  const alreadyGeneratedCount = useMemo(
    () => studentsList.filter((s) => s.status === 'ALREADY_GENERATED').length,
    [studentsList]
  );

  // Execution
  const handleOpenConfirmModal = () => {
    if (selectedCount === 0) {
      toast.error('Please select at least one resident');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const handleExecuteGeneration = async () => {
    try {
      setSubmitting(true);
      const payload = {
        academicYearId: selectedAcademicYearId,
        month: billingMonth,
        hostelId: selectedHostelId || undefined,
        students: selectedStudents.map((s) => ({
          studentId: s.studentId,
          studentEnrollmentId: s.studentEnrollmentId,
          appliedFee: s.appliedFee,
          defaultFee: s.defaultFee,
          isWaived: s.appliedFee === 0,
          reason: s.reason,
        })),
      };

      const res = await hostelService.generateMonthlyFees(payload);
      setGenResult(res.data);
      setIsConfirmModalOpen(false);
      setShowResultModal(true);
      fetchEligibleStudents();
      fetchFeeRecords();
    } catch (err) {
      toast.error(err.message || 'Failed to generate hostel fees');
    } finally {
      setSubmitting(false);
    }
  };

  // History Tab Filtered Records
  const filteredFeeRecords = useMemo(() => {
    return feeRecords.filter((rec) => {
      if (historyMonthFilter && rec.month !== historyMonthFilter) return false;
      if (historyStatusFilter !== 'ALL' && rec.status !== historyStatusFilter) return false;
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.trim().toLowerCase();
        const studentName = (rec.studentName || rec.student?.name || '').toLowerCase();
        const admNo = (rec.student?.admissionNo || '').toLowerCase();
        const title = (rec.title || '').toLowerCase();
        if (!studentName.includes(q) && !admNo.includes(q) && !title.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [feeRecords, historyMonthFilter, historyStatusFilter, historySearchQuery]);

  return (
    <div className="space-y-4 text-xs pb-10">
      {/* Module Header */}
      <ModulePageHeader
        icon={Receipt}
        title="Hostel Fee Setup & Billing Hub"
        description="Set monthly fee rates and generate recurring dues for hostel residents."
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="py-1 px-2.5 text-xs font-medium bg-white border-slate-300 rounded-lg shadow-2xs"
            >
              {academicYears?.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? '(Current Year)' : ''}
                </option>
              ))}
            </Select>
          </div>
        }
      />

      {/* ── MINIMALIST UNDERLINE TABS ── */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold px-1">
        <button
          onClick={() => setActiveTab('generate')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'generate'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Generate Monthly Fees</span>
          {studentsList.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-normal">
              {studentsList.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rates')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'rates'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Hostel Fee Rates</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-normal">
            {hostels.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Billed History</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-normal">
            {feeRecords.length}
          </span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 1: GENERATE MONTHLY DUES (MINIMALIST) ── */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'generate' && (
        <div className="space-y-3">
          {billingError && (
            <Alert type="danger" className="py-2.5 text-xs">
              <Ban className="w-4 h-4 mr-1.5 inline shrink-0" />
              {billingError}
            </Alert>
          )}

          {/* Unified Compact Toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Billing Month Selector */}
              <div className="w-40 sm:w-44">
                <Select
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="py-1 text-xs font-medium text-slate-800"
                >
                  {orderedBillingMonths.map((m) => (
                    <option key={m} value={m}>
                      {m} {m === getCurrentSystemMonth() ? '(Current)' : ''}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Hostel Selector */}
              <div className="w-36 sm:w-44">
                <Select
                  value={selectedHostelId}
                  onChange={(e) => setSelectedHostelId(e.target.value)}
                  className="py-1 text-xs"
                >
                  <option value="">All Hostels</option>
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Search Box */}
              <div className="w-56 sm:w-64 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-8 pr-7 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  placeholder="Search resident or adm no..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <Button
                variant="ghost"
                size="xs"
                onClick={fetchEligibleStudents}
                loading={studentsLoading}
                title="Reload hostellers list"
                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Primary Action Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenConfirmModal}
              disabled={selectedCount === 0}
              loading={submitting}
              className="text-xs font-semibold py-1.5 px-3.5 shrink-0"
            >
              <Play className="w-3 h-3 mr-1.5 fill-current" />
              Generate Monthly Fees {selectedCount > 0 ? `(${selectedCount})` : ''}
            </Button>
          </div>

          {/* Minimalist Status Filters & Selection Summary */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex items-center gap-1">
              {[
                { key: 'ALL', label: 'All', count: studentsList.length },
                { key: 'READY', label: 'Ready', count: readyCount },
                { key: 'MODIFIED', label: 'Custom', count: modifiedCount },
                { key: 'WAIVED', label: 'Waived', count: waivedCount },
                ...(alreadyGeneratedCount > 0
                  ? [{ key: 'ALREADY_GENERATED', label: 'Billed', count: alreadyGeneratedCount }]
                  : []),
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    statusFilter === tab.key
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {tab.label} <span className="opacity-70 text-[11px]">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Inline Telemetry Counter */}
            <div className="text-slate-500 text-xs flex items-center gap-2.5">
              <span>
                Selected: <strong className="text-slate-800">{selectedCount}</strong> of {selectableCount}
              </span>
              <span>•</span>
              <span>
                Total: <strong className="font-mono text-slate-900 font-semibold">₹{totalSelectedAmount.toLocaleString('en-IN')}</strong>
              </span>
            </div>
          </div>

          {/* Contextual Bulk Action Bar (Only visible when residents are selected) */}
          {selectedCount > 0 && (
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-indigo-900">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>{selectedCount}</strong> selected
                </span>
                <span className="text-indigo-300">|</span>
                <span className="font-mono font-bold text-indigo-950">
                  ₹{totalSelectedAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Bulk Fee Input */}
                <div className="flex items-center bg-white rounded border border-indigo-200 overflow-hidden h-7">
                  <span className="px-1.5 text-[11px] text-slate-400 font-medium select-none">₹</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={bulkAmountInput}
                    onChange={(e) => setBulkAmountInput(e.target.value)}
                    className="w-16 px-1 text-xs font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyBulkAmount}
                    disabled={!bulkAmountInput}
                    className="px-2 text-[11px] font-semibold bg-indigo-100 text-indigo-800 hover:bg-indigo-200 h-full border-l border-indigo-200 disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleBulkSetZero}
                  className="px-2.5 py-1 text-xs font-medium rounded bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 transition-colors h-7"
                >
                  Set ₹0 / Waive
                </button>

                <button
                  type="button"
                  onClick={handleCopyPreviousMonthFees}
                  className="px-2.5 py-1 text-xs font-medium rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors h-7"
                >
                  Copy Prev Month
                </button>

                <button
                  type="button"
                  onClick={handleBulkResetToDefault}
                  className="px-2 py-1 text-xs font-medium rounded bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-colors h-7"
                  title="Reset selected to standard rates"
                >
                  <RotateCcw className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          {studentsLoading ? (
            <div className="flex justify-center p-14 bg-white rounded-xl border border-slate-200">
              <Spinner size="lg" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-1.5">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-700">No hostellers found</div>
              <div className="text-slate-400 text-xs">
                {searchQuery
                  ? `No residents matching "${searchQuery}"`
                  : `No hostellers registered for billing in ${billingMonth}.`}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] select-none">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allFilteredChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someFilteredChecked;
                          }}
                          onChange={handleToggleSelectFiltered}
                          className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Resident Details</th>
                      <th className="py-2.5 px-3">Hostel & Room</th>
                      <th className="py-2.5 px-3 text-right">Standard Rate</th>
                      <th className="py-2.5 px-3 text-center w-36">Applied Fee (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((row) => {
                      const isGenerated = row.status === 'ALREADY_GENERATED';
                      const isWaived = row.status === 'WAIVED' || Number(row.appliedFee) === 0;
                      const isReduced = Number(row.appliedFee) < row.defaultFee && !isWaived;

                      return (
                        <tr
                          key={row.studentId}
                          className={`hover:bg-slate-50/70 transition-colors ${
                            row.isSelected ? 'bg-indigo-50/20' : ''
                          } ${isGenerated ? 'opacity-60 bg-slate-50/50' : ''}`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={!row.isSelectable}
                              checked={row.isSelected}
                              onChange={() => handleToggleStudentSelect(row.studentId)}
                              className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer disabled:opacity-40"
                            />
                          </td>

                          {/* Resident */}
                          <td className="py-2.5 px-3">
                            <StudentDetailsCell
                              student={row}
                              onPhotoClick={setSelectedPhotoStudent}
                            />
                          </td>

                          {/* Hostel & Room */}
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 block text-xs">
                              {row.hostelName || 'Hostel'}
                            </span>
                            <span className="text-slate-500 text-[11px] block mt-0.5">
                              {row.roomNumber ? `Room ${row.roomNumber}${row.bedNumber ? ` (Bed ${row.bedNumber})` : ''}` : 'Room Unassigned'}
                            </span>
                            {row.hostelEnrollmentStatus === 'EXITED' && row.endDate && (
                              <span className="text-amber-700 text-[10px] block mt-0.5 font-medium">
                                Exited: {formatDate(row.endDate)}
                              </span>
                            )}
                          </td>

                          {/* Standard Rate */}
                          <td className="py-2.5 px-3 text-right">
                            <span className="font-mono font-medium text-slate-800 block">
                              ₹{Number(row.defaultFee).toLocaleString('en-IN')}
                            </span>
                            {row.previousMonthFee !== null && row.previousMonthFee !== undefined ? (
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                Prev: ₹{Number(row.previousMonthFee).toLocaleString('en-IN')}
                              </span>
                            ) : null}
                          </td>

                          {/* Applied Fee Input */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex items-center relative">
                              <span className="absolute left-2.5 text-slate-400 text-xs pointer-events-none select-none">
                                ₹
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                disabled={!row.isSelectable}
                                value={row.appliedFee}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => handleAppliedFeeChange(row.studentId, e.target.value)}
                                className={`w-28 pl-6 pr-2 py-1 text-right font-mono font-semibold text-xs rounded border transition-colors outline-none ${
                                  isWaived
                                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                                    : isReduced
                                    ? 'bg-purple-50 border-purple-300 text-purple-900'
                                    : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                                } disabled:opacity-40 disabled:bg-slate-100`}
                              />
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-2.5 px-3 text-center space-y-1">
                            {isGenerated ? (
                              <Badge variant="neutral" size="xs">
                                Billed
                              </Badge>
                            ) : isWaived ? (
                              <Badge variant="warning" size="xs">
                                Waived (₹0)
                              </Badge>
                            ) : isReduced ? (
                              <Badge variant="purple" size="xs">
                                Custom
                              </Badge>
                            ) : (
                              <Badge variant="success" size="xs">
                                Ready
                              </Badge>
                            )}
                          </td>

                          {/* Remarks */}
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              disabled={!row.isSelectable}
                              placeholder="Optional remarks..."
                              value={row.reason || ''}
                              onChange={(e) => handleReasonChange(row.studentId, e.target.value)}
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-700 bg-white focus:border-indigo-500 outline-none placeholder:text-slate-300 disabled:opacity-40"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>
                  Showing {filteredStudents.length} of {studentsList.length} residents
                </span>
                <span>
                  Total to bill: <strong className="font-mono text-slate-900">₹{totalSelectedAmount.toLocaleString('en-IN')}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 2: HOSTEL FEE RATES (MINIMALIST) ── */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'rates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Hostel Fee Rates</h3>
              <p className="text-xs text-slate-500">
                Configure standard monthly accommodation rates and one-time admission fees.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/hostel/setup')}
              icon={Plus}
              className="text-xs"
            >
              Add Building
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12 bg-white rounded-xl border border-slate-200">
              <Spinner size="lg" />
            </div>
          ) : hostels.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 space-y-2">
              <Building className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="font-medium">No hostels registered yet</div>
              <Button size="sm" onClick={() => navigate('/app/hostel/setup')}>
                Go to Rooms & Setup
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {hostels.map((h) => {
                const config = hostelFeeConfigs[h.id] || {};
                const hasMonthly = config.monthlyFeeEnabled && config.monthlyFeeAmount > 0;
                const hasAdmission = config.admissionFeeEnabled && config.admissionFeeAmount > 0;

                return (
                  <Card key={h.id} className="p-3.5 space-y-3 bg-white border border-slate-200 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{h.name}</h4>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">
                          {h.type || 'COMBINED'} HOSTEL
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleOpenFeeModal(h)}
                        icon={Edit2}
                        className="text-xs"
                      >
                        Set Rates
                      </Button>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                      <div className="flex justify-between items-center text-slate-600">
                        <span>Monthly Accommodation:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {hasMonthly ? `₹${Number(config.monthlyFeeAmount).toLocaleString('en-IN')}` : 'Not Configured'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-slate-600">
                        <span>Admission Fee:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {hasAdmission ? `₹${Number(config.admissionFeeAmount).toLocaleString('en-IN')}` : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* ── TAB 3: BILLED HISTORY (MINIMALIST) ── */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              <div className="w-56 sm:w-64 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student or adm no..."
                  value={historySearchQuery}
                  onChange={(e) => setHistorySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-7 py-1 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                />
                {historySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setHistorySearchQuery('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="w-40">
                <Select
                  value={historyMonthFilter}
                  onChange={(e) => setHistoryMonthFilter(e.target.value)}
                  className="py-1 text-xs"
                >
                  <option value="">All Months</option>
                  {orderedBillingMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="w-36">
                <Select
                  value={historyStatusFilter}
                  onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  className="py-1 text-xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PAID">PAID</option>
                  <option value="PARTIAL">PARTIAL</option>
                  <option value="UNPAID">UNPAID</option>
                </Select>
              </div>
            </div>

            <Button
              variant="ghost"
              size="xs"
              onClick={fetchFeeRecords}
              loading={recordsLoading}
              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {recordsLoading ? (
            <div className="flex justify-center p-12 bg-white rounded-xl border border-slate-200">
              <Spinner size="lg" />
            </div>
          ) : filteredFeeRecords.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
              No fee records found.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Fee Item</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFeeRecords.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {item.studentName || item.student?.name}
                          {item.student?.admissionNo && (
                            <span className="font-mono text-[10px] text-slate-400 ml-1.5 font-normal">
                              ({item.student.admissionNo})
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">{item.month}</td>
                        <td className="py-2.5 px-3 text-slate-600">{item.title}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.status === 'PAID' ? (
                            <Badge variant="green" size="xs">
                              PAID
                            </Badge>
                          ) : item.status === 'PARTIAL' ? (
                            <Badge variant="purple" size="xs">
                              PARTIAL
                            </Badge>
                          ) : (
                            <Badge variant="amber" size="xs">
                              UNPAID
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-slate-50 px-3 py-2 border-t border-slate-200 text-slate-500 text-xs">
                Total Records: {filteredFeeRecords.length}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRE-BILLING CONFIRMATION MODAL ── */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => !submitting && setIsConfirmModalOpen(false)}
        title="Confirm Fee Generation"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Generate monthly hostel dues for <strong>{billingMonth}</strong>?
          </p>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 font-medium">
            <div className="flex justify-between">
              <span className="text-slate-500">Selected Residents:</span>
              <strong className="text-slate-900">{selectedCount}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Amount:</span>
              <strong className="font-mono text-slate-900">₹{totalSelectedAmount.toLocaleString('en-IN')}</strong>
            </div>
            {waivedInSelected > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Waived (₹0):</span>
                <span className="text-amber-700 font-bold">{waivedInSelected}</span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExecuteGeneration}
              loading={submitting}
            >
              Confirm & Generate
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── SET HOSTEL FEE RATES MODAL ── */}
      <Modal
        isOpen={isFeeModalOpen}
        onClose={() => setIsFeeModalOpen(false)}
        title={`Set Rates - ${editingHostel?.name || 'Hostel'}`}
        size="md"
      >
        <form onSubmit={handleSaveHostelFeeRates} autoComplete="off" className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="font-bold text-slate-800 block text-xs">Monthly Accommodation Fee</span>
                <span className="text-slate-500 text-[11px]">Recurring monthly fee for residents</span>
              </div>
              <input
                type="checkbox"
                checked={feeFormData.monthlyFeeEnabled}
                onChange={(e) => setFeeFormData({ ...feeFormData, monthlyFeeEnabled: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
            </div>

            {feeFormData.monthlyFeeEnabled && (
              <Input
                label="Monthly Rate (₹) *"
                type="number"
                min="0"
                value={feeFormData.monthlyFeeAmount}
                onChange={(e) => setFeeFormData({ ...feeFormData, monthlyFeeAmount: e.target.value })}
                required
              />
            )}

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="font-bold text-slate-800 block text-xs">One-Time Admission Fee</span>
                <span className="text-slate-500 text-[11px]">One-time fee charged upon hostel admission</span>
              </div>
              <input
                type="checkbox"
                checked={feeFormData.admissionFeeEnabled}
                onChange={(e) => setFeeFormData({ ...feeFormData, admissionFeeEnabled: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
              />
            </div>

            {feeFormData.admissionFeeEnabled && (
              <Input
                label="Admission Rate (₹) *"
                type="number"
                min="0"
                value={feeFormData.admissionFeeAmount}
                onChange={(e) => setFeeFormData({ ...feeFormData, admissionFeeAmount: e.target.value })}
                required
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsFeeModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" loading={submitting}>
              Save Rates
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── GENERATION RESULT REPORT MODAL ── */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="Generation Complete"
        size="sm"
      >
        <div className="space-y-4 text-center">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-full inline-block">
            <Check className="w-6 h-6 mx-auto" />
          </div>

          <div className="text-xs text-slate-700 font-medium">
            Hostel fee dues for <strong>{billingMonth}</strong> generated successfully.
          </div>

          {genResult && (
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-left text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Processed:</span>
                <strong className="text-slate-900">{genResult.totalProcessed}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Created:</span>
                <strong className="text-emerald-700">{genResult.createdCount}</strong>
              </div>
              {genResult.alreadyExistsCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Billed:</span>
                  <strong className="text-slate-600">{genResult.alreadyExistsCount}</strong>
                </div>
              )}
              {genResult.waivedCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Waived (₹0):</span>
                  <strong className="text-amber-700">{genResult.waivedCount}</strong>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setShowResultModal(false);
                setActiveTab('history');
              }}
            >
              View History
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => setShowResultModal(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Student Photo Modal */}
      {selectedPhotoStudent && (
        <StudentPhotoModal
          student={selectedPhotoStudent}
          onClose={() => setSelectedPhotoStudent(null)}
        />
      )}
    </div>
  );
};
