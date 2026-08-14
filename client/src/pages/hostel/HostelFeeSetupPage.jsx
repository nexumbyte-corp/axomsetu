import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Save,
  Play,
  CheckCircle2,
  Info,
  Receipt,
  ShieldCheck,
  Tag,
  Sparkles,
  Building,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { useAcademicYear } from '../../context/AcademicYearContext.jsx';
import { Card, CardHeader, CardContent } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { toast } from '../../components/ui/Toast.jsx';

const FEE_MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

export const HostelFeeSetupPage = () => {
  const { currentAcademicYear, academicYears } = useAcademicYear();
  const [activeTab, setActiveTab] = useState('setup'); // 'setup' | 'generate' | 'records'
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [hostels, setHostels] = useState([]);

  // Fee Config State
  const [feeConfig, setFeeConfig] = useState({
    admissionFeeEnabled: false,
    admissionFeeAmount: 0,
    monthlyFeeEnabled: false,
    monthlyFeeAmount: 0,
  });

  // Fee Generation Execution State
  const [genMonth, setGenMonth] = useState(() => {
    const monthIdx = new Date().getMonth();
    return FEE_MONTHS[monthIdx] || 'SEPTEMBER';
  });
  const [genResult, setGenResult] = useState(null);

  // Fee Records / Ledger State
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [feeRecords, setFeeRecords] = useState([]);
  const [feeSummary, setFeeSummary] = useState({
    totalCharges: 0,
    totalAmount: 0,
    totalPaid: 0,
    totalUnpaid: 0,
  });

  // Confirmation Modals State
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmGenerate, setShowConfirmGenerate] = useState(false);

  useEffect(() => {
    if (currentAcademicYear) {
      setSelectedAcademicYearId(currentAcademicYear.id);
    }
  }, [currentAcademicYear]);

  useEffect(() => {
    fetchHostels();
  }, []);

  const fetchFeeConfig = useCallback(async () => {
    if (!selectedAcademicYearId) return;
    try {
      setLoading(true);
      const res = await hostelService.getFeeConfig({
        academicYearId: selectedAcademicYearId,
        hostelId: selectedHostelId || undefined,
      });
      if (res.data) {
        setFeeConfig({
          admissionFeeEnabled: res.data.admissionFeeEnabled,
          admissionFeeAmount: res.data.admissionFeeAmount,
          monthlyFeeEnabled: res.data.monthlyFeeEnabled,
          monthlyFeeAmount: res.data.monthlyFeeAmount,
        });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load fee configuration');
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYearId, selectedHostelId]);

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
    } catch (err) {
      console.error('Failed loading hostel fee records:', err);
    } finally {
      setRecordsLoading(false);
    }
  }, [selectedAcademicYearId]);

  useEffect(() => {
    if (selectedAcademicYearId) {
      fetchFeeConfig();
      fetchFeeRecords();
    }
  }, [selectedAcademicYearId, selectedHostelId, fetchFeeConfig, fetchFeeRecords]);

  const fetchHostels = async () => {
    try {
      const res = await hostelService.listHostels();
      setHostels(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmSaveConfig = async () => {
    try {
      setSubmitting(true);
      await hostelService.saveFeeConfig({
        academicYearId: selectedAcademicYearId,
        hostelId: selectedHostelId || null,
        admissionFeeEnabled: feeConfig.admissionFeeEnabled,
        admissionFeeAmount: parseFloat(feeConfig.admissionFeeAmount) || 0,
        monthlyFeeEnabled: feeConfig.monthlyFeeEnabled,
        monthlyFeeAmount: parseFloat(feeConfig.monthlyFeeAmount) || 0,
      });
      toast.success('Hostel fee configuration saved successfully');
      setShowConfirmSave(false);
      fetchFeeConfig();
    } catch (err) {
      toast.error(err.message || 'Failed to save fee configuration');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmExecuteGeneration = async () => {
    try {
      setSubmitting(true);
      setGenResult(null);
      const res = await hostelService.generateMonthlyFees({
        academicYearId: selectedAcademicYearId,
        month: genMonth,
        hostelId: selectedHostelId || undefined,
      });
      setGenResult(res.data);
      toast.success(`Generated ${res.data.generatedCount} hostel fee charges`);
      setShowConfirmGenerate(false);
      fetchFeeRecords();
    } catch (err) {
      toast.error(err.message || 'Failed to generate hostel fees');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedYearObj = academicYears?.find((a) => a.id === selectedAcademicYearId);
  const selectedHostelObj = hostels?.find((h) => h.id === selectedHostelId);

  const admissionAmt = feeConfig.admissionFeeEnabled ? parseFloat(feeConfig.admissionFeeAmount || 0) : 0;
  const monthlyAmt = feeConfig.monthlyFeeEnabled ? parseFloat(feeConfig.monthlyFeeAmount || 0) : 0;
  const totalAdmissionPackage = admissionAmt + monthlyAmt;

  return (
    <div className="space-y-5 text-xs pb-10">
      {/* ── TOP PAGE EXECUTIVE HEADER ── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Hostel Fee Management & Billing Hub</h1>
              <Badge variant="indigo" size="sm">Automated Billing</Badge>
            </div>
            <p className="text-slate-500 text-xs mt-0.5">
              Set hostel fee rates, execute automated monthly resident billing, and track hostel fee collections.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="md" className="font-semibold">
              <Calendar className="w-3.5 h-3.5 mr-1 inline text-indigo-600" />
              {selectedYearObj?.name || 'Academic Year'}
            </Badge>
          </div>
        </div>

        {/* ── EXECUTIVE KPI METRICS STRIP ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Admission Fee Rate</span>
            <span className="text-sm sm:text-base font-extrabold font-mono text-purple-900">
              {feeConfig.admissionFeeEnabled ? `₹${admissionAmt.toLocaleString('en-IN')}` : 'Disabled'}
            </span>
            <span className="text-[10px] text-purple-600 block mt-0.5">One-time charge</span>
          </div>

          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Monthly Fee Rate</span>
            <span className="text-sm sm:text-base font-extrabold font-mono text-emerald-900">
              {feeConfig.monthlyFeeEnabled ? `₹${monthlyAmt.toLocaleString('en-IN')} / mo` : 'Disabled'}
            </span>
            <span className="text-[10px] text-emerald-600 block mt-0.5">Recurring billing</span>
          </div>

          <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Total Billed Charges</span>
            <span className="text-sm sm:text-base font-extrabold font-mono text-indigo-900">
              ₹{(feeSummary.totalAmount || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-indigo-600 block mt-0.5">{feeSummary.totalCharges} fee items</span>
          </div>

          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Outstanding Dues</span>
            <span className="text-sm sm:text-base font-extrabold font-mono text-amber-900">
              ₹{(feeSummary.totalUnpaid || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-amber-600 block mt-0.5">Pending cashier collection</span>
          </div>
        </div>
      </div>

      {/* ── SELECTOR FILTERS & WORKFLOW STEPPER TABS ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        {/* Step Navigation Tabs */}
        <div className="flex space-x-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
          <button
            onClick={() => setActiveTab('setup')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'setup'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">1</span>
            <span>Fee Setup & Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('generate')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'generate'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">2</span>
            <span>Generate Monthly Bills</span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'records'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">3</span>
            <span>Billed Ledger ({feeRecords.length})</span>
          </button>
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2">
          <div className="w-48 sm:w-56">
            <Select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="py-1 text-xs"
            >
              {academicYears?.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.isCurrent ? '(Current)' : ''}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-52 sm:w-60">
            <Select
              value={selectedHostelId}
              onChange={(e) => setSelectedHostelId(e.target.value)}
              className="py-1 text-xs"
            >
              <option value="">All Hostels (School Default)</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.type})
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* ── TAB 1: FEE SETUP & RULES ── */}
      {activeTab === 'setup' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Panel: Form Rules (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Alert type="info" className="py-2.5 text-xs">
              <Info className="w-4 h-4 mr-1.5 inline text-indigo-600 shrink-0" />
              <strong>How Hostel Fee Billing Works:</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-700">
                <li><strong>One-Time Admission Fee:</strong> Billed automatically when a student is admitted into hostel.</li>
                <li><strong>Monthly Fee:</strong> Billed recurringly every month for active residents via Step 2 ("Generate Monthly Bills").</li>
                <li><strong>Central Integration:</strong> All hostel fee charges appear in student ledger and cashier receipts.</li>
              </ul>
            </Alert>

            {loading ? (
              <div className="flex justify-center p-12 bg-white rounded-xl border border-slate-200">
                <Spinner size="lg" />
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setShowConfirmSave(true);
                }}
                className="space-y-4"
              >
                {/* 1. Admission Fee Setup Card */}
                <Card className="p-4.5 space-y-3.5 border-t-4 border-t-purple-600 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-purple-600" />
                        Hostel Admission Fee Rule
                      </h3>
                      <p className="text-[11px] text-slate-500">One-time registration fee charged upon hostel admission</p>
                    </div>
                    <Badge variant="purple" size="sm">One-Time</Badge>
                  </div>

                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center justify-between">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
                        checked={feeConfig.admissionFeeEnabled}
                        onChange={(e) => setFeeConfig({ ...feeConfig, admissionFeeEnabled: e.target.checked })}
                      />
                      <span className="text-xs font-bold text-slate-900">Enable Hostel Admission Fee</span>
                    </label>

                    <Badge variant={feeConfig.admissionFeeEnabled ? 'purple' : 'neutral'} size="xs">
                      {feeConfig.admissionFeeEnabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>

                  {feeConfig.admissionFeeEnabled && (
                    <Input
                      label="Enter One-Time Admission Fee Amount (₹) *"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 2000"
                      value={feeConfig.admissionFeeAmount}
                      onChange={(e) => setFeeConfig({ ...feeConfig, admissionFeeAmount: e.target.value })}
                      required
                    />
                  )}
                </Card>

                {/* 2. Monthly Fee Setup Card */}
                <Card className="p-4.5 space-y-3.5 border-t-4 border-t-emerald-600 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Tag className="w-4 h-4 text-emerald-600" />
                        Hostel Monthly Recurring Fee Rule
                      </h3>
                      <p className="text-[11px] text-slate-500">Monthly accommodation & mess fee for active residents</p>
                    </div>
                    <Badge variant="green" size="sm">Monthly</Badge>
                  </div>

                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        checked={feeConfig.monthlyFeeEnabled}
                        onChange={(e) => setFeeConfig({ ...feeConfig, monthlyFeeEnabled: e.target.checked })}
                      />
                      <span className="text-xs font-bold text-slate-900">Enable Hostel Monthly Fee</span>
                    </label>

                    <Badge variant={feeConfig.monthlyFeeEnabled ? 'green' : 'neutral'} size="xs">
                      {feeConfig.monthlyFeeEnabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>

                  {feeConfig.monthlyFeeEnabled && (
                    <Input
                      label="Enter Monthly Recurring Fee Amount (₹) *"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="e.g. 1500"
                      value={feeConfig.monthlyFeeAmount}
                      onChange={(e) => setFeeConfig({ ...feeConfig, monthlyFeeAmount: e.target.value })}
                      required
                    />
                  )}
                </Card>

                <div className="flex justify-end pt-1">
                  <Button type="submit" variant="primary" size="md" className="px-6 shadow-sm">
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    Save Fee Configuration
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Right Panel: Live Fee Template Preview & Workflow Diagram (5 Cols) */}
          <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-5">
            <Card className="border-indigo-100 shadow-2xs overflow-hidden">
              <CardHeader
                title="Active Fee Template Preview"
                subtitle="Live rate breakdown for current settings"
                action={
                  <Badge variant="indigo" size="sm">
                    {selectedYearObj?.name || 'Year'}
                  </Badge>
                }
              />

              <CardContent className="space-y-3.5 pt-2">
                {/* Scope Info Box */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-500">Applied Hostel Scope:</span>
                  <span className="font-bold text-slate-900">
                    {selectedHostelObj ? selectedHostelObj.name : 'All Hostels (School Default)'}
                  </span>
                </div>

                {/* Template Fee Heads */}
                <div className="space-y-2.5">
                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      feeConfig.admissionFeeEnabled
                        ? 'bg-purple-50/40 border-purple-200'
                        : 'bg-slate-50 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-xs">Hostel Admission Fee</span>
                      <Badge variant={feeConfig.admissionFeeEnabled ? 'purple' : 'neutral'} size="xs">
                        {feeConfig.admissionFeeEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-[11px] text-slate-500">Billing: One-Time</span>
                      <span className="font-mono font-extrabold text-slate-900 text-sm">
                        {feeConfig.admissionFeeEnabled
                          ? `₹${admissionAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          : 'Not Set'}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-xl border transition-all ${
                      feeConfig.monthlyFeeEnabled
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50 border-slate-200 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-slate-900 text-xs">Hostel Monthly Fee</span>
                      <Badge variant={feeConfig.monthlyFeeEnabled ? 'green' : 'neutral'} size="xs">
                        {feeConfig.monthlyFeeEnabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-[11px] text-slate-500">Billing: Monthly Recurring</span>
                      <span className="font-mono font-extrabold text-emerald-700 text-sm">
                        {feeConfig.monthlyFeeEnabled
                          ? `₹${monthlyAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / mo`
                          : 'Not Set'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total Package Summary */}
                <div className="p-3 bg-indigo-50/90 rounded-xl border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-indigo-950">
                    <span className="font-semibold">Est. Admission Package (Admission + 1st Month):</span>
                    <span className="font-mono font-bold text-slate-900">
                      ₹{totalAdmissionPackage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-indigo-200 text-xs">
                    <span className="font-bold text-indigo-950">Recurring Monthly Fee:</span>
                    <span className="font-mono font-black text-indigo-700 text-sm">
                      ₹{monthlyAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })} / mo
                    </span>
                  </div>
                </div>

                {/* Workflow Step Diagram */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    Hostel Fee Billing Flow
                  </span>
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <div className="text-center">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold mx-auto flex items-center justify-center mb-0.5">1</span>
                      <span className="text-slate-600 font-medium block">Admit Student</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <div className="text-center">
                      <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-bold mx-auto flex items-center justify-center mb-0.5">2</span>
                      <span className="text-slate-600 font-medium block">Auto Admission Fee</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                    <div className="text-center">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold mx-auto flex items-center justify-center mb-0.5">3</span>
                      <span className="text-slate-600 font-medium block">Monthly Run</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 2: GENERATE MONTHLY BILLS ── */}
      {activeTab === 'generate' && (
        <div className="space-y-4 max-w-4xl">
          <Alert type="info" className="py-2.5 text-xs">
            <Info className="w-4 h-4 mr-1.5 inline text-indigo-600 shrink-0" />
            <strong>Automated Safeguards:</strong> Monthly hostel billing runs strictly verify student hostel admission dates (no backdated charges for prior months) and prevent duplicate generation.
          </Alert>

          <Card className="p-5 space-y-4 shadow-2xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-600" />
                Execute Automated Monthly Fee Generation
              </h3>
              <p className="text-slate-500 text-xs mt-0.5">
                Generate monthly fee charges of <strong>₹{monthlyAmt.toLocaleString('en-IN')}</strong> for all active hostel residents for the selected month.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowConfirmGenerate(true);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200">
                <Select
                  label="Select Billing Target Month *"
                  value={genMonth}
                  onChange={(e) => setGenMonth(e.target.value)}
                  required
                  className="bg-white"
                >
                  {FEE_MONTHS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>

                <Button type="submit" variant="primary" size="md" className="h-9 justify-center shadow-sm">
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Run Fee Generation for {genMonth}
                </Button>
              </div>
            </form>

            {/* Live Results Panel */}
            {genResult && (
              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center space-x-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Hostel Fee Generation Completed for {genResult.month}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Charges Created</span>
                    <span className="font-extrabold text-emerald-600 text-lg">{genResult.generatedCount}</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Skipped (Protected)</span>
                    <span className="font-extrabold text-amber-600 text-lg">{genResult.skippedCount}</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Total Billed</span>
                    <span className="font-extrabold text-indigo-700 text-lg font-mono">₹{genResult.totalAmount}</span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Total Residents</span>
                    <span className="font-bold text-slate-800 text-lg">{genResult.totalResidents}</span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 3: BILLED LEDGER & RECORDS ── */}
      {activeTab === 'records' && (
        <Card className="shadow-2xs">
          <CardHeader
            title="Generated Hostel Fee Records"
            subtitle={`All hostel fee charges generated in ${selectedYearObj?.name || 'Selected Academic Year'}`}
            action={
              <Badge variant="indigo" size="sm">
                Total: {feeRecords.length} Charges
              </Badge>
            }
          />
          <CardContent>
            {recordsLoading ? (
              <div className="flex justify-center p-12">
                <Spinner size="lg" />
              </div>
            ) : feeRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic bg-slate-50 rounded-xl border border-slate-200">
                No hostel fee charges found for the selected academic year.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Admission No</th>
                      <th className="py-2.5 px-3">Fee Title / Head</th>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3 text-right">Billed (₹)</th>
                      <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                      <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {feeRecords.map((item, idx) => {
                      const amt = Number(item.amount || 0);
                      const paid = Number(item.paidAmount || 0);
                      const bal = Math.max(0, amt - paid);

                      return (
                        <tr key={item.id || idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">{item.student?.name || '—'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{item.student?.admissionNo || '—'}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">{item.title}</td>
                          <td className="py-2.5 px-3 font-semibold text-indigo-700 font-mono">{item.month}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">₹{amt}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-600">₹{paid}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-extrabold text-rose-700">₹{bal}</td>
                          <td className="py-2.5 px-3 text-center">
                            <Badge
                              variant={item.status === 'PAID' ? 'green' : item.status === 'PARTIAL' ? 'amber' : 'red'}
                              size="sm"
                            >
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* CONFIRMATION DIALOGS */}
      <ConfirmDialog
        isOpen={showConfirmSave}
        onClose={() => setShowConfirmSave(false)}
        onConfirm={handleConfirmSaveConfig}
        title="Save Fee Configuration"
        message="Save hostel fee amounts for the selected academic year?"
        confirmText="Save Configuration"
        variant="amber"
        loading={submitting}
      />

      <ConfirmDialog
        isOpen={showConfirmGenerate}
        onClose={() => setShowConfirmGenerate(false)}
        onConfirm={handleConfirmExecuteGeneration}
        title="Execute Monthly Fee Generation"
        message={`Execute automated hostel monthly fee generation for ${genMonth}?`}
        confirmText="Run Generation"
        variant="amber"
        loading={submitting}
      />
    </div>
  );
};
