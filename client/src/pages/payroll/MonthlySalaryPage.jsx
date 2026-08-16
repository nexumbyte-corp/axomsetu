import React, { useEffect, useState } from 'react';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Drawer } from '../../components/ui/Drawer.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StaffSubNav } from '../staff/StaffSubNav.jsx';
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
} from 'lucide-react';

const MONTH_OPTIONS = [
  { value: 'JANUARY', label: 'January' },
  { value: 'FEBRUARY', label: 'February' },
  { value: 'MARCH', label: 'March' },
  { value: 'APRIL', label: 'April' },
  { value: 'MAY', label: 'May' },
  { value: 'JUNE', label: 'June' },
  { value: 'JULY', label: 'July' },
  { value: 'AUGUST', label: 'August' },
  { value: 'SEPTEMBER', label: 'September' },
  { value: 'OCTOBER', label: 'October' },
  { value: 'NOVEMBER', label: 'November' },
  { value: 'DECEMBER', label: 'December' },
];

export const MonthlySalaryPage = () => {
  const { selectedYearId } = useAcademicYear();

  const currentMonthIdx = new Date().getMonth();
  const defaultMonth = MONTH_OPTIONS[currentMonthIdx]?.value || 'AUGUST';
  const defaultYear = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYearNum, setSelectedYearNum] = useState(defaultYear);
  const [workingDaysInput, setWorkingDaysInput] = useState('30');

  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);

  const [payrolls, setPayrolls] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [savingDrawer, setSavingDrawer] = useState(false);

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

  const fetchPayrollData = async () => {
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
        workingDays: workingDaysInput || 30,
      });

      const items = reviewRes.data.reviewItems || [];
      setReviewItems(items);

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
  };

  useEffect(() => {
    fetchPayrollData();
  }, [selectedMonth, selectedYearNum, selectedYearId, workingDaysInput]);

  const handleReviewRowChange = (staffId, field, value) => {
    setReviewItems((prevItems) =>
      prevItems.map((item) => {
        if (item.staffId !== staffId) return item;

        const updated = { ...item, [field]: value };
        const totalWDays = parseInt(workingDaysInput, 10) || 30;

        const pL = Math.max(0, parseInt(field === 'paidLeave' ? value : updated.paidLeave, 10) || 0);
        const unpaidL = Math.max(0, parseInt(field === 'unpaidLeave' ? value : updated.unpaidLeave, 10) || 0);

        const workedDays = Math.max(0, totalWDays - (pL + unpaidL));

        const dailyRate = totalWDays > 0 ? updated.baseSalary / totalWDays : 0;
        const attendanceDeduction = Math.round(dailyRate * unpaidL * 100) / 100;

        const bonus = Math.max(0, parseFloat(field === 'bonus' ? value : updated.bonus) || 0);
        const advDeduct = Math.max(0, parseFloat(field === 'advanceDeduction' ? value : updated.advanceDeduction) || 0);
        const othDeduct = Math.max(0, parseFloat(field === 'otherDeduction' ? value : updated.otherDeduction) || 0);

        const netSalary = Math.max(
          0,
          updated.baseSalary - attendanceDeduction + bonus - advDeduct - othDeduct
        );

        return {
          ...updated,
          paidLeave: pL,
          unpaidLeave: unpaidL,
          workedDays,
          attendanceDeduction,
          bonus,
          advanceDeduction: advDeduct,
          otherDeduction: othDeduct,
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

    setPreparing(true);
    setMessage(null);
    try {
      const payload = {
        academicYearId: selectedYearId,
        month: selectedMonth,
        year: selectedYearNum,
        workingDays: days,
        staffItems: reviewItems.map((st) => ({
          staffId: st.staffId,
          workedDays: st.workedDays,
          paidLeave: st.paidLeave,
          unpaidLeave: st.unpaidLeave,
          bonus: st.bonus,
          advanceDeduction: st.advanceDeduction,
          otherDeduction: st.otherDeduction,
        })),
      };

      const res = await staffService.prepareMonthlyPayroll(payload);
      setMessage({ type: 'success', text: res.message });
      setIsReviewMode(false);
      fetchPayrollData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || err.message || 'Failed to prepare salary.' });
    } finally {
      setPreparing(false);
    }
  };

  const handleOpenDrawer = (payroll) => {
    setSelectedPayroll(payroll);
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

  const paidL = Number(drawerData.paidLeave || 0);
  const unpaidL = Number(drawerData.unpaidLeave || 0);
  const autoWorked = Math.max(0, workingDays - (paidL + unpaidL));

  const dailyRate = workingDays > 0 ? baseSalary / workingDays : 0;
  const attendanceAdjust = Math.round(dailyRate * unpaidL * 100) / 100;

  const bonus = Number(drawerData.bonus || 0);
  const advDeduct = Number(drawerData.advanceDeduction || 0);
  const othDeduct = Number(drawerData.otherDeduction || 0);

  const calculatedNetSalary = Math.max(0, baseSalary - attendanceAdjust + bonus - advDeduct - othDeduct);

  const handleSaveDrawerSalary = async (e) => {
    e.preventDefault();
    if (!selectedPayroll) return;

    setSavingDrawer(true);
    try {
      await staffService.updateStaffMonthlyPayroll(selectedPayroll.id, {
        workedDays: autoWorked,
        paidLeave: paidL,
        unpaidLeave: unpaidL,
        bonus,
        advanceDeduction: advDeduct,
        otherDeduction: othDeduct,
        remarks: drawerData.remarks,
      });

      setSelectedPayroll(null);
      fetchPayrollData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update staff salary');
    } finally {
      setSavingDrawer(false);
    }
  };

  const yearNumOptions = [
    { value: defaultYear - 1, label: String(defaultYear - 1) },
    { value: defaultYear, label: String(defaultYear) },
    { value: defaultYear + 1, label: String(defaultYear + 1) },
  ];

  const reviewTotalNet = reviewItems.reduce((sum, item) => sum + Number(item.netSalary || 0), 0);
  const reviewTotalBase = reviewItems.reduce((sum, item) => sum + Number(item.baseSalary || 0), 0);

  return (
    <div className="space-y-6">
      <ModulePageHeader
        icon={CalendarCheck}
        title="Monthly Payroll Processing"
        description="Calculate monthly staff salaries, process payroll, and generate payslips."
      />

      <StaffSubNav />

      {/* Top Professional Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Monthly Salary Preparation
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-md border border-indigo-100">
              {selectedMonth} {selectedYearNum}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review base salary, leaves, auto-calculated worked days, and advance deductions.
          </p>
        </div>

        {/* Compact Controls & Summary Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-32">
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              options={MONTH_OPTIONS}
            />
          </div>

          <div className="w-24">
            <Select
              value={selectedYearNum}
              onChange={(e) => setSelectedYearNum(Number(e.target.value))}
              options={yearNumOptions}
            />
          </div>

          <div className="w-24 relative">
            <input
              type="number"
              min="1"
              max="31"
              value={workingDaysInput}
              onChange={(e) => setWorkingDaysInput(e.target.value)}
              className="w-full h-9 px-2 text-center text-xs font-bold font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
              title="Total Working Days for the Month"
            />
            <span className="text-[10px] text-slate-400 font-semibold absolute right-2 top-2.5 pointer-events-none">
              days
            </span>
          </div>

          {isReviewMode && (
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-right">
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                Net Commitment
              </span>
              <span className="text-sm font-extrabold text-emerald-700 font-mono">
                ₹{reviewTotalNet.toLocaleString('en-IN')}
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
              {isReviewMode ? 'Prepared View' : 'Re-Edit All Staff'}
            </Button>
          )}

          {isReviewMode && (
            <Button
              variant="primary"
              size="sm"
              icon={Play}
              loading={preparing}
              loadingText="Preparing..."
              onClick={handleBulkPrepareSalary}
            >
              Prepare Salary ({reviewItems.length})
            </Button>
          )}
        </div>
      </div>

      {/* Notification Message */}
      {message && (
        <div
          className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" />
        </div>
      ) : isReviewMode ? (
        /* MODE A: COMPACT PRE-PAYROLL BULK REVIEW & VERIFICATION TABLE */
        <Card className="overflow-hidden border border-slate-200 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold text-[11px] tracking-tight uppercase">
                <tr>
                  <th className="py-2.5 px-4">Staff Member</th>
                  <th className="py-2.5 px-3 text-right">Base Salary</th>
                  <th className="py-2.5 px-2 text-center w-20">Paid Leave</th>
                  <th className="py-2.5 px-2 text-center w-20">Unpaid Leave</th>
                  <th className="py-2.5 px-2 text-center w-20">Worked</th>
                  <th className="py-2.5 px-2 text-right w-24">Bonus (₹)</th>
                  <th className="py-2.5 px-2 text-right w-28">Deduct Adv. (₹)</th>
                  <th className="py-2.5 px-2 text-right w-24">Other Ded. (₹)</th>
                  <th className="py-2.5 px-4 text-right">Net Salary (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {reviewItems.map((st) => {
                  const totalWorkingDays = parseInt(workingDaysInput, 10) || 30;
                  return (
                    <tr key={st.staffId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{st.name}</p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500">
                              <span className="font-mono text-indigo-700 font-semibold">{st.employeeId}</span>
                              {st.advanceBalance > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 font-bold rounded border border-amber-200 font-mono" title={`Total Outstanding: ₹${st.advanceBalance.toLocaleString('en-IN')}`}>
                                    Avail: ₹{(st.availableAdvance ?? st.advanceBalance).toLocaleString('en-IN')}
                                  </span>
                                  {st.pendingAdvanceAllocation > 0 && (
                                    <span className="px-1 py-0.5 bg-slate-100 text-slate-600 font-semibold rounded font-mono text-[9px]" title="Allocated to other unpaid payrolls">
                                      Allocated: ₹{st.pendingAdvanceAllocation.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 text-xs">
                        ₹{st.baseSalary.toLocaleString('en-IN')}
                      </td>

                      {/* Paid Leave Input */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={totalWorkingDays}
                          value={st.paidLeave}
                          onChange={(e) => handleReviewRowChange(st.staffId, 'paidLeave', e.target.value)}
                          className="w-14 h-7 text-center font-mono text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        />
                      </td>

                      {/* Unpaid Leave Input */}
                      <td className="py-2 px-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={totalWorkingDays}
                          value={st.unpaidLeave}
                          onChange={(e) => handleReviewRowChange(st.staffId, 'unpaidLeave', e.target.value)}
                          className="w-14 h-7 text-center font-mono text-xs font-bold text-amber-700 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-amber-50/30"
                        />
                      </td>

                      {/* Worked Days: Auto-calculated Badge */}
                      <td className="py-2 px-2 text-center">
                        <span className="px-2 py-1 bg-slate-100 text-slate-800 font-mono text-xs font-bold rounded-md block">
                          {st.workedDays} <span className="text-[10px] text-slate-400 font-normal">/ {totalWorkingDays}</span>
                        </span>
                      </td>

                      {/* Bonus Input */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={st.bonus}
                          onChange={(e) => handleReviewRowChange(st.staffId, 'bonus', e.target.value)}
                          className="w-20 h-7 text-right px-1.5 font-mono text-xs text-emerald-700 font-semibold border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          placeholder="0"
                        />
                      </td>

                      {/* Deduct Adv Input */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          max={st.availableAdvance ?? st.advanceBalance}
                          value={st.advanceDeduction}
                          onChange={(e) => handleReviewRowChange(st.staffId, 'advanceDeduction', e.target.value)}
                          className="w-24 h-7 text-right px-1.5 font-mono text-xs font-bold text-amber-700 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-amber-50/20"
                          placeholder="0"
                          title={`Maximum available for allocation: ₹${(st.availableAdvance ?? st.advanceBalance).toLocaleString('en-IN')}`}
                        />
                      </td>

                      {/* Other Ded Input */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={st.otherDeduction}
                          onChange={(e) => handleReviewRowChange(st.staffId, 'otherDeduction', e.target.value)}
                          className="w-20 h-7 text-right px-1.5 font-mono text-xs text-red-600 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          placeholder="0"
                        />
                      </td>

                      <td className="py-2 px-4 text-right font-mono font-extrabold text-indigo-700 text-xs">
                        ₹{st.netSalary.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Compact Bottom Action Bar */}
          <div className="p-3 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-slate-300">
                Staff Count: <span className="font-bold text-white font-mono">{reviewItems.length}</span>
              </span>
              <span>•</span>
              <span className="font-semibold text-slate-300">
                Base Total: <span className="font-bold text-white font-mono">₹{reviewTotalBase.toLocaleString('en-IN')}</span>
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Net Salary</span>
                <span className="font-mono font-extrabold text-emerald-400 text-sm">
                  ₹{reviewTotalNet.toLocaleString('en-IN')}
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                icon={Play}
                loading={preparing}
                loadingText="Preparing..."
                onClick={handleBulkPrepareSalary}
              >
                Prepare Salary for All ({reviewItems.length})
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* MODE B: PREPARED MONTHLY SALARY TABLE */
        <div className="space-y-4">
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prepared Staff</span>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {payrolls.length} <span className="text-xs font-normal text-slate-500">employees</span>
                </p>
              </Card>

              <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Net Commitment</span>
                <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                  ₹{summary.totalNetSalary.toLocaleString('en-IN')}
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

          <Card className="overflow-hidden border border-slate-200 shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4 text-right">Base Salary (₹)</th>
                    <th className="py-3 px-4 text-center">Worked</th>
                    <th className="py-3 px-4 text-center">Paid Leave</th>
                    <th className="py-3 px-4 text-center">Unpaid Leave</th>
                    <th className="py-3 px-4 text-right">Net Salary (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {payrolls.map((p) => {
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
                                ID: {staff.employeeId} | {staff.designation || 'Staff'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-4 text-right font-mono text-slate-700 font-semibold">
                          ₹{Number(p.baseSalary).toLocaleString('en-IN')}
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
                          ₹{Number(p.netSalary).toLocaleString('en-IN')}
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
            </div>
          </Card>
        </div>
      )}

      {/* Staff Salary Drawer for Post-Preparation Individual Editing */}
      <Drawer
        isOpen={Boolean(selectedPayroll)}
        onClose={() => setSelectedPayroll(null)}
        title="Edit Individual Staff Salary & Attendance"
        position="right"
      >
        {selectedPayroll && (
          <form onSubmit={handleSaveDrawerSalary} className="space-y-4 text-xs p-1">
            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                {selectedPayroll.staff?.name?.charAt(0)}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{selectedPayroll.staff?.name}</h3>
                <p className="text-[11px] text-slate-500 font-mono">
                  {selectedPayroll.staff?.designation} | Emp Code: {selectedPayroll.staff?.employeeId}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-700">Base Monthly Salary</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
                ₹{baseSalary.toLocaleString('en-IN')}
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 space-y-3 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Attendance Breakdown
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  Total Working Days: <span className="font-mono font-bold text-slate-900">{workingDays}</span>
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
                <span className="text-slate-600 font-medium">Worked Days (Auto):</span>
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
                    ₹{Number(selectedPayroll.staff?.advanceBalance || 0).toLocaleString('en-IN')}
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
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Bonus (₹)</label>
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
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">Other Ded. (₹)</label>
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
            </div>

            <div className="border-2 border-slate-900 rounded-xl p-4 bg-slate-900 text-white space-y-2">
              <h4 className="font-bold text-xs uppercase text-slate-300 tracking-wider flex items-center gap-1.5 border-b border-slate-700 pb-2">
                <Calculator className="w-4 h-4 text-emerald-400" /> Calculation Summary
              </h4>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Base Salary</span>
                  <span className="font-mono font-bold">₹{baseSalary.toLocaleString('en-IN')}</span>
                </div>

                {unpaidL > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Attendance Adjust. ({unpaidL} unpaid leave)</span>
                    <span className="font-mono">-₹{attendanceAdjust.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {bonus > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Bonus</span>
                    <span className="font-mono">+₹{bonus.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {advDeduct > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Advance Deduction</span>
                    <span className="font-mono">-₹{advDeduct.toLocaleString('en-IN')}</span>
                  </div>
                )}

                {othDeduct > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Other Deduction</span>
                    <span className="font-mono">-₹{othDeduct.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-extrabold text-emerald-400 pt-2 border-t border-slate-700">
                  <span>NET SALARY</span>
                  <span className="font-mono">₹{calculatedNetSalary.toLocaleString('en-IN')}</span>
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
