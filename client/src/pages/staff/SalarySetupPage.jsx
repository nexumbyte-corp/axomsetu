import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { usePermission } from '../../hooks/usePermission.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StaffSubNav } from './StaffSubNav.jsx';
import { formatCurrency, getISTTodayString } from '../../utils/formatters.js';
import {
  DollarSign,
  Copy,
  Save,
  Search,
  Sparkles,
  Undo2,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Info,
  Lock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  X,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export const SalarySetupPage = () => {
  useDocumentTitle('Salary Structure Setup');
  const { can, isOwner, isSchoolAdmin } = usePermission();
  const canManageSalary = can('SALARY_MANAGE') || isOwner || isSchoolAdmin;

  const { academicYears, selectedYearId } = useAcademicYear();

  // Academic year & core state
  const [targetYearId, setTargetYearId] = useState(selectedYearId || '');
  const [academicYearInfo, setAcademicYearInfo] = useState(null);
  const [previousYearInfo, setPreviousYearInfo] = useState(null);

  // Loading & action flags
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form data
  const [effectiveFrom, setEffectiveFrom] = useState(getISTTodayString());
  const [rows, setRows] = useState([]);
  const [originalRows, setOriginalRows] = useState([]);

  // Filtering & Search
  const [search, setSearch] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals & Expanders
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [showAdvancedGuide, setShowAdvancedGuide] = useState(false);

  // Bulk revision modal parameters
  const [bulkTargetDept, setBulkTargetDept] = useState('ALL');
  const [bulkType, setBulkType] = useState('PERCENTAGE'); // 'PERCENTAGE' | 'FLAT'
  const [bulkValue, setBulkValue] = useState(8);
  const [bulkRounding, setBulkRounding] = useState(100); // 0, 100, 500

  // Alert notification
  const [message, setMessage] = useState(null); // { type: 'success' | 'error' | 'info', text: string }

  // Sync targetYearId when selectedYearId is available
  useEffect(() => {
    if (selectedYearId && !targetYearId) {
      setTargetYearId(selectedYearId);
    }
  }, [selectedYearId, targetYearId]);

  // Fetch salary setup for the selected academic year
  const fetchSalarySetup = useCallback(async () => {
    if (!targetYearId) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await staffService.getSalarySetup(targetYearId);
      const data = res.data;

      setAcademicYearInfo(data.academicYear || null);
      setPreviousYearInfo(data.previousYear || null);

      const loadedRows = (data.rows || []).map((r) => ({
        ...r,
        previousSalary: Number(r.previousSalary) || 0,
        newSalary: Number(r.newSalary) || 0,
        change: (Number(r.newSalary) || 0) - (Number(r.previousSalary) || 0),
        status: (Number(r.newSalary) || 0) === (Number(r.previousSalary) || 0) ? 'Same' : 'Changed',
      }));

      setRows(loadedRows);
      setOriginalRows(JSON.parse(JSON.stringify(loadedRows)));

      if (data.rows?.[0]?.effectiveFrom) {
        const loadedDate = new Date(data.rows[0].effectiveFrom).toISOString().split('T')[0];
        const todayStr = getISTTodayString();
        setEffectiveFrom(loadedDate < todayStr ? todayStr : loadedDate);
      } else {
        setEffectiveFrom(getISTTodayString());
      }
    } catch (err) {
      console.error('Failed to load salary setup:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load salary setup.',
      });
    } finally {
      setLoading(false);
    }
  }, [targetYearId]);

  useEffect(() => {
    fetchSalarySetup();
  }, [fetchSalarySetup]);

  // Check if any rows have been changed from their original loaded state
  const hasUnsavedChanges = useMemo(() => {
    if (rows.length !== originalRows.length) return false;
    return rows.some((row, idx) => {
      const orig = originalRows[idx];
      if (!orig) return false;
      const currentVal = Number(row.newSalary) || 0;
      const origVal = Number(orig.newSalary) || 0;
      return currentVal !== origVal;
    });
  }, [rows, originalRows]);

  // Handle salary revision for a single staff row
  const handleSalaryChange = (staffId, rawVal) => {
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (r.staffId === staffId) {
          if (rawVal === '') {
            return {
              ...r,
              newSalary: '',
              change: -r.previousSalary,
              status: r.previousSalary === 0 ? 'Same' : 'Changed',
            };
          }
          const numVal = Math.max(0, parseFloat(rawVal) || 0);
          const diff = numVal - r.previousSalary;
          return {
            ...r,
            newSalary: numVal,
            change: diff,
            status: diff === 0 ? 'Same' : 'Changed',
          };
        }
        return r;
      })
    );
  };

  // Revert a single staff member's salary back to loaded state
  const handleResetRow = (staffId) => {
    const orig = originalRows.find((r) => r.staffId === staffId);
    if (!orig) return;
    setRows((prev) =>
      prev.map((r) =>
        r.staffId === staffId
          ? {
              ...r,
              newSalary: orig.newSalary,
              change: orig.newSalary - r.previousSalary,
              status: orig.newSalary === r.previousSalary ? 'Same' : 'Changed',
            }
          : r
      )
    );
  };

  // Reset all unsaved revisions back to original
  const handleResetAll = () => {
    setRows(JSON.parse(JSON.stringify(originalRows)));
    setMessage({
      type: 'info',
      text: 'All unsaved salary revisions have been reset to current saved values.',
    });
  };

  // Copy previous academic year setup
  const handleCopyPreviousYear = async () => {
    if (!targetYearId) return;
    setCopying(true);
    setMessage(null);
    try {
      const res = await staffService.copyPreviousYearSalary(targetYearId);
      setMessage({
        type: 'success',
        text: res.message || 'Salary setup copied successfully from previous academic year!',
      });
      setIsCopyModalOpen(false);
      fetchSalarySetup();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Copying failed.',
      });
    } finally {
      setCopying(false);
    }
  };

  // Save salary setup
  const handleSaveSetup = async () => {
    if (!targetYearId) return;

    const todayStr = getISTTodayString();
    if (effectiveFrom && effectiveFrom < todayStr) {
      setMessage({
        type: 'error',
        text: 'Effective Date cannot be a back-date. Please select today or a future date.',
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payloadRows = rows.map((r) => ({
        staffId: r.staffId,
        newSalary: Math.max(0, parseFloat(r.newSalary) || 0),
        components: r.components,
      }));

      const res = await staffService.saveSalarySetup({
        academicYearId: targetYearId,
        effectiveFrom,
        rows: payloadRows,
      });

      setMessage({
        type: 'success',
        text: res.message || 'Salary structure saved successfully!',
      });
      fetchSalarySetup();
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to save salary setup.',
      });
    } finally {
      setSaving(false);
    }
  };

  // Apply bulk revision (Quick Increment tool)
  const handleApplyBulkRevision = () => {
    const val = parseFloat(bulkValue);
    if (isNaN(val) || val <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid positive increment value.' });
      return;
    }

    let affectedCount = 0;
    setRows((prevRows) =>
      prevRows.map((r) => {
        if (bulkTargetDept !== 'ALL' && (r.department || 'General') !== bulkTargetDept) {
          return r;
        }

        affectedCount++;
        const prev = r.previousSalary || 0;
        let calculated = prev;

        if (bulkType === 'PERCENTAGE') {
          calculated = prev + (prev * val) / 100;
        } else {
          calculated = prev + val;
        }

        if (bulkRounding === 500) {
          calculated = Math.round(calculated / 500) * 500;
        } else if (bulkRounding === 100) {
          calculated = Math.round(calculated / 100) * 100;
        } else {
          calculated = Math.round(calculated);
        }

        calculated = Math.max(0, calculated);
        const diff = calculated - prev;

        return {
          ...r,
          newSalary: calculated,
          change: diff,
          status: diff === 0 ? 'Same' : 'Changed',
        };
      })
    );

    setIsBulkModalOpen(false);
    setMessage({
      type: 'success',
      text: `Applied ${bulkType === 'PERCENTAGE' ? `+${val}%` : `+₹${val}`} increment to ${affectedCount} staff members. Review and click "Save Salary Setup" to apply.`,
    });
  };

  // Distinct department list
  const departmentOptions = useMemo(() => {
    const depts = new Set();
    rows.forEach((r) => {
      if (r.department) depts.add(r.department);
    });
    return [
      { value: 'ALL', label: 'All Departments' },
      ...Array.from(depts)
        .sort()
        .map((d) => ({ value: d, label: d })),
    ];
  }, [rows]);

  // Overall financial summary metrics
  const stats = useMemo(() => {
    const totalStaff = rows.length;
    let totalPrev = 0;
    let totalNew = 0;
    let changedCount = 0;

    rows.forEach((r) => {
      const prev = Number(r.previousSalary) || 0;
      const next = Number(r.newSalary) || 0;
      totalPrev += prev;
      totalNew += next;
      if (prev !== next) {
        changedCount++;
      }
    });

    const netDiff = totalNew - totalPrev;
    const pctChange = totalPrev > 0 ? ((netDiff / totalPrev) * 100).toFixed(1) : '0.0';

    return {
      totalStaff,
      totalPrev,
      totalNew,
      netDiff,
      pctChange,
      changedCount,
      unchangedCount: totalStaff - changedCount,
    };
  }, [rows]);

  // Filtered rows for display
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedDepartment !== 'ALL' && (r.department || 'General') !== selectedDepartment) {
        return false;
      }
      const isChanged = (Number(r.newSalary) || 0) !== r.previousSalary;
      if (selectedStatus === 'CHANGED' && !isChanged) return false;
      if (selectedStatus === 'SAME' && isChanged) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesName = r.name?.toLowerCase().includes(q);
        const matchesEmpId = r.employeeId?.toLowerCase().includes(q);
        const matchesDept = r.department?.toLowerCase().includes(q);
        const matchesDesig = r.designation?.toLowerCase().includes(q);
        if (!matchesName && !matchesEmpId && !matchesDept && !matchesDesig) {
          return false;
        }
      }
      return true;
    });
  }, [rows, selectedDepartment, selectedStatus, search]);

  const yearOptions = academicYears.map((y) => ({
    value: y.id,
    label: `${y.name}${y.isCurrent ? ' (Current Year)' : ''}`,
  }));

  const isLocked = Boolean(academicYearInfo?.isLocked);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <ModulePageHeader
        icon={DollarSign}
        title="Salary Structure Setup"
        description="Configure base monthly compensation and track academic year increments across all school personnel."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-48">
              <Select
                size="sm"
                value={targetYearId}
                onChange={(e) => setTargetYearId(e.target.value)}
                options={yearOptions}
                disabled={loading || saving}
              />
            </div>

            {canManageSalary && !isLocked && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Sparkles}
                  onClick={() => setIsBulkModalOpen(true)}
                  disabled={loading || saving || rows.length === 0}
                  title="Quick bulk percentage or flat salary revision"
                >
                  Quick Increment
                </Button>

                {previousYearInfo && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Copy}
                    loading={copying}
                    loadingText="Copying..."
                    onClick={() => setIsCopyModalOpen(true)}
                    disabled={loading || saving}
                    title={`Copy salary structure from ${previousYearInfo.name}`}
                  >
                    Copy Previous Year
                  </Button>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  icon={Save}
                  loading={saving}
                  loadingText="Saving..."
                  onClick={handleSaveSetup}
                  disabled={loading || isLocked}
                  className={hasUnsavedChanges ? 'ring-2 ring-indigo-500/50 shadow-md animate-pulse' : ''}
                >
                  Save Salary Setup
                </Button>
              </>
            )}
          </div>
        }
      />

      <StaffSubNav />

      {/* Locked Year Warning */}
      {isLocked && (
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-medium flex items-center gap-2.5 shadow-2xs">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            This Academic Year is marked as <strong>Locked</strong>. Salary structures are read-only and cannot be modified.
          </span>
        </div>
      )}

      {/* Alert Notification Message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 shadow-2xs ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : message.type === 'info'
              ? 'bg-sky-50 border-sky-200 text-sky-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : message.type === 'info' ? (
              <Info className="w-4 h-4 text-sky-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="p-1 rounded-md hover:bg-black/5 text-slate-500 transition-colors"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Key Financial Impact Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Staff Members</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-slate-900">{stats.totalStaff}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="text-emerald-600 font-semibold">{stats.changedCount} Revised</span>
            <span>•</span>
            <span>{stats.unchangedCount} Same</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Previous Payroll</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-slate-700">{formatCurrency(stats.totalPrev)}</p>
          <p className="mt-1 text-[11px] text-slate-500">Monthly base expenditure</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Revised Payroll</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono text-slate-900">{formatCurrency(stats.totalNew)}</p>
          <p className="mt-1 text-[11px] text-slate-500">Proposed monthly base commitment</p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Monthly Variance</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                stats.netDiff > 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : stats.netDiff < 0
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {stats.netDiff > 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : stats.netDiff < 0 ? (
                <ArrowDownRight className="w-4 h-4" />
              ) : (
                <DollarSign className="w-4 h-4" />
              )}
            </div>
          </div>
          <p
            className={`mt-2 text-2xl font-bold font-mono ${
              stats.netDiff > 0
                ? 'text-emerald-600'
                : stats.netDiff < 0
                ? 'text-rose-600'
                : 'text-slate-700'
            }`}
          >
            {stats.netDiff > 0 ? `+${formatCurrency(stats.netDiff)}` : formatCurrency(stats.netDiff)}
          </p>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            {stats.netDiff !== 0 ? (
              <Badge variant={stats.netDiff > 0 ? 'success' : 'danger'} size="sm">
                {stats.netDiff > 0 ? `+${stats.pctChange}%` : `${stats.pctChange}%`}
              </Badge>
            ) : (
              <span className="text-slate-400">No net change</span>
            )}
            <span className="text-slate-500">vs last year</span>
          </div>
        </Card>
      </div>

      {/* Control & Filter Toolbar */}
      <Card className="p-4 bg-white border border-slate-200 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Search */}
          <div className="lg:col-span-4">
            <Input
              size="sm"
              icon={Search}
              placeholder="Search by staff name, code, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              endElement={
                search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null
              }
            />
          </div>

          {/* Department Filter */}
          <div className="lg:col-span-3">
            <Select
              size="sm"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              options={departmentOptions}
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <Select
              size="sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'CHANGED', label: 'Revised Only' },
                { value: 'SAME', label: 'Unchanged Only' },
              ]}
            />
          </div>

          {/* Effective Date */}
          <div className="lg:col-span-3">
            <div className="relative">
              <DatePicker
                size="sm"
                value={effectiveFrom}
                minDate={getISTTodayString()}
                disabled={loading || isLocked || !canManageSalary}
                onChange={(val) => {
                  const todayStr = getISTTodayString();
                  if (val && val < todayStr) {
                    setMessage({
                      type: 'error',
                      text: 'Effective Date cannot be a back-date. Please select today or a future date.',
                    });
                    setEffectiveFrom(todayStr);
                  } else {
                    setMessage(null);
                    setEffectiveFrom(val || todayStr);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Status / Active Filter Bar */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span>
              Showing <strong>{filteredRows.length}</strong> of <strong>{rows.length}</strong> staff members
            </span>
            {(search || selectedDepartment !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedDepartment('ALL');
                  setSelectedStatus('ALL');
                }}
                className="text-indigo-600 hover:underline font-semibold ml-2"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="text-amber-700 font-semibold text-xs">Unsaved changes present</span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={RotateCcw}
                  onClick={handleResetAll}
                  className="text-xs h-7 px-2"
                  title="Discard unsaved edits and reset to saved data"
                >
                  Discard Edits
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Salary Revision Table */}
      <Card className="overflow-hidden shadow-2xs border border-slate-200">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-20 gap-3">
            <Spinner size="lg" />
            <p className="text-xs text-slate-500 font-medium">Loading salary structure records...</p>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Active Staff Found"
            description="There are no operationally active staff members registered in the institution for salary setup."
          />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No Matching Records"
            description="No staff members match the selected search and filter criteria."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearch('');
              setSelectedDepartment('ALL');
              setSelectedStatus('ALL');
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4 text-right">Previous Base (₹)</th>
                  <th className="py-3.5 px-4 text-right w-48">Proposed Base (₹)</th>
                  <th className="py-3.5 px-4 text-right">Net Change</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center w-16">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRows.map((r) => {
                  const orig = originalRows.find((o) => o.staffId === r.staffId);
                  const isDirtyRow = orig && (Number(orig.newSalary) || 0) !== (Number(r.newSalary) || 0);

                  return (
                    <tr
                      key={r.staffId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDirtyRow ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Staff Identity */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {r.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{r.name}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span>ID: {r.employeeId || '—'}</span>
                              <span>•</span>
                              <span className="truncate">{r.department || 'General'}</span>
                              {r.designation && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-600 font-sans font-medium truncate">
                                    {r.designation}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Previous Base Salary */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-600">
                        {formatCurrency(r.previousSalary)}
                      </td>

                      {/* New Base Salary Input */}
                      <td className="py-3 px-4 text-right">
                        <div className="relative inline-block w-full max-w-[170px]">
                          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 font-mono text-xs">
                            ₹
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="500"
                            disabled={isLocked || !canManageSalary}
                            value={r.newSalary}
                            onChange={(e) => handleSalaryChange(r.staffId, e.target.value)}
                            className="w-full pl-6 pr-2.5 py-1.5 text-xs text-right font-mono font-bold rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                          />
                        </div>
                      </td>

                      {/* Change / Variance */}
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        {r.change > 0 ? (
                          <div className="inline-flex items-center gap-1 text-emerald-600">
                            <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                            <span>+{formatCurrency(r.change)}</span>
                          </div>
                        ) : r.change < 0 ? (
                          <div className="inline-flex items-center gap-1 text-rose-600">
                            <ArrowDownRight className="w-3.5 h-3.5 shrink-0" />
                            <span>-{formatCurrency(Math.abs(r.change))}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {r.status === 'Changed' ? (
                          <Badge variant="warning" size="sm">
                            Revised
                          </Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">
                            Unchanged
                          </Badge>
                        )}
                      </td>

                      {/* Row Action (Revert) */}
                      <td className="py-3 px-4 text-center">
                        {isDirtyRow && !isLocked && canManageSalary ? (
                          <button
                            onClick={() => handleResetRow(r.staffId)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Revert to saved value"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer Totals */}
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-800">
                <tr>
                  <td className="py-3 px-4 uppercase text-[10px] tracking-wider text-slate-600">
                    Total Monthly Commitment ({filteredRows.length} staff)
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {formatCurrency(
                      filteredRows.reduce((acc, curr) => acc + (Number(curr.previousSalary) || 0), 0)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900">
                    {formatCurrency(
                      filteredRows.reduce((acc, curr) => acc + (Number(curr.newSalary) || 0), 0)
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {(() => {
                      const prevSum = filteredRows.reduce(
                        (acc, curr) => acc + (Number(curr.previousSalary) || 0),
                        0
                      );
                      const newSum = filteredRows.reduce(
                        (acc, curr) => acc + (Number(curr.newSalary) || 0),
                        0
                      );
                      const diffSum = newSum - prevSum;
                      if (diffSum > 0) {
                        return <span className="text-emerald-600">+{formatCurrency(diffSum)}</span>;
                      } else if (diffSum < 0) {
                        return <span className="text-rose-600">-{formatCurrency(Math.abs(diffSum))}</span>;
                      }
                      return <span className="text-slate-400">₹0</span>;
                    })()}
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-center text-[10px] text-slate-500 font-normal">
                    {filteredRows.filter((r) => (Number(r.newSalary) || 0) !== r.previousSalary).length} modified
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Guidance Note / Compliance Explainer */}
      <div className="pt-1">
        <button
          onClick={() => setShowAdvancedGuide(!showAdvancedGuide)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          <span>{showAdvancedGuide ? 'Hide Regulatory Structure Info' : 'How does Salary Structure work?'}</span>
          {showAdvancedGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showAdvancedGuide && (
          <Card className="mt-3 p-4 bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2.5">
            <h4 className="font-bold text-slate-800 text-sm">Salary Structure & Regulatory Guidelines</h4>
            <p className="leading-relaxed">
              In this system, school administrators set the consolidated <strong>Base Monthly Salary</strong> for each employee.
              When monthly payroll is run, standard statutory component splits (Basic, HRA, DA, Special Allowance, and Provident Fund)
              are computed automatically according to institutional policies and compliance templates.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-slate-800 block">Annual Revisions</span>
                <span className="text-slate-500">
                  Revisions apply from the specified Effective Date forward without corrupting historical payroll slips.
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-slate-800 block">Non-Destructive Rollovers</span>
                <span className="text-slate-500">
                  Using "Copy Previous Year" creates an isolated configuration for the selected year.
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="font-bold text-slate-800 block">Live Payroll Sync</span>
                <span className="text-slate-500">
                  Saving salary setup in the current active year directly synchronizes staff base earnings for subsequent months.
                </span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Copy Previous Year Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        onConfirm={handleCopyPreviousYear}
        loading={copying}
        loadingText="Copying Structure..."
        title="Copy Previous Year Salary Setup?"
        message={`This will copy base salaries from ${
          previousYearInfo?.name || 'the previous academic year'
        } into ${academicYearInfo?.name || 'the target year'}. Any unsaved modifications currently on your screen will be replaced.`}
        confirmText="Yes, Copy Salaries"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Quick Increment Tool Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Quick Salary Increment Tool"
        description="Apply a batch percentage or flat monetary increment across all or department-specific staff members."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="outline" size="sm" onClick={() => setIsBulkModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" icon={Sparkles} onClick={handleApplyBulkRevision}>
              Apply Increment
            </Button>
          </div>
        }
      >
        <div className="space-y-4 py-1 text-xs">
          {/* Target Department */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Apply To</label>
            <Select
              size="sm"
              value={bulkTargetDept}
              onChange={(e) => setBulkTargetDept(e.target.value)}
              options={departmentOptions}
            />
          </div>

          {/* Increment Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Increment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBulkType('PERCENTAGE')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-colors ${
                  bulkType === 'PERCENTAGE'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                onClick={() => setBulkType('FLAT')}
                className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-colors ${
                  bulkType === 'FLAT'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Fixed Amount (₹)
              </button>
            </div>
          </div>

          {/* Increment Value */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {bulkType === 'PERCENTAGE' ? 'Increment Percentage (%)' : 'Fixed Increment Amount (₹)'}
            </label>
            <Input
              size="sm"
              type="number"
              min="0"
              step={bulkType === 'PERCENTAGE' ? '0.5' : '500'}
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder={bulkType === 'PERCENTAGE' ? 'e.g. 8' : 'e.g. 2000'}
            />
            {bulkType === 'PERCENTAGE' && (
              <div className="flex gap-1.5 mt-2">
                {[5, 8, 10, 12, 15].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBulkValue(preset)}
                    className="py-1 px-2 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                  >
                    +{preset}%
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rounding Option */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Rounding Precision</label>
            <Select
              size="sm"
              value={String(bulkRounding)}
              onChange={(e) => setBulkRounding(Number(e.target.value))}
              options={[
                { value: '100', label: 'Round to nearest ₹100 (Recommended)' },
                { value: '500', label: 'Round to nearest ₹500' },
                { value: '0', label: 'No rounding (Exact)' },
              ]}
            />
          </div>

          {/* Preview Note */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
            <span className="font-bold">Preview: </span>
            This will calculate new salaries for{' '}
            <strong>
              {bulkTargetDept === 'ALL'
                ? `all ${rows.length} staff members`
                : `${rows.filter((r) => (r.department || 'General') === bulkTargetDept).length} staff in ${bulkTargetDept}`}
            </strong>
            . You can review and tweak any individual row before saving.
          </div>
        </div>
      </Modal>
    </div>
  );
};
