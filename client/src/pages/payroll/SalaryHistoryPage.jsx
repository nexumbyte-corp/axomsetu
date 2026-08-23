import React, { useEffect, useState } from 'react';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Input } from '../../components/ui/Input.jsx';

import { Spinner } from '../../components/ui/Spinner.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StaffSubNav } from '../staff/StaffSubNav.jsx';
import { buildSalarySlipData } from '../../core/documents/documentTemplates/salarySlip.js';
import { downloadPdfDocument, printPdfDocument } from '../../core/documents/documentEngine.js';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';
import { formatDate, getAcademicMonthOptions } from '../../utils/formatters.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { toast } from '../../components/ui/Toast.jsx';
import { History, FileText, Download, Printer, Search, User, CreditCard } from 'lucide-react';

export const SalaryHistoryPage = () => {
  const { selectedYear: academicYearObj } = useAcademicYear();
  const monthOptions = getAcademicMonthOptions(academicYearObj);

  const [activeTab, setActiveTab] = useState('history'); // 'history' | 'slips'

  // Payment History State
  const [payments, setPayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historySearch, setHistorySearch] = useState('');
  const [page, _setPage] = useState(1);

  // Salary Slips Generator State
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [rangeType, setRangeType] = useState('SINGLE_MONTH'); // 'SINGLE_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'CUSTOM_RANGE'

  const currentYear = new Date().getFullYear();
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || 'APRIL');
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [startMonth, setStartMonth] = useState('APRIL');
  const [startYear, setStartYear] = useState(currentYear);
  const [endMonth, setEndMonth] = useState('SEPTEMBER');
  const [endYear, setEndYear] = useState(currentYear);

  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [slipPayload, setSlipPayload] = useState(null);
  const [slipError, setSlipError] = useState('');

  const fetchPaymentHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await staffService.getSalaryPaymentHistory({
        search: historySearch,
        page,
        limit: 20,
      });
      setPayments(res.data.payments || []);
    } catch (err) {
      console.error('Failed to load salary payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchStaffList = async () => {
    try {
      const res = await staffService.getStaffList({ limit: 200, status: 'ACTIVE' });
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  };

  useEffect(() => {
    fetchPaymentHistory();
  }, [historySearch, page]);

  useEffect(() => {
    fetchStaffList();
  }, []);

  // Download voucher PDF
  const handleDownloadVoucher = async (paymentId, paymentNo) => {
    try {
      const res = await staffService.getSalaryPaymentReceiptData(paymentId);
      await downloadPdfDocument({
        templateId: 'salary',
        data: res.data,
        filename: `SalaryVoucher_${paymentNo}.pdf`,
      });
      toast.success(`Downloaded voucher ${paymentNo}`);
    } catch (err) {
      console.error('Failed to download voucher PDF:', err);
      toast.error('Failed to download PDF voucher.');
    }
  };

  // Print voucher PDF
  const handlePrintVoucher = async (paymentId) => {
    try {
      const res = await staffService.getSalaryPaymentReceiptData(paymentId);
      await printPdfDocument({
        templateId: 'salary',
        data: res.data,
      });
    } catch (err) {
      console.error('Failed to print voucher:', err);
      toast.error('Failed to print PDF voucher.');
    }
  };

  // Generate Slip Payload
  const handleGenerateSlipPayload = async (e) => {
    if (e) e.preventDefault();
    if (!selectedStaffId) {
      setSlipError('Please select an employee.');
      return;
    }

    setGeneratingPdf(true);
    setSlipError('');
    setSlipPayload(null);

    try {
      const res = await staffService.getEmployeeSalarySlipPayload({
        staffId: selectedStaffId,
        rangeType,
        month: selectedMonth,
        year: selectedYear,
        startMonth,
        startYear,
        endMonth,
        endYear,
      });

      const formattedPayload = buildSalarySlipData(res.data);
      setSlipPayload(formattedPayload);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'No prepared salary slip found for the selected period.';
      setSlipError(errorMsg);
      setSlipPayload(null);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const staffSelectOptions = staffList.map((st) => ({
    value: st.id,
    label: `${st.name} (${st.employeeId}) — ${st.department || 'Staff'}`,
  }));

  const yearOptions = [
    { value: currentYear - 1, label: String(currentYear - 1) },
    { value: currentYear, label: String(currentYear) },
    { value: currentYear + 1, label: String(currentYear + 1) },
  ];

  return (
    <div className="space-y-6">
      <ModulePageHeader
        icon={History}
        title="Salary History & Slips"
        description="Review past payroll processing records and download historical salary slips."
        actions={
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTab === 'history'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <CreditCard className="w-3.5 h-3.5" /> Voucher History
            </button>

            <button
              onClick={() => setActiveTab('slips')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTab === 'slips'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <FileText className="w-3.5 h-3.5" /> Salary Slips
            </button>
          </div>
        }
      />

      <StaffSubNav />

      {/* TAB 1: PAYMENT VOUCHER HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
            <Input
              placeholder="Search by Voucher No (e.g. PAY-2026-001) or Staff Name..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              icon={Search}
            />
          </Card>

          <Card className="overflow-hidden shadow-2xs">
            {loadingHistory ? (
              <div className="flex justify-center items-center py-16">
                <Spinner size="lg" />
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                No payment voucher logs found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Voucher No</th>
                      <th className="py-3.5 px-4">Payment Date</th>
                      <th className="py-3.5 px-4">Staff Member</th>
                      <th className="py-3.5 px-4">Months Settled</th>
                      <th className="py-3.5 px-4">Mode & Ref</th>
                      <th className="py-3.5 px-4 text-right">Adv. Adjustment (₹)</th>
                      <th className="py-3.5 px-4 text-right">Net Amount Paid (₹)</th>
                      <th className="py-3.5 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {payments.map((p) => {
                      const staff = p.staff || {};
                      const advAdjustment = Number(
                        p.advanceDeducted ||
                        p.advanceDeduction ||
                        p.advanceRecovery ||
                        p.advanceAdjusted ||
                        p.advanceAmount ||
                        0
                      );
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                            {p.paymentNumber}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-600">
                            {formatDate(p.paymentDate)}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-slate-400 shrink-0" />
                              <div>
                                <p className="font-bold text-slate-900">{staff.name}</p>
                                <p className="text-[10px] text-slate-500 font-mono">ID: {staff.employeeId}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded text-[11px] font-bold font-mono">
                              {Array.isArray(p.months) ? p.months.join(', ') : p.months}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-800">{p.paymentMode}</span>
                            {p.referenceNo && (
                              <span className="text-[10px] text-slate-500 font-mono block">Ref: {p.referenceNo}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-700">
                            {advAdjustment > 0 ? (
                              `- ₹${advAdjustment.toLocaleString('en-IN')}`
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-600 text-sm">
                            ₹{Number(p.netSalary || 0).toLocaleString('en-IN')}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                title="Print Salary Voucher"
                                aria-label="Print Salary Voucher"
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors"
                                onClick={() => handlePrintVoucher(p.id)}
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Download PDF Voucher"
                                aria-label="Download PDF Voucher"
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:text-indigo-600 text-slate-600 shadow-2xs transition-colors"
                                onClick={() => handleDownloadVoucher(p.id, p.paymentNumber)}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: SALARY SLIPS GENERATOR & PDF DOWNLOAD */}
      {activeTab === 'slips' && (
        <div className="space-y-6">
          <Card className="p-5 bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3">
              Configure Salary Slip Options
            </h3>

            {slipError && <Alert type="danger">{slipError}</Alert>}

            <form onSubmit={handleGenerateSlipPayload} autoComplete="off" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Select Employee *"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  options={[{ value: '', label: '-- Select Employee --' }, ...staffSelectOptions]}
                  required
                />

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 block">
                    Slip Period / Range *
                  </label>
                  <Select
                    value={rangeType}
                    onChange={(e) => setRangeType(e.target.value)}
                    options={[
                      { value: 'SINGLE_MONTH', label: 'Single Month' },
                      { value: 'LAST_3_MONTHS', label: 'Last 3 Months (Consolidated)' },
                      { value: 'LAST_6_MONTHS', label: 'Last 6 Months (Consolidated)' },
                      { value: 'CUSTOM_RANGE', label: 'Custom Month Range' },
                    ]}
                  />
                </div>
              </div>

              {/* Conditional Range Selectors */}
              {rangeType === 'SINGLE_MONTH' && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <Select
                    label="Month *"
                    value={selectedMonth}
                    onChange={(e) => {
                      const newMonth = e.target.value;
                      setSelectedMonth(newMonth);
                      const opt = monthOptions.find((m) => m.value === newMonth);
                      if (opt && opt.year) {
                        setSelectedYear(opt.year);
                      }
                    }}
                    options={monthOptions}
                  />
                </div>
              )}

              {rangeType === 'CUSTOM_RANGE' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <Select
                    label="Start Month *"
                    value={startMonth}
                    onChange={(e) => {
                      const newMonth = e.target.value;
                      setStartMonth(newMonth);
                      const opt = monthOptions.find((m) => m.value === newMonth);
                      if (opt && opt.year) {
                        setStartYear(opt.year);
                      }
                    }}
                    options={monthOptions}
                  />

                  <Select
                    label="End Month *"
                    value={endMonth}
                    onChange={(e) => {
                      const newMonth = e.target.value;
                      setEndMonth(newMonth);
                      const opt = monthOptions.find((m) => m.value === newMonth);
                      if (opt && opt.year) {
                        setEndYear(opt.year);
                      }
                    }}
                    options={monthOptions}
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  icon={FileText}
                  loading={generatingPdf}
                  loadingText="Generating Slip..."
                  disabled={!selectedStaffId}
                >
                  Generate Salary Slip
                </Button>
              </div>
            </form>
          </Card>

          {/* Generated Slip Preview & Actions Card */}
          {slipPayload && (
            <Card className="p-6 bg-white border-2 border-indigo-600 shadow-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider block">
                    Salary Slip Ready
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">{slipPayload.title}</h3>
                  <p className="text-xs text-slate-500">
                    Staff: <span className="font-bold text-slate-900">{slipPayload.staffName}</span> ({slipPayload.employeeId})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <DocumentActions
                    templateId="salarySlip"
                    data={slipPayload}
                    filename={`SalarySlip_${slipPayload.staffName?.replace(/\s+/g, '_') || 'Employee'}.pdf`}
                    title={`Salary Slip - ${slipPayload.staffName}`}
                  />
                </div>
              </div>

              {/* Summary Table Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Period</th>
                      <th className="p-3 text-right">Base Salary (Original)</th>
                      <th className="p-3 text-center">Worked</th>
                      <th className="p-3 text-right">Attendance Ded.</th>
                      <th className="p-3 text-right">Bonus</th>
                      <th className="p-3 text-right">Adv. Adjustment</th>
                      <th className="p-3 text-right">Net Salary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {(slipPayload.payrolls || []).map((p) => {
                      const pAdvDeduct = Number(p.advanceDeduction || p.advanceDeducted || p.advanceRecovery || p.advanceAdjusted || 0);
                      return (
                        <tr key={p.id || Math.random()}>
                          <td className="p-3 font-bold text-slate-900">{p.month} {p.year}</td>
                          <td className="p-3 text-right font-mono">₹{Number(p.baseSalary || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-center font-mono">{p.workedDays} / {p.workingDays}</td>
                          <td className="p-3 text-right font-mono text-red-600">₹{Number(p.attendanceDeduction || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-mono text-emerald-600">₹{Number(p.bonus || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-mono font-bold text-amber-700">
                            {pAdvDeduct > 0 ? `- ₹${pAdvDeduct.toLocaleString('en-IN')}` : '₹0'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-indigo-700">₹{Number(p.netSalary || 0).toLocaleString('en-IN')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Net Payable Footer */}
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider block">
                    Total Net Salary Payable
                  </span>
                  <span className="text-xs text-emerald-700 font-semibold">{slipPayload.netInWords}</span>
                  {Number(slipPayload.totalAdvanceDeduction || 0) > 0 && (
                    <span className="block mt-1 text-[11px] font-mono font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded w-fit border border-amber-200">
                      Includes Advance Payment Adjustment: - ₹{Number(slipPayload.totalAdvanceDeduction).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
                <span className="text-2xl font-extrabold text-emerald-700 font-mono">
                  ₹{Number(slipPayload.totalNet || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
