import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Drawer } from '../../components/ui/Drawer.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StaffSubNav } from '../staff/StaffSubNav.jsx';
import { formatCurrency, getAcademicMonthOptions } from '../../utils/formatters.js';
import {
  CalendarCheck,
  Play,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Save,
  Clock,
  Eye,
  RefreshCw,
  Edit3,
  Search,
  X,
} from 'lucide-react';

/**
 * Pure calculation helper for payroll rows & drawer
 */
const calculateNetSalary = ({
  baseSalary = 0,
  workingDays = 30,
  paidLeave = 0,
  unpaidLeave = 0,
  bonus = 0,
  advanceDeduction = 0,
  otherDeduction = 0,
}) => {
  const base = Math.max(0, Number(baseSalary) || 0);
  const totalDays = Math.max(1, parseInt(workingDays, 10) || 30);
  const pL = Math.max(0, parseInt(paidLeave, 10) || 0);
  const unpaidL = Math.max(0, parseInt(unpaidLeave, 10) || 0);
  const workedDays = Math.max(0, totalDays - (pL + unpaidL));

  const dailyRate = totalDays > 0 ? base / totalDays : 0;
  const attendanceDeduction = Math.round(dailyRate * unpaidL * 100) / 100;

  const b = Math.max(0, parseFloat(bonus) || 0);
  const adv = Math.max(0, parseFloat(advanceDeduction) || 0);
  const oth = Math.max(0, parseFloat(otherDeduction) || 0);

  const netSalary = Math.max(
    0,
    Math.round((base - attendanceDeduction + b - adv - oth) * 100) / 100
  );

  return {
    workedDays,
    attendanceDeduction,
    netSalary,
  };
};

export const MonthlySalaryPage = () => {
  useDocumentTitle('Monthly Payroll Processing');
  const { selectedYearId, selectedYear } = useAcademicYear();

  const monthOptions = useMemo(() => getAcademicMonthOptions(selectedYear), [selectedYear]);

  const getCurrentMonthDefault = useCallback(() => {
    const now = new Date();
    const currentMonthName = now.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const currentYearNum = now.getFullYear();

    const matchedOpt =
      monthOptions.find((opt) => opt.value === currentMonthName && opt.year === currentYearNum) ||
      monthOptions.find((opt) => opt.value === currentMonthName) ||
      monthOptions[0];

    return {
      month: matchedOpt?.value || 'APRIL',
      year: matchedOpt?.year || currentYearNum,
    };
  }, [monthOptions]);

  const initialDefaults = getCurrentMonthDefault();

  const [selectedMonth, setSelectedMonth] = useState(initialDefaults.month);
  const [selectedYearNum, setSelectedYearNum] = useState(initialDefaults.year);
  const [workingDaysInput, setWorkingDaysInput] = useState('30');
  const workingDaysRef = useRef(workingDaysInput);
  workingDaysRef.current = workingDaysInput;

  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const lastPeriodKeyRef = useRef('');

  const [payrolls, setPayrolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [savingDrawer, setSavingDrawer] = useState(false);
  const [drawerError, setDrawerError] = useState(null);

  // Search & Filter state for Staff
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'READY' | 'PREPARED' | 'PAID'
  const [bSearchQuery, setBSearchQuery] = useState('');
  const [bStatusFilter, setBStatusFilter] = useState('ALL'); // 'ALL' | 'READY' | 'PARTIAL' | 'PAID'

  const [message, setMessage] = useState(null);

  // Staff Drawer State for post-preparation individual editing
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [drawerData, setDrawerData] = useState({
    workedDays: 30,
    paidLeave: 0,
    unpaidLeave: 0,
    bonus: 0,
    advanceDeduction: 0,
    otherDeduction: 0,
    remarks: '',
  });

  const fetchPayrollData = useCallback(async () => {
    if (!selectedMonth || !selectedYearNum || !selectedYearId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await staffService.getMonthlyPayroll({
        academicYearId: selectedYearId,
        month: selectedMonth,
        year: selectedYearNum,
      });

      const preparedPayrolls = res.data.payrolls || [];
      setPayrolls(preparedPayrolls);
      setSummary(res.data.summary);

      const reviewRes = await staffService.getSalaryPrepReviewList({
        academicYearId: selectedYearId,
        month: selectedMonth,
        year: selectedYearNum,
        workingDays: parseInt(workingDaysRef.current, 10) || 30,
      });

      const items = reviewRes.data.reviewItems || [];
      setReviewItems(items);

      const periodKey = `${selectedYearId}_${selectedMonth}_${selectedYearNum}`;
      const selectable = items.filter((st) => st.status !== 'PAID');

      if (lastPeriodKeyRef.current !== periodKey) {
        lastPeriodKeyRef.current = periodKey;
        // Default to select all selectable staff on period change or initial load
        setSelectedStaffIds(selectable.map((st) => st.staffId));
      } else {
        // Retain current selection, filtered to valid selectable items
        setSelectedStaffIds((prev) => {
          const valid = prev.filter((id) => selectable.some((st) => st.staffId === id));
          return valid;
        });
      }

      if (preparedPayrolls.length === 0) {
        setIsReviewMode(true);
      } else {
        setIsReviewMode(false);
      }
    } catch (err) {
      console.error('Failed to load monthly payroll data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYearNum, selectedYearId]);

  useEffect(() => {
    const defaults = getCurrentMonthDefault();
    setSelectedMonth(defaults.month);
    setSelectedYearNum(defaults.year);
  }, [selectedYearId, getCurrentMonthDefault]);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  // Handle Working Days changes without triggering a full screen reloading network flash
  const handleWorkingDaysChange = (newVal) => {
    setWorkingDaysInput(newVal);
    const newWorkingDays = parseInt(newVal, 10);
    if (isNaN(newWorkingDays) || newWorkingDays <= 0) return;

    setReviewItems((prevItems) =>
      prevItems.map((item) => {
        if (item.status === 'PAID') return item;

        const { workedDays, attendanceDeduction, netSalary } = calculateNetSalary({
          baseSalary: item.baseSalary,
          workingDays: newWorkingDays,
          paidLeave: item.paidLeave,
          unpaidLeave: item.unpaidLeave,
          bonus: item.bonus,
          advanceDeduction: item.advanceDeduction,
          otherDeduction: item.otherDeduction,
        });

        return {
          ...item,
          workingDays: newWorkingDays,
          workedDays,
          attendanceDeduction,
          netSalary,
        };
      })
    );
  };

  const handleReviewRowChange = (staffId, field, value) => {
    // Auto-select staff member when their inputs are updated
    setSelectedStaffIds((prev) => (prev.includes(staffId) ? prev : [...prev, staffId]));

    setReviewItems((prevItems) =>
      prevItems.map((item) => {
        if (item.staffId !== staffId) return item;

        const updated = { ...item, [field]: value };
        const totalWDays = parseInt(workingDaysInput, 10) || 30;

        // Cap advance deduction to available balance
        const maxAdv = item.availableAdvance ?? item.advanceBalance ?? 0;
        if (field === 'advanceDeduction' && Number(value) > maxAdv) {
          updated.advanceDeduction = maxAdv;
        }

        const { workedDays, attendanceDeduction, netSalary } = calculateNetSalary({
          baseSalary: updated.baseSalary,
          workingDays: totalWDays,
          paidLeave: updated.paidLeave,
          unpaidLeave: updated.unpaidLeave,
          bonus: updated.bonus,
          advanceDeduction: updated.advanceDeduction,
          otherDeduction: updated.otherDeduction,
        });

        return {
          ...updated,
          workedDays,
          attendanceDeduction,
          netSalary,
        };
      })
    );
  };

  const handleBulkPrepareSalary = async () => {
    if (!selectedYearId) {
      setMessage({ type: 'error', text: 'Please select an Academic Year.' });
      return;
    }
    const days = parseInt(workingDaysInput, 10);
    if (isNaN(days) || days <= 0) {
      setMessage({ type: 'error', text: 'Working Days must be a positive integer.' });
      return;
    }

    if (selectedStaffIds.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one staff member to prepare salary.' });
      return;
    }

    setPreparing(true);
    setMessage(null);
    try {
      const selectedStaffItems = reviewItems.filter((st) => selectedStaffIds.includes(st.staffId));

      const payload = {
        academicYearId: selectedYearId,
        month: selectedMonth,
        year: selectedYearNum,
        workingDays: days,
        selectedStaffIds,
        staffItems: selectedStaffItems.map((st) => ({
          staffId: st.staffId,
          workedDays: Number(st.workedDays) || 0,
          paidLeave: Number(st.paidLeave) || 0,
          unpaidLeave: Number(st.unpaidLeave) || 0,
          bonus: Number(st.bonus) || 0,
          advanceDeduction: Number(st.advanceDeduction) || 0,
          otherDeduction: Number(st.otherDeduction) || 0,
        })),
      };

      const res = await staffService.prepareMonthlyPayroll(payload);
      const successText = res.message || 'Monthly salary prepared successfully.';
      setMessage({ type: 'success', text: successText });
      toast.success(successText);
      setIsReviewMode(false);
      fetchPayrollData();
    } catch (err) {
      const errorText = err.response?.data?.message || err.message || 'Failed to prepare salary.';
      setMessage({ type: 'error', text: errorText });
      toast.error(errorText);
    } finally {
      setPreparing(false);
    }
  };

  const handleOpenDrawer = (payroll) => {
    setSelectedPayroll(payroll);
    setDrawerError(null);
    setDrawerData({
      workedDays: payroll.workedDays,
      paidLeave: payroll.paidLeave,
      unpaidLeave: payroll.unpaidLeave,
      bonus: Number(payroll.bonus || 0),
      advanceDeduction: Number(payroll.advanceDeduction || 0),
      otherDeduction: Number(payroll.otherDeduction || 0),
      remarks: payroll.remarks || '',
    });
  };

  const workingDays = selectedPayroll?.workingDays || 30;
  const baseSalary = Number(selectedPayroll?.baseSalary || 0);

  const {
    workedDays: autoWorked,
    attendanceDeduction: attendanceAdjust,
    netSalary: calculatedNetSalary,
  } = calculateNetSalary({
    baseSalary,
    workingDays,
    paidLeave: drawerData.paidLeave,
    unpaidLeave: drawerData.unpaidLeave,
    bonus: drawerData.bonus,
    advanceDeduction: drawerData.advanceDeduction,
    otherDeduction: drawerData.otherDeduction,
  });

  const handleSaveDrawerSalary = async (e) => {
    e.preventDefault();
    if (!selectedPayroll) return;

    setSavingDrawer(true);
    setDrawerError(null);
    try {
      await staffService.updateStaffMonthlyPayroll(selectedPayroll.id, {
        workedDays: autoWorked,
        paidLeave: Number(drawerData.paidLeave) || 0,
        unpaidLeave: Number(drawerData.unpaidLeave) || 0,
        bonus: Number(drawerData.bonus) || 0,
        advanceDeduction: Number(drawerData.advanceDeduction) || 0,
        otherDeduction: Number(drawerData.otherDeduction) || 0,
        remarks: drawerData.remarks,
      });

      toast.success('Staff salary and attendance updated successfully');
      setSelectedPayroll(null);
      fetchPayrollData();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update staff salary';
      setDrawerError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSavingDrawer(false);
    }
  };

  // Review Items Filtering (Mode A)
  const filteredReviewItems = useMemo(() => {
    return reviewItems.filter((item) => {
      // Status filter
      if (statusFilter === 'READY' && (item.isAlreadyPrepared || item.status === 'PAID')) return false;
      if (statusFilter === 'PREPARED' && (!item.isAlreadyPrepared || item.status === 'PAID')) return false;
      if (statusFilter === 'PAID' && item.status !== 'PAID') return false;

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = item.name?.toLowerCase().includes(q);
      const idMatch = item.employeeId?.toLowerCase().includes(q);
      const desigMatch = item.designation?.toLowerCase().includes(q);
      const deptMatch = item.department?.toLowerCase().includes(q);
      const roleMatch = item.role?.toLowerCase().includes(q);
      return Boolean(nameMatch || idMatch || desigMatch || deptMatch || roleMatch);
    });
  }, [reviewItems, statusFilter, searchQuery]);

  // Prepared Payrolls Filtering (Mode B)
  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((p) => {
      if (bStatusFilter === 'READY' && (p.status === 'PAID' || p.status === 'PARTIAL')) return false;
      if (bStatusFilter === 'PARTIAL' && p.status !== 'PARTIAL') return false;
      if (bStatusFilter === 'PAID' && p.status !== 'PAID') return false;

      if (!bSearchQuery.trim()) return true;
      const q = bSearchQuery.toLowerCase().trim();
      const staff = p.staff || {};
      const nameMatch = staff.name?.toLowerCase().includes(q);
      const idMatch = staff.employeeId?.toLowerCase().includes(q);
      const desigMatch = staff.designation?.toLowerCase().includes(q);
      const deptMatch = staff.department?.toLowerCase().includes(q);
      return Boolean(nameMatch || idMatch || desigMatch || deptMatch);
    });
  }, [payrolls, bStatusFilter, bSearchQuery]);

  // Selection & summary calculation helpers
  const selectableItems = useMemo(() => reviewItems.filter((item) => item.status !== 'PAID'), [reviewItems]);
  const unpreparedItems = useMemo(
    () => reviewItems.filter((item) => !item.isAlreadyPrepared && item.status !== 'PAID'),
    [reviewItems]
  );
  const preparedItems = useMemo(
    () => reviewItems.filter((item) => item.isAlreadyPrepared && item.status !== 'PAID'),
    [reviewItems]
  );
  const paidCount = useMemo(() => reviewItems.filter((item) => item.status === 'PAID').length, [reviewItems]);

  // Visible selectable items based on active search/filter in Mode A
  const visibleSelectable = useMemo(
    () => filteredReviewItems.filter((item) => item.status !== 'PAID'),
    [filteredReviewItems]
  );

  const isAllVisibleSelected =
    visibleSelectable.length > 0 &&
    visibleSelectable.every((item) => selectedStaffIds.includes(item.staffId));

  const isSomeVisibleSelected =
    visibleSelectable.some((item) => selectedStaffIds.includes(item.staffId)) && !isAllVisibleSelected;

  const handleToggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      const visibleIds = new Set(visibleSelectable.map((item) => item.staffId));
      setSelectedStaffIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const visibleIds = visibleSelectable.map((item) => item.staffId);
      setSelectedStaffIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleToggleStaff = (staffId) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const selectedItems = useMemo(
    () => reviewItems.filter((item) => selectedStaffIds.includes(item.staffId)),
    [reviewItems, selectedStaffIds]
  );
  const selectedTotalNet = useMemo(
    () => selectedItems.reduce((sum, item) => sum + Number(item.netSalary || 0), 0),
    [selectedItems]
  );

  return (
    <div className="space-y-4">
      <ModulePageHeader
        icon={CalendarCheck}
        title="Monthly Payroll Processing"
        description="Calculate monthly staff salaries, process payroll, and generate payslips."
      />

      <StaffSubNav />

      {/* Top Professional Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">
            {isReviewMode ? 'Salary Preparation' : 'Prepared Payroll'}
          </h2>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded border border-indigo-100">
            {selectedMonth} {selectedYearNum}
          </span>
        </div>

        {/* Compact Controls & Summary Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select
              size="sm"
              value={selectedMonth}
              onChange={(e) => {
                const newMonth = e.target.value;
                setSelectedMonth(newMonth);
                const opt = monthOptions.find((m) => m.value === newMonth);
                if (opt && opt.year) {
                  setSelectedYearNum(opt.year);
                }
              }}
              options={monthOptions}
            />
          </div>

          <div className="w-24 relative">
            <input
              type="number"
              min="1"
              max="31"
              value={workingDaysInput}
              onChange={(e) => handleWorkingDaysChange(e.target.value)}
              className="w-full h-8 px-2 text-center text-xs font-bold font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
              title="Working Days"
            />
            <span className="text-[10px] text-slate-400 font-semibold absolute right-2 top-2 pointer-events-none">
              days
            </span>
          </div>

          {isReviewMode && (
            <div className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                Total Net
              </span>
              <span className="text-xs font-extrabold text-emerald-700 font-mono">
                {formatCurrency(selectedTotalNet)}
              </span>
            </div>
          )}

          {payrolls.length > 0 && (
            <Button
              variant={isReviewMode ? 'secondary' : 'outline'}
              size="sm"
              icon={isReviewMode ? Eye : RefreshCw}
              onClick={() => setIsReviewMode(!isReviewMode)}
            >
              {isReviewMode ? 'Prepared View' : 'Prepare Salary'}
            </Button>
          )}

          {isReviewMode && (
            <Button
              variant="primary"
              size="sm"
              icon={Play}
              loading={preparing}
              loadingText="Preparing..."
              disabled={selectedStaffIds.length === 0}
              onClick={handleBulkPrepareSalary}
            >
              {selectedStaffIds.length === reviewItems.length && reviewItems.length > 0
                ? `Prepare All (${reviewItems.length})`
                : `Prepare (${selectedStaffIds.length})`}
            </Button>
          )}
        </div>
      </div>

      {/* Dismissible Notification Banner */}
      {message && (
        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between gap-2 transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
            title="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" />
        </div>
      ) : isReviewMode ? (
        /* MODE A: COMPACT PRE-PAYROLL BULK REVIEW & VERIFICATION TABLE */
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col">
          {/* Unified Search & Quick Filter Toolbar */}
          <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
              {/* Search Bar */}
              <div className="relative w-full sm:w-64 md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search staff by name, emp ID, role..."
                  className="w-full h-8.5 pl-9 pr-8 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({reviewItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('READY')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    statusFilter === 'READY'
                      ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ready ({unpreparedItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('PREPARED')}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    statusFilter === 'PREPARED'
                      ? 'bg-white text-amber-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Prepared ({preparedItems.length})
                </button>
                {paidCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('PAID')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      statusFilter === 'PAID'
                        ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Paid ({paidCount})
                  </button>
                )}
              </div>
            </div>

            {/* Quick Selection Actions */}
            <div className="flex items-center gap-2 text-xs shrink-0">
              {selectedStaffIds.length < selectableItems.length ? (
                <button
                  type="button"
                  onClick={() => setSelectedStaffIds(selectableItems.map((i) => i.staffId))}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 text-slate-700 rounded-md font-semibold transition-colors cursor-pointer"
                >
                  Select All
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedStaffIds([])}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 hover:text-red-600 text-slate-600 rounded-md font-medium transition-colors cursor-pointer"
                >
                  Deselect All
                </button>
              )}

              {selectedStaffIds.length > 0 && selectedStaffIds.length < selectableItems.length && (
                <button
                  type="button"
                  onClick={() => setSelectedStaffIds([])}
                  className="text-slate-400 hover:text-red-600 text-xs px-1 cursor-pointer transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Table Scroll Wrapper with Sticky Table Header */}
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-270px)] min-h-[380px] table-responsive-wrapper relative">
            {filteredReviewItems.length === 0 ? (
              <div className="py-14 px-4 text-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                  <Search className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No staff found</h3>
                {(searchQuery || statusFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('ALL');
                    }}
                    className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Clear Search & Filters
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold text-[11px] tracking-tight uppercase shadow-xs">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10 sticky top-0 z-20 bg-slate-100 border-b border-slate-200">
                      <input
                        type="checkbox"
                        checked={isAllVisibleSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeVisibleSelected;
                        }}
                        onChange={handleToggleSelectAllVisible}
                        disabled={visibleSelectable.length === 0}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                        title={isAllVisibleSelected ? 'Deselect All Visible' : 'Select All Visible'}
                      />
                    </th>
                    <th className="py-2.5 px-3 sticky top-0 z-20 bg-slate-100 border-b border-slate-200">Staff</th>
                    <th className="py-2.5 px-2 text-center w-20 sticky top-0 z-20 bg-slate-100 border-b border-slate-200">Status</th>
                    <th className="py-2.5 px-3 text-right sticky top-0 z-20 bg-slate-100 border-b border-slate-200">Base</th>
                    <th className="py-2.5 px-2 text-center w-20 sticky top-0 z-20 bg-slate-100 border-b border-slate-200">Paid Leave</th>
                    <th className="py-2.5 px-2 text-center w-20 sticky top-0 z-20 bg-slate-100 border-b border-slate-200">Unpaid Leave</th>
                    <th className="py-2.5 px-2 text-center w-16 sticky top-0 z-20 bg-slate-100 border-b border-slate-200">Worked</th>
                    <th className="py-2.5 px-2 text-right w-24 sticky top-0 z-20 bg-slate-100 border-b border-slate-200">Bonus</th>
                    <th className="py-2.5 px-2 text-right w-24 sticky top-0 z-20 bg-slate-100 border-b border-slate-200">Adv. Ded</th>
                    <th className="py-2.5 px-2 text-right w-24 sticky top-0 z-20 bg-slate-100 border-b border-slate-200">Other Ded</th>
                    <th className="py-2.5 px-4 text-right sticky top-0 z-20 bg-slate-100 border-b border-slate-200">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredReviewItems.map((st) => {
                    const totalWorkingDays = parseInt(workingDaysInput, 10) || 30;
                    const isSelected = selectedStaffIds.includes(st.staffId);
                    const isPaid = st.status === 'PAID';
                    const isRowDisabled = isPaid || !isSelected;

                    return (
                      <tr
                        key={st.staffId}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/40 hover:bg-indigo-50/60'
                            : 'bg-slate-50/40 opacity-55 hover:bg-slate-100/40'
                        } ${isPaid ? 'opacity-40 bg-slate-50/70' : ''}`}
                      >
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isPaid}
                            onChange={() => handleToggleStaff(st.staffId)}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-40"
                            title={isPaid ? 'Already paid' : isSelected ? 'Deselect (Disables staff editing)' : 'Select to enable editing & prepare salary'}
                          />
                        </td>

                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                                isSelected ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-200 text-slate-500'
                              }`}
                            >
                              {st.name?.charAt(0)}
                            </div>
                            <div>
                              <p className={`text-xs ${isSelected ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                                {st.name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span className={`font-mono font-semibold ${isSelected ? 'text-indigo-700' : 'text-slate-400'}`}>
                                  {st.employeeId}
                                </span>
                                {st.designation && <span className="text-slate-400">• {st.designation}</span>}
                                {st.advanceBalance > 0 && (
                                  <span
                                    className={`px-1.5 py-0.5 font-bold rounded border font-mono ${
                                      isSelected
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-slate-100 text-slate-400 border-slate-200'
                                    }`}
                                    title={`Outstanding: ${formatCurrency(st.advanceBalance)}${
                                      st.pendingAdvanceAllocation > 0 ? ` (Allocated: ${formatCurrency(st.pendingAdvanceAllocation)})` : ''
                                    }`}
                                  >
                                    Adv: {formatCurrency(st.availableAdvance ?? st.advanceBalance)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Status Column */}
                        <td className="py-2 px-2 text-center">
                          {st.status === 'PAID' ? (
                            <Badge variant="success" size="sm">Paid</Badge>
                          ) : st.isAlreadyPrepared ? (
                            <Badge variant="warning" size="sm">Prepared</Badge>
                          ) : (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              isSelected ? 'bg-slate-100 text-slate-600' : 'bg-slate-100/60 text-slate-400'
                            }`}>
                              Ready
                            </span>
                          )}
                        </td>

                        <td className={`py-2 px-3 text-right font-mono text-xs ${
                          isSelected ? 'font-bold text-slate-800' : 'text-slate-400'
                        }`}>
                          {formatCurrency(st.baseSalary)}
                        </td>

                        {/* Paid Leave Input */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max={totalWorkingDays}
                            value={st.paidLeave}
                            disabled={isRowDisabled}
                            onChange={(e) => handleReviewRowChange(st.staffId, 'paidLeave', e.target.value)}
                            className="w-14 h-7 text-center font-mono text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            title={isPaid ? 'Already paid' : !isSelected ? 'Select staff member to edit' : ''}
                          />
                        </td>

                        {/* Unpaid Leave Input */}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max={totalWorkingDays}
                            value={st.unpaidLeave}
                            disabled={isRowDisabled}
                            onChange={(e) => handleReviewRowChange(st.staffId, 'unpaidLeave', e.target.value)}
                            className="w-14 h-7 text-center font-mono text-xs font-bold text-amber-700 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-amber-50/30 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            title={isPaid ? 'Already paid' : !isSelected ? 'Select staff member to edit' : ''}
                          />
                        </td>

                        {/* Worked Days: Auto-calculated Badge */}
                        <td className="py-2 px-2 text-center">
                          <span className={`px-2 py-1 font-mono text-xs font-bold rounded-md block ${
                            isSelected ? 'bg-slate-100 text-slate-800' : 'bg-slate-100/60 text-slate-400'
                          }`}>
                            {st.workedDays}
                          </span>
                        </td>

                        {/* Bonus Input */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={st.bonus}
                            disabled={isRowDisabled}
                            onChange={(e) => handleReviewRowChange(st.staffId, 'bonus', e.target.value)}
                            className="w-20 h-7 text-right px-1.5 font-mono text-xs text-emerald-700 font-semibold border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            placeholder="0"
                            title={isPaid ? 'Already paid' : !isSelected ? 'Select staff member to edit' : ''}
                          />
                        </td>

                        {/* Deduct Adv Input */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            max={st.availableAdvance ?? st.advanceBalance}
                            value={st.advanceDeduction}
                            disabled={isRowDisabled}
                            onChange={(e) => handleReviewRowChange(st.staffId, 'advanceDeduction', e.target.value)}
                            className="w-24 h-7 text-right px-1.5 font-mono text-xs font-bold text-amber-700 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-amber-50/20 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            placeholder="0"
                            title={isPaid ? 'Already paid' : !isSelected ? 'Select staff member to edit' : `Maximum available for allocation: ${formatCurrency(st.availableAdvance ?? st.advanceBalance)}`}
                          />
                        </td>

                        {/* Other Ded Input */}
                        <td className="py-2 px-2 text-right">
                          <input
                            type="number"
                            min="0"
                            value={st.otherDeduction}
                            disabled={isRowDisabled}
                            onChange={(e) => handleReviewRowChange(st.staffId, 'otherDeduction', e.target.value)}
                            className="w-20 h-7 text-right px-1.5 font-mono text-xs text-red-600 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                            placeholder="0"
                            title={isPaid ? 'Already paid' : !isSelected ? 'Select staff member to edit' : ''}
                          />
                        </td>

                        <td className={`py-2 px-4 text-right font-mono text-xs ${
                          isSelected ? 'font-extrabold text-indigo-700' : 'font-medium text-slate-400'
                        }`}>
                          {formatCurrency(st.netSalary)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Bottom Action Bar */}
          <div className="p-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-300">
                <span className="font-bold text-white font-mono">{selectedStaffIds.length}</span> of {reviewItems.length} selected
              </span>
              {selectableItems.length > selectedStaffIds.length && (
                <button
                  type="button"
                  onClick={() => setSelectedStaffIds(selectableItems.map((i) => i.staffId))}
                  className="text-indigo-300 hover:text-white underline cursor-pointer font-medium ml-2 transition-colors"
                >
                  Select All
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                  Net Amount
                </span>
                <span className="font-mono font-extrabold text-emerald-400 text-sm">
                  {formatCurrency(selectedTotalNet)}
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={Play}
                loading={preparing}
                loadingText="Preparing..."
                disabled={selectedStaffIds.length === 0}
                onClick={handleBulkPrepareSalary}
              >
                {selectedStaffIds.length === reviewItems.length && reviewItems.length > 0
                  ? `Prepare All (${reviewItems.length})`
                  : `Prepare (${selectedStaffIds.length})`}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* MODE B: PREPARED MONTHLY SALARY TABLE */
        <div className="space-y-4">
          {reviewItems.length > payrolls.length && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-xs font-semibold text-amber-900">
                  {payrolls.length} of {reviewItems.length} staff prepared ({reviewItems.length - payrolls.length} remaining)
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={Play}
                onClick={() => {
                  const unpreparedIds = reviewItems
                    .filter((st) => !st.isAlreadyPrepared && st.status !== 'PAID')
                    .map((st) => st.staffId);
                  if (unpreparedIds.length > 0) {
                    setSelectedStaffIds(unpreparedIds);
                  }
                  setIsReviewMode(true);
                }}
              >
                Prepare Remaining ({reviewItems.length - payrolls.length})
              </Button>
            </div>
          )}

          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prepared Staff</span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {payrolls.length} <span className="text-xs font-normal text-slate-500">/ {reviewItems.length} eligible</span>
                </p>
              </Card>

              <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Net Commitment</span>
                <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                  {formatCurrency(summary.totalNetSalary)}
                </p>
              </Card>

              <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Summary</span>
                <div className="flex items-center gap-2 mt-1 text-xs font-bold">
                  <Badge variant="warning">{summary.unpaidCount} Ready</Badge>
                  {summary.partialCount > 0 && <Badge variant="neutral">{summary.partialCount} Partial</Badge>}
                  {summary.paidCount > 0 && <Badge variant="success">{summary.paidCount} Paid</Badge>}
                </div>
              </Card>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden flex flex-col">
            {/* Search & Filter Toolbar for Mode B */}
            <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                <div className="relative w-full sm:w-64 md:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={bSearchQuery}
                    onChange={(e) => setBSearchQuery(e.target.value)}
                    placeholder="Search prepared staff..."
                    className="w-full h-8.5 pl-9 pr-8 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800"
                  />
                  {bSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setBStatusFilter('ALL')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      bStatusFilter === 'ALL'
                        ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({payrolls.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBStatusFilter('READY')}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      bStatusFilter === 'READY'
                        ? 'bg-white text-amber-700 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ready ({payrolls.filter((p) => p.status !== 'PAID' && p.status !== 'PARTIAL').length})
                  </button>
                  {payrolls.some((p) => p.status === 'PARTIAL') && (
                    <button
                      type="button"
                      onClick={() => setBStatusFilter('PARTIAL')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        bStatusFilter === 'PARTIAL'
                          ? 'bg-white text-blue-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Partial ({payrolls.filter((p) => p.status === 'PARTIAL').length})
                    </button>
                  )}
                  {payrolls.some((p) => p.status === 'PAID') && (
                    <button
                      type="button"
                      onClick={() => setBStatusFilter('PAID')}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        bStatusFilter === 'PAID'
                          ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Paid ({payrolls.filter((p) => p.status === 'PAID').length})
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table Scroll Area with Sticky Header */}
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] min-h-[380px] table-responsive-wrapper relative">
              {filteredPayrolls.length === 0 ? (
                <div className="py-14 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">No staff found</h3>
                  {(bSearchQuery || bStatusFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setBSearchQuery('');
                        setBStatusFilter('ALL');
                      }}
                      className="mt-3 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Clear Search & Filters
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-20 bg-slate-50 text-slate-600 uppercase font-bold text-[10px] tracking-wider shadow-xs">
                    <tr>
                      <th className="py-3 px-4 sticky top-0 z-20 bg-slate-50 border-b border-slate-200">Staff</th>
                      <th className="py-3 px-4 text-right sticky top-0 z-20 bg-slate-50 border-b border-slate-200">Base</th>
                      <th className="py-3 px-4 text-center sticky top-0 z-20 bg-slate-50 border-b border-slate-200">Worked</th>
                      <th className="py-3 px-4 text-center sticky top-0 z-20 bg-slate-50 border-b border-slate-200">Paid Leave</th>
                      <th className="py-3 px-4 text-center sticky top-0 z-20 bg-slate-50 border-b border-slate-200">Unpaid Leave</th>
                      <th className="py-3 px-4 text-right sticky top-0 z-20 bg-slate-50 border-b border-slate-200">Net</th>
                      <th className="py-3 px-4 text-center sticky top-0 z-20 bg-slate-50 border-b border-slate-200">Status</th>
                      <th className="py-3 px-4 text-center sticky top-0 z-20 bg-slate-50 border-b border-slate-200">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPayrolls.map((p) => {
                      const staff = p.staff || {};
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                {staff.name?.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{staff.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono">
                                  {staff.employeeId}{staff.designation ? ` • ${staff.designation}` : ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-4 text-right font-mono text-slate-700 font-semibold">
                            {formatCurrency(p.baseSalary)}
                          </td>

                          <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-800">
                            {p.workedDays}
                          </td>

                          <td className="py-2.5 px-4 text-center font-mono text-slate-600">
                            {p.paidLeave}
                          </td>

                          <td className="py-2.5 px-4 text-center font-mono text-amber-700">
                            {p.unpaidLeave}
                          </td>

                          <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                            {formatCurrency(p.netSalary)}
                          </td>

                          <td className="py-2.5 px-4 text-center">
                            {p.status === 'PAID' ? (
                              <Badge variant="success" size="sm">PAID</Badge>
                            ) : p.status === 'PARTIAL' ? (
                              <Badge variant="neutral" size="sm">PARTIAL</Badge>
                            ) : (
                              <Badge variant="warning" size="sm">Ready</Badge>
                            )}
                          </td>

                          <td className="py-2.5 px-4 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={Edit3}
                              onClick={() => handleOpenDrawer(p)}
                              disabled={p.status === 'PAID'}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Staff Salary Drawer */}
      <Drawer
        isOpen={Boolean(selectedPayroll)}
        onClose={() => setSelectedPayroll(null)}
        title="Edit Staff Salary"
        position="right"
      >
        {selectedPayroll && (
          <form onSubmit={handleSaveDrawerSalary} autoComplete="off" className="space-y-4 text-xs p-1">
            {drawerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{drawerError}</span>
              </div>
            )}

            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                {selectedPayroll.staff?.name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{selectedPayroll.staff?.name}</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {selectedPayroll.staff?.employeeId}{selectedPayroll.staff?.designation ? ` • ${selectedPayroll.staff?.designation}` : ''}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-700">Base Monthly Salary</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
                {formatCurrency(baseSalary)}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Attendance Breakdown
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Working Days: <span className="font-mono font-bold text-slate-900">{workingDays}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Paid Leave</label>
                  <input
                    type="number"
                    min="0"
                    max={workingDays}
                    value={drawerData.paidLeave}
                    onChange={(e) => setDrawerData((prev) => ({ ...prev, paidLeave: e.target.value }))}
                    className="w-full h-8 px-2 border border-slate-200 rounded-md text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Unpaid Leave</label>
                  <input
                    type="number"
                    min="0"
                    max={workingDays}
                    value={drawerData.unpaidLeave}
                    onChange={(e) => setDrawerData((prev) => ({ ...prev, unpaidLeave: e.target.value }))}
                    className="w-full h-8 px-2 border border-slate-200 rounded-md text-xs font-mono font-bold text-amber-700"
                    required
                  />
                </div>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Worked Days:</span>
                <span className="font-mono font-bold text-slate-900">{autoWorked}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-white">
              <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block border-b border-slate-100 pb-2">
                Adjustments & Deductions
              </span>

              <div className="p-2.5 bg-amber-50/60 rounded-lg border border-amber-100 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-amber-900">Outstanding Staff Advance</span>
                  <span className="font-mono font-bold text-amber-800">
                    {formatCurrency(selectedPayroll.staff?.advanceBalance || 0)}
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={Number(selectedPayroll.staff?.advanceBalance || 0)}
                  value={drawerData.advanceDeduction}
                  onChange={(e) => setDrawerData((prev) => ({ ...prev, advanceDeduction: e.target.value }))}
                  className="w-full h-8 px-2 border border-slate-200 rounded-md text-xs font-mono font-bold text-amber-700"
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Bonus</label>
                  <input
                    type="number"
                    min="0"
                    value={drawerData.bonus}
                    onChange={(e) => setDrawerData((prev) => ({ ...prev, bonus: e.target.value }))}
                    className="w-full h-8 px-2 border border-slate-200 rounded-md text-xs font-mono"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Other Ded.</label>
                  <input
                    type="number"
                    min="0"
                    value={drawerData.otherDeduction}
                    onChange={(e) => setDrawerData((prev) => ({ ...prev, otherDeduction: e.target.value }))}
                    className="w-full h-8 px-2 border border-slate-200 rounded-md text-xs font-mono"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-700 block">Remarks / Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={drawerData.remarks}
                  onChange={(e) => setDrawerData((prev) => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Add any specific notes or adjustment reasons..."
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="border-2 border-slate-900 rounded-xl p-4 bg-slate-900 text-white space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-300 tracking-wider flex items-center gap-1.5 border-b border-slate-700 pb-2">
                <Calculator className="w-4 h-4 text-emerald-400" /> Calculation Summary
              </h4>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Base Salary</span>
                  <span className="font-mono font-bold">{formatCurrency(baseSalary)}</span>
                </div>

                {drawerData.unpaidLeave > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Attendance Adjust. ({drawerData.unpaidLeave} unpaid leave)</span>
                    <span className="font-mono">-{formatCurrency(attendanceAdjust)}</span>
                  </div>
                )}

                {drawerData.bonus > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Bonus</span>
                    <span className="font-mono">+{formatCurrency(drawerData.bonus)}</span>
                  </div>
                )}

                {drawerData.advanceDeduction > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Advance Deduction</span>
                    <span className="font-mono">-{formatCurrency(drawerData.advanceDeduction)}</span>
                  </div>
                )}

                {drawerData.otherDeduction > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Other Deduction</span>
                    <span className="font-mono">-{formatCurrency(drawerData.otherDeduction)}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-extrabold text-emerald-400 pt-2 border-t border-slate-700">
                  <span>NET SALARY</span>
                  <span className="font-mono">{formatCurrency(calculatedNetSalary)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setSelectedPayroll(null)} disabled={savingDrawer}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={Save}
                loading={savingDrawer}
                loadingText="Saving..."
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
};
