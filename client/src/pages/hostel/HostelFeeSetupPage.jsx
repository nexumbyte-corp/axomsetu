import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, CheckCircle2, Receipt, Building, Edit2, Plus, Search, Ban } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('rates'); // 'rates' | 'generate' | 'history'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [hostels, setHostels] = useState([]);
  const [hostelFeeConfigs, setHostelFeeConfigs] = useState({}); // hostelId -> config

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

  // Monthly Billing State (Automatically selected to current system month)
  const [billingMonth, setBillingMonth] = useState(() => getCurrentSystemMonth());
  const [searchQuery, setSearchQuery] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [billingError, setBillingError] = useState(null);
  const [selectedPhotoStudent, setSelectedPhotoStudent] = useState(null);

  // Result Modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [genResult, setGenResult] = useState(null);

  // History & Ledger State
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [feeRecords, setFeeRecords] = useState([]);
  const [feeSummary, setFeeSummary] = useState({
    totalCharges: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalUnpaid: 0,
  });

  useEffect(() => {
    if (currentAcademicYear) {
      setSelectedAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear]);

  const fetchHostelsAndConfigs = useCallback(async () => {
    if (!selectedAcademicYearId) return;
    try {
      setLoading(true);
      const hostelRes = await hostelService.listHostels();
      const hostelsData = hostelRes.data || [];
      setHostels(hostelsData);

      // Fetch configs for each hostel
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
          } catch {
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

  const fetchFeeRecords = useCallback(async () => {
    if (!selectedAcademicYearId) return;
    try {
      setRecordsLoading(true);
      const res = await hostelService.getReport('fees', {
        academicYearId: selectedAcademicYearId,
      });
      if (res.data) {
        setFeeRecords(res.data.charges || []);
        setFeeSummary(res.data.summary || { totalCharges: 0, totalAmount: 0, totalPaid: 0, totalUnpaid: 0 });
      }
    } catch {
      console.error('Failed loading hostel fee ledger:', err);
    } finally {
      setRecordsLoading(false);
    }
  }, [selectedAcademicYearId]);

  const fetchEligibleStudents = useCallback(async () => {
    if (!selectedAcademicYearId || !billingMonth) return;
    try {
      setStudentsLoading(true);
      setBillingError(null);
      const res = await hostelService.getEligibleStudentsForBilling({
        academicYearId: selectedAcademicYearId,
        month: billingMonth,
        hostelId: selectedHostelId || undefined,
        search: searchQuery || undefined,
      });

      if (res.data && res.data.students) {
        setStudentsList(res.data.students);
      }
    } catch {
      setStudentsList([]);
      setBillingError(err.message || 'Error loading billing candidates');
    } finally {
      setStudentsLoading(false);
    }
  }, [selectedAcademicYearId, billingMonth, selectedHostelId, searchQuery]);

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
  }, [selectedAcademicYearId, billingMonth, selectedHostelId, searchQuery, activeTab, fetchEligibleStudents]);

  // Open modal to configure rates for a specific hostel
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

      toast.success(`Fee structure updated for ${editingHostel.name}`);
      setIsFeeModalOpen(false);
      fetchHostelsAndConfigs();
    } catch {
      toast.error(err.message || 'Failed to save hostel fee rates');
    } finally {
      setSubmitting(false);
    }
  };

  // Student list row handlers in billing generator
  const handleToggleSelectAll = (checked) => {
    setStudentsList((prev) =>
      prev.map((s) => (s.isSelectable ? { ...s, isSelected: checked } : s))
    );
  };

  const handleToggleStudentSelect = (studentId) => {
    setStudentsList((prev) =>
      prev.map((s) => (s.studentId === studentId && s.isSelectable ? { ...s, isSelected: !s.isSelected } : s))
    );
  };

  const [bulkAmountInput, setBulkAmountInput] = useState('');

  // Row input handlers
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
            status: isWaived ? 'WAIVED' : (feeVal < s.defaultFee ? 'REDUCED' : 'NEW'),
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

  const handleApplyBulkAmount = () => {
    const amt = parseFloat(bulkAmountInput);
    if (isNaN(amt) || amt < 0) {
      toast.error('Please enter a valid non-negative bulk fee amount');
      return;
    }

    setStudentsList((prev) =>
      prev.map((s) => {
        if (s.isSelected && s.isSelectable) {
          const isWaived = amt === 0;
          return {
            ...s,
            appliedFee: amt,
            status: isWaived ? 'WAIVED' : (amt < s.defaultFee ? 'REDUCED' : 'NEW'),
            reason: isWaived ? (s.reason || 'Hostel Break / Waived') : s.reason,
          };
        }
        return s;
      })
    );
    toast.success(`Applied ₹${amt} to selected residents`);
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
    toast.success('Set Applied Fee = ₹0 (WAIVED) for selected residents');
  };

  const handleExecuteGeneration = async () => {
    const selectedStudents = studentsList.filter((s) => s.isSelected && s.isSelectable);

    if (selectedStudents.length === 0) {
      toast.error('Please select at least one resident to bill');
      return;
    }

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
      setShowResultModal(true);
      fetchEligibleStudents();
      fetchFeeRecords();
    } catch {
      toast.error(err.message || 'Failed to generate hostel fees');
    } finally {
      setSubmitting(false);
    }
  };

  // Billing Preview Summaries
  const selectedCount = studentsList.filter((s) => s.isSelected && s.isSelectable).length;
  const _totalBillingAmount = studentsList
    .filter((s) => s.isSelected && s.isSelectable)
    .reduce((sum, s) => sum + (s.appliedFee || 0), 0);

  const allSelectableChecked =
    studentsList.filter((s) => s.isSelectable).length > 0 &&
    studentsList.filter((s) => s.isSelectable).every((s) => s.isSelected);

  return (
    <div className="space-y-6 text-xs pb-10">
      {/* ── TOP HEADER ── */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Hostel Fee Setup & Billing Hub</h1>
              <Badge variant="indigo" size="sm">Hostel Module</Badge>
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Step 1: Create your hostel buildings and set fee rates. Step 2: Bill monthly fees to residents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="py-1.5 text-xs bg-slate-50 border-slate-200 font-semibold"
            >
              {academicYears?.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Executive Dues Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registered Hostels</span>
            <span className="text-base font-extrabold text-slate-900">{hostels.length} Buildings</span>
          </div>

          <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Total Charges Billed</span>
            <span className="text-base font-extrabold font-mono text-indigo-900">
              ₹{(feeSummary.totalAmount || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Total Dues Collected</span>
            <span className="text-base font-extrabold font-mono text-emerald-900">
              ₹{(feeSummary.totalPaid || 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-100">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Outstanding Dues</span>
            <span className="text-base font-extrabold font-mono text-amber-900">
              ₹{(feeSummary.totalUnpaid || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* ── WORKFLOW TAB NAVIGATOR ── */}
      <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveTab('rates')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'rates'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Step 1: Hostel Fee Rates</span>
        </button>

        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'generate'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Play className="w-4 h-4" />
          <span>Step 2: Generate Monthly Dues</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeTab === 'history'
              ? 'bg-white text-indigo-600 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Step 3: Billed Dues & History ({feeRecords.length})</span>
        </button>
      </div>

      {/* ── TAB 1: HOSTEL FEE RATES ── */}
      {activeTab === 'rates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-indigo-50/60 p-4 rounded-xl border border-indigo-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Hostel Building Fee Structures</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Set monthly accommodation fee and one-time admission fee rates for each created hostel building.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app/hostel/setup')}
              icon={Plus}
              className="bg-white text-xs"
            >
              Add New Hostel Building
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center p-12 bg-white rounded-xl border border-slate-200">
              <Spinner size="lg" />
            </div>
          ) : hostels.length === 0 ? (
            <Card className="p-8 text-center space-y-3 bg-slate-50 border-dashed border-2">
              <Building className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Hostels Registered Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                First create a hostel building in Hostel Rooms & Beds setup, then define monthly fee rates here.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/hostel/setup')}
                icon={Plus}
              >
                Go to Rooms & Beds Setup
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hostels.map((h) => {
                const config = hostelFeeConfigs[h.id] || {};
                const hasMonthly = config.monthlyFeeEnabled && config.monthlyFeeAmount > 0;
                const hasAdmission = config.admissionFeeEnabled && config.admissionFeeAmount > 0;

                return (
                  <Card key={h.id} className="p-4 space-y-4 hover:border-indigo-300 transition-all shadow-2xs">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                          <Building className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">{h.name}</h3>
                          <Badge variant="neutral" size="xs">{h.type || 'COMBINED'}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleOpenFeeModal(h)}
                        icon={Edit2}
                      >
                        Set Rates
                      </Button>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-600 font-medium">Monthly Fee Rate:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {hasMonthly ? `₹${Number(config.monthlyFeeAmount).toLocaleString('en-IN')} / mo` : 'Not Configured'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <span className="text-slate-600 font-medium">One-Time Admission Fee:</span>
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

      {/* ── TAB 2: GENERATE MONTHLY DUES ── */}
      {activeTab === 'generate' && (
        <div className="space-y-4">
          <Card className="p-4 space-y-3 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Monthly Hostel Resident Billing</h2>
                <p className="text-xs text-slate-500">
                  Select month and hostel building, review hostellers, apply vacation waivers if needed, and generate dues.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Billing Month:</span>
                  <Select
                    value={billingMonth}
                    onChange={(e) => setBillingMonth(e.target.value)}
                    className="py-1 text-xs font-bold text-indigo-700 bg-slate-50 w-40"
                  >
                    {orderedBillingMonths.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Hostel:</span>
                  <Select
                    value={selectedHostelId}
                    onChange={(e) => setSelectedHostelId(e.target.value)}
                    className="py-1 text-xs bg-slate-50 w-44"
                  >
                    <option value="">All Hostels</option>
                    {hostels.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </Card>

          {billingError && (
            <Alert type="error" className="py-3 text-xs">
              <Ban className="w-4 h-4 mr-2 inline shrink-0" />
              <strong>Fee Generation Blocked:</strong> {billingError}
            </Alert>
          )}

          {!billingError && (
            <Card className="p-4 space-y-3 shadow-2xs">
              {/* Toolbar: Search & Bulk Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {/* Search */}
                <div className="relative w-full lg:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search resident or adm no..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none"
                  />
                </div>

                {/* Bulk Actions Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleSelectAll(!allSelectableChecked)}
                    className="h-8 text-xs bg-white"
                  >
                    {allSelectableChecked ? 'Deselect All' : 'Select All'}
                  </Button>

                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-300">
                    <span className="text-[11px] font-bold text-slate-600 pl-1">Bulk Fee:</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="₹ Amount"
                      value={bulkAmountInput}
                      onChange={(e) => setBulkAmountInput(e.target.value)}
                      className="w-24 px-2 py-0.5 border border-slate-200 rounded text-xs font-mono outline-none"
                    />
                    <Button variant="outline" size="sm" onClick={handleApplyBulkAmount} className="h-7 text-[11px] px-2">
                      Apply
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkSetZero}
                    className="h-8 text-xs bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                  >
                    <Ban className="w-3.5 h-3.5 mr-1" />
                    Set ₹0 / Waive
                  </Button>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleExecuteGeneration}
                    loading={submitting}
                    disabled={selectedCount === 0}
                    icon={Play}
                    className="h-8 text-xs"
                  >
                    Generate Monthly Fees ({selectedCount})
                  </Button>
                </div>
              </div>

              {studentsLoading ? (
                <div className="flex justify-center p-12 bg-white rounded-xl border border-slate-200">
                  <Spinner size="lg" />
                </div>
              ) : studentsList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 italic bg-slate-50 rounded-xl border border-slate-200">
                  No eligible hostellers found for {billingMonth}.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={allSelectableChecked}
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            className="w-3.5 h-3.5 text-indigo-600 rounded"
                          />
                        </th>
                        <th className="py-2.5 px-3">Resident Details</th>
                        <th className="py-2.5 px-3">Hostel & Room</th>
                        <th className="py-2.5 px-3 text-right">Standard Fee Rate</th>
                        <th className="py-2.5 px-3 text-center">Applied Fee (Editable)</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3">Reason / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {studentsList.map((row) => {
                        const isGenerated = row.status === 'ALREADY_GENERATED';
                        const isWaived = row.status === 'WAIVED' || row.appliedFee === 0;

                        return (
                          <tr
                            key={row.studentId}
                            className={`hover:bg-slate-50 transition-colors ${
                              row.isSelected ? 'bg-indigo-50/30' : ''
                            } ${isGenerated ? 'opacity-60 bg-slate-50' : ''}`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                disabled={!row.isSelectable}
                                checked={row.isSelected}
                                onChange={() => handleToggleStudentSelect(row.studentId)}
                                className="w-3.5 h-3.5 text-indigo-600 rounded disabled:opacity-40"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              <StudentDetailsCell student={row} onPhotoClick={setSelectedPhotoStudent} />
                            </td>

                            <td className="py-2.5 px-3">
                              <span className="font-medium text-slate-800">{row.hostelName}</span>
                              <span className="text-slate-500 block text-[11px]">Room {row.roomNumber} (Bed {row.bedNumber})</span>
                              {row.hostelEnrollmentStatus === 'EXITED' && row.endDate && (
                                <span className="text-amber-700 font-semibold block text-[10px] mt-0.5">
                                  Stayed: {formatDate(row.startDate)} - {formatDate(row.endDate)}
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                              ₹{row.defaultFee.toLocaleString('en-IN')}
                            </td>

                            {/* Applied Fee Input (Editable) */}
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                disabled={!row.isSelectable}
                                value={row.appliedFee}
                                onChange={(e) => handleAppliedFeeChange(row.studentId, e.target.value)}
                                className={`w-28 text-center px-2 py-1 border rounded text-xs font-mono font-bold outline-none ${
                                  isWaived
                                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                                    : row.appliedFee < row.defaultFee
                                    ? 'bg-purple-50 border-purple-300 text-purple-800'
                                    : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-500'
                                }`}
                              />
                            </td>

                            {/* Status Badge */}
                            <td className="py-2.5 px-3 text-center space-y-1">
                              <div>
                                {isGenerated ? (
                                  <Badge variant="neutral" size="xs">ALREADY GENERATED</Badge>
                                ) : isWaived ? (
                                  <Badge variant="amber" size="xs">WAIVED (₹0)</Badge>
                                ) : row.appliedFee < row.defaultFee ? (
                                  <Badge variant="purple" size="xs font-mono">REDUCED</Badge>
                                ) : (
                                  <Badge variant="green" size="xs">READY TO BILL</Badge>
                                )}
                              </div>
                              {row.hostelEnrollmentStatus === 'EXITED' && (
                                <Badge variant="warning" size="xs font-mono" className="block mx-auto text-[10px]">
                                  EXITED IN {billingMonth}
                                </Badge>
                              )}
                            </td>

                            {/* Reason Input */}
                            <td className="py-2.5 px-3">
                              <input
                                type="text"
                                disabled={!row.isSelectable}
                                placeholder="Reason / Remarks (optional)..."
                                value={row.reason || ''}
                                onChange={(e) => handleReasonChange(row.studentId, e.target.value)}
                                className="w-full px-2 py-1 border border-slate-200 rounded text-xs text-slate-700 bg-white focus:border-indigo-500 outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ── TAB 3: BILLED DUES & LEDGER ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <Card className="p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Billed Hostel Dues & History</h2>
              <span className="text-slate-500 text-xs">Total Records: {feeRecords.length}</span>
            </div>

            {recordsLoading ? (
              <div className="flex justify-center p-12">
                <Spinner size="lg" />
              </div>
            ) : feeRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic bg-slate-50 rounded-xl border">
                No hostel fee charges billed yet.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Fee Item</th>
                      <th className="py-2.5 px-3 text-right">Amount</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {feeRecords.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.studentName || item.student?.name}</td>
                        <td className="py-2.5 px-3 font-semibold text-indigo-700">{item.month}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.title}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.status === 'PAID' ? (
                            <Badge variant="green" size="xs">PAID</Badge>
                          ) : item.status === 'PARTIAL' ? (
                            <Badge variant="purple" size="xs">PARTIAL</Badge>
                          ) : (
                            <Badge variant="amber" size="xs">UNPAID</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── SET HOSTEL FEE RATES MODAL ── */}
      <Modal
        isOpen={isFeeModalOpen}
        onClose={() => setIsFeeModalOpen(false)}
        title={`Set Fee Rates - ${editingHostel?.name || 'Hostel'}`}
        size="md"
      >
        <form onSubmit={handleSaveHostelFeeRates} className="space-y-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1">
            <h4 className="text-xs font-bold text-indigo-900">Hostel Fee Configuration Rule</h4>
            <p className="text-[11px] text-indigo-700">
              Define standard rates for this specific hostel building. Monthly fees will apply when generating monthly resident dues.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-800 block">Monthly Accommodation Fee</span>
                <span className="text-slate-500 text-[11px]">Recurring monthly fee for residents</span>
              </div>
              <input
                type="checkbox"
                checked={feeFormData.monthlyFeeEnabled}
                onChange={(e) => setFeeFormData({ ...feeFormData, monthlyFeeEnabled: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
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

            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="font-bold text-slate-800 block">One-Time Admission Fee</span>
                <span className="text-slate-500 text-[11px]">One-time fee charged upon hostel admission</span>
              </div>
              <input
                type="checkbox"
                checked={feeFormData.admissionFeeEnabled}
                onChange={(e) => setFeeFormData({ ...feeFormData, admissionFeeEnabled: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded"
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

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsFeeModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Save Hostel Fee Rates
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── GENERATION RESULT MODAL ── */}
      <Modal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
        title="Fee Generation Complete"
        size="md"
      >
        <div className="space-y-4 text-center">
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl inline-block mx-auto text-emerald-600">
            <CheckCircle2 className="w-10 h-10 mx-auto" />
          </div>

          <h3 className="text-base font-bold text-slate-900">
            Hostel Monthly Fees Generated Successfully
          </h3>

          {genResult && (
            <div className="bg-slate-50 p-3 rounded-xl border text-left text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span>Total Processed:</span>
                <strong className="font-mono text-slate-900">{genResult.totalProcessed} residents</strong>
              </div>
              <div className="flex justify-between">
                <span>New Fee Charges Billed:</span>
                <strong className="font-mono text-emerald-700">{genResult.createdCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Already Billed:</span>
                <strong className="font-mono text-slate-600">{genResult.alreadyExistsCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Waived (₹0 / Break):</span>
                <strong className="font-mono text-amber-700">{genResult.waivedCount}</strong>
              </div>
            </div>
          )}

          <Button variant="primary" className="w-full" onClick={() => setShowResultModal(false)}>
            Done
          </Button>
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
