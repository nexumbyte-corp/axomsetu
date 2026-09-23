import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  CreditCard,
  Clock,
  Printer,
  Filter,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  GraduationCap,
  DollarSign,
  UserCheck,
  FileText,
  X,
  PieChart,
  Download,
  ChevronDown,
  FileSpreadsheet,
  Code2,
  BarChart3,
} from 'lucide-react';
import { FinancialReportCharts } from '../../components/reports/FinancialReportCharts.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '../../components/ui/Table.jsx';
import { Dropdown, DropdownItem, DropdownDivider } from '../../components/ui/Dropdown.jsx';
import { SchoolReportHeader } from '../../components/common/SchoolReportHeader.jsx';

import { reportService } from '../../services/report.service.js';
import { formatCurrency, formatDate, getAcademicMonthOptions } from '../../utils/formatters.js';
import { exportToExcel, exportToCSV, exportToJSON } from '../../utils/exportUtils.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useAuth } from '../../hooks/useAuth.js';

export const ReportsPage = () => {
  useDocumentTitle('Reports & Analytics');
  const { selectedYearId, selectedYear, academicYears } = useAcademicYear();
  const { user } = useAuth();
  const schoolHeader = user?.schoolAdmins?.[0]?.school || user?.school || {};

  // Active Report Tab: 'charts' | 'student-list' | 'fee-collection' | 'outstanding-list'
  const [activeTab, setActiveTab] = useState('charts');
  const [chartData, setChartData] = useState(null);

  // Dynamic Dropdown Options
  const [filterOptions, setFilterOptions] = useState({
    classes: [],
    mediums: [],
    streams: [],
    sections: [],
  });

  // Filter State
  const [filters, setFilters] = useState({
    academicYearId: '',
    classId: '',
    sectionId: '',
    mediumId: '',
    streamId: '',
    status: 'ALL',
    month: 'ALL',
    search: '',
  });

  // Sync selected academic year ID when global academic year changes
  useEffect(() => {
    if (selectedYearId && (!filters.academicYearId || filters.academicYearId !== selectedYearId)) {
      setFilters((prev) => ({ ...prev, academicYearId: selectedYearId }));
    }
  }, [selectedYearId, filters.academicYearId]);

  // Selected class object & stream support validation
  const selectedClassObj = useMemo(() => {
    return filterOptions.classes.find((c) => c.id === filters.classId);
  }, [filters.classId, filterOptions.classes]);

  const isStreamSupported = useMemo(() => {
    if (!filters.classId) return true;
    if (selectedClassObj) {
      return selectedClassObj.hasStream || /XI|XII|11|12/i.test(selectedClassObj.name);
    }
    return false;
  }, [filters.classId, selectedClassObj]);

  // Data & State
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  // Academic Month Options
  const monthOptions = useMemo(() => {
    return getAcademicMonthOptions(selectedYear, false);
  }, [selectedYear]);

  // Load Dropdown Options
  useEffect(() => {
    const loadOptions = async () => {
      const opts = await reportService.fetchFilterOptions();
      setFilterOptions({
        classes: opts.classes || [],
        mediums: opts.mediums || [],
        streams: opts.streams || [],
        sections: opts.sections || [],
      });
    };
    loadOptions();
  }, []);

  // Fetch Active Report Data
  const fetchActiveReport = useCallback(
    async (overrideFilters = null) => {
      setLoading(true);
      const activeFilters = overrideFilters || filters;
      const targetYearId = activeFilters.academicYearId || selectedYearId || '';

      const params = {
        academicYearId: targetYearId,
        classId: activeFilters.classId || undefined,
        sectionId: activeFilters.sectionId || undefined,
        mediumId: activeFilters.mediumId || undefined,
        streamId: activeFilters.streamId || undefined,
        month: activeFilters.month !== 'ALL' ? activeFilters.month : undefined,
        limit: 1000,
      };

      try {
        const chartsPromise = reportService.getFinancialChartsReport(params);

        let tablePromise;
        if (activeTab === 'student-list') {
          tablePromise = reportService.getStudentListReport({
            ...params,
            status: activeFilters.status !== 'ALL' ? activeFilters.status : undefined,
            search: activeFilters.search || undefined,
          });
        } else if (activeTab === 'fee-collection') {
          tablePromise = reportService.getFeeCollectionReport({
            ...params,
          });
        } else if (activeTab === 'outstanding-list') {
          tablePromise = reportService.getOutstandingReport({
            ...params,
          });
        }

        const [chartsRes, tableRes] = await Promise.all([
          chartsPromise.catch(() => null),
          tablePromise ? tablePromise.catch(() => null) : Promise.resolve(null),
        ]);

        if (chartsRes && chartsRes.data) {
          setChartData(chartsRes.data);
        }

        if (tableRes) {
          setReportData(tableRes.data || []);
        } else if (activeTab === 'charts') {
          setReportData([]);
        }
      } catch (err) {
        console.error('Failed to load report data', err);
        toast.error('Failed to load report data. Please try again.');
        setReportData([]);
      } finally {
        setLoading(false);
      }
    },
    [activeTab, filters, selectedYearId]
  );

  // Trigger report fetch automatically whenever activeTab, filters, or selectedYearId change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActiveReport();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchActiveReport]);

  // Filter Change Handler with strict filter hierarchy
  const handleFilterChange = (field, value) => {
    setFilters((prev) => {
      const next = { ...prev, [field]: value };

      if (field === 'academicYearId') {
        next.month = 'ALL';
      }

      if (field === 'classId') {
        if (value) {
          const targetCls = filterOptions.classes.find((c) => c.id === value);
          const hasStream = targetCls
            ? targetCls.hasStream || /XI|XII|11|12/i.test(targetCls.name)
            : false;
          if (!hasStream) {
            next.streamId = '';
          }
        }
      }

      return next;
    });
  };

  // Reset Filters
  const handleResetFilters = () => {
    const reset = {
      academicYearId: selectedYearId || '',
      classId: '',
      sectionId: '',
      mediumId: '',
      streamId: '',
      status: 'ALL',
      month: 'ALL',
      search: '',
    };
    setFilters(reset);
    fetchActiveReport(reset);
  };

  // Browser Print Action
  const handlePrint = () => {
    window.print();
  };

  // Dynamic Export Handler for .xlsx, .csv, and .json formats
  const handleExport = (format = 'excel') => {
    if (!reportData || reportData.length === 0) {
      toast.error('No data available to export.');
      return;
    }

    let columns = [];
    let baseFilename = `Report_${activeTab}_${new Date().toISOString().split('T')[0]}`;

    if (activeTab === 'student-list') {
      baseFilename = `Student_List_Report_${new Date().toISOString().split('T')[0]}`;
      columns = [
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'guardianName', label: 'Guardian Name' },
        { key: 'phone', label: 'Contact Phone' },
        { key: 'className', label: 'Class' },
        { key: 'sectionName', label: 'Section' },
        { key: 'mediumName', label: 'Medium' },
        { key: 'streamName', label: 'Stream' },
        { key: 'status', label: 'Status' },
      ];
    } else if (activeTab === 'fee-collection') {
      baseFilename = `Fee_Collection_Report_${new Date().toISOString().split('T')[0]}`;
      columns = [
        { key: 'date', label: 'Date', format: (v) => formatDate(v) },
        { key: 'receiptNo', label: 'Receipt No' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'className', label: 'Class & Sec' },
        { key: 'mediumName', label: 'Medium' },
        { key: 'streamName', label: 'Stream' },
        { key: 'feeType', label: 'Fee Type' },
        { key: 'paymentMode', label: 'Payment Mode' },
        { key: 'amount', label: 'Collected Amount (₹)' },
      ];
    } else if (activeTab === 'outstanding-list') {
      baseFilename = `Outstanding_Fee_Report_${new Date().toISOString().split('T')[0]}`;
      columns = [
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'guardianName', label: 'Guardian Name' },
        { key: 'phone', label: 'Contact Phone' },
        { key: 'className', label: 'Class & Sec' },
        { key: 'mediumName', label: 'Medium' },
        { key: 'streamName', label: 'Stream' },
        { key: 'totalCharged', label: 'Total Charged (₹)' },
        { key: 'paidAmount', label: 'Amount Paid (₹)' },
        { key: 'balance', label: 'Outstanding Balance (₹)' },
        { key: 'status', label: 'Dues Status' },
      ];
    }

    if (format === 'excel') {
      exportToExcel(reportData, columns, `${baseFilename}.xlsx`);
      toast.success(`Exported ${baseFilename}.xlsx`);
    } else if (format === 'csv') {
      exportToCSV(reportData, columns, `${baseFilename}.csv`);
      toast.success(`Exported ${baseFilename}.csv`);
    } else if (format === 'json') {
      exportToJSON(reportData, `${baseFilename}.json`);
      toast.success(`Exported ${baseFilename}.json`);
    }
  };

  // Build active filter summary string for print header
  const getFilterSummaryString = () => {
    const parts = [];

    const yr = academicYears.find((y) => y.id === (filters.academicYearId || selectedYearId));
    if (yr?.name) parts.push(`Academic Year: ${yr.name}`);

    if (filters.classId) {
      const cls = filterOptions.classes.find((c) => c.id === filters.classId);
      if (cls) parts.push(`Class: ${cls.name}`);
    }
    if (filters.sectionId) {
      const sec = filterOptions.sections.find((s) => s.id === filters.sectionId);
      if (sec) parts.push(`Section: ${sec.name}`);
    }
    if (filters.mediumId) {
      const med = filterOptions.mediums.find((m) => m.id === filters.mediumId);
      if (med) parts.push(`Medium: ${med.name}`);
    }
    if (filters.streamId) {
      const strm = filterOptions.streams.find((s) => s.id === filters.streamId);
      if (strm) parts.push(`Stream: ${strm.name}`);
    }

    if (activeTab === 'student-list' && filters.status !== 'ALL') {
      parts.push(`Status: ${filters.status}`);
    }
    if ((activeTab === 'fee-collection' || activeTab === 'outstanding-list') && filters.month !== 'ALL') {
      parts.push(`Month: ${filters.month}`);
    }
    if (activeTab === 'student-list' && filters.search) {
      parts.push(`Search: "${filters.search}"`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'All Records (No Specific Filters Applied)';
  };

  // Tab Header Details
  const activeTabConfig = useMemo(() => {
    switch (activeTab) {
      case 'charts':
        return {
          title: 'FINANCIAL ANALYTICS & CHARTS REPORT',
          description: 'Interactive Collection vs Expense comparisons, Expected vs Actual collections, and Category Expense distributions.',
          icon: BarChart3,
          templateId: 'financialLedger',
          filename: `Financial_Charts_${new Date().toISOString().split('T')[0]}.pdf`,
        };
      case 'student-list':
        return {
          title: 'STUDENT DIRECTORY LIST REPORT',
          description: 'Enrolled students master record with Class, Section, Medium, Stream, Contact info & Status.',
          icon: Users,
          templateId: 'studentReport',
          filename: `Student_List_${new Date().toISOString().split('T')[0]}.pdf`,
        };
      case 'fee-collection':
        return {
          title: 'FEE COLLECTION & PAYMENT REPORT',
          description: 'Itemized fee payments collected with receipt numbers, payment modes, fee types, and amounts.',
          icon: CreditCard,
          templateId: 'feeReport',
          filename: `Fee_Collection_${new Date().toISOString().split('T')[0]}.pdf`,
        };
      case 'outstanding-list':
        return {
          title: 'STUDENT OUTSTANDING FEE DUES REPORT',
          description: 'Detailed pending fee statement showing total charged, amount paid, and remaining dues.',
          icon: Clock,
          templateId: 'feeReport',
          filename: `Outstanding_Fees_${new Date().toISOString().split('T')[0]}.pdf`,
        };
      default:
        return { title: 'REPORTS', description: '', icon: Users, templateId: 'genericReport', filename: 'Report.pdf' };
    }
  }, [activeTab]);

  // Derived KPI Metrics for Single Page Dashboard
  const metrics = useMemo(() => {
    if (activeTab === 'student-list') {
      const total = reportData.length;
      const active = reportData.filter((s) => s.status === 'ACTIVE').length;
      const inactive = total - active;
      const uniqueClasses = new Set(reportData.map((s) => s.rawClassName || s.className)).size;
      return { total, active, inactive, uniqueClasses };
    } else if (activeTab === 'fee-collection') {
      const totalAmt = reportData.reduce((acc, r) => acc + (r.amount || 0), 0);
      const receiptCount = reportData.length;
      const cashAmt = reportData.filter((r) => r.paymentMode === 'CASH').reduce((acc, r) => acc + (r.amount || 0), 0);
      const onlineAmt = totalAmt - cashAmt;
      return { totalAmt, receiptCount, cashAmt, onlineAmt };
    } else if (activeTab === 'outstanding-list') {
      const totalDues = reportData.reduce((acc, r) => acc + (r.balance || 0), 0);
      const totalBilled = reportData.reduce((acc, r) => acc + (r.totalCharged || 0), 0);
      const totalPaid = reportData.reduce((acc, r) => acc + (r.paidAmount || 0), 0);
      const studentCount = reportData.length;
      return { totalDues, totalBilled, totalPaid, studentCount };
    }
    return {};
  }, [activeTab, reportData]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* On-Screen Header (Hidden during Print) */}
      <div className="print:hidden">
        <ModulePageHeader
          title="Reports & Analytics"
          description="Generate, filter, view, and print school academic, fee collection, and dues reports."
          icon={PieChart}
        />

        <div className="w-full mt-4">
          {/* Main Navigation Tabs & Compact Action Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            {/* Tab Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setActiveTab('charts')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
                  activeTab === 'charts'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Financial Charts</span>
              </button>

              <button
                onClick={() => setActiveTab('student-list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
                  activeTab === 'student-list'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Student List</span>
                {activeTab === 'student-list' && (
                  <span className="ml-1 bg-indigo-700 text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                    {reportData.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('fee-collection')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
                  activeTab === 'fee-collection'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Fee Collection</span>
                {activeTab === 'fee-collection' && (
                  <span className="ml-1 bg-emerald-700 text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                    {reportData.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('outstanding-list')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
                  activeTab === 'outstanding-list'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Outstanding List</span>
                {activeTab === 'outstanding-list' && (
                  <span className="ml-1 bg-rose-700 text-white px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                    {reportData.length}
                  </span>
                )}
              </button>
            </div>

            {/* Action Controls: Refresh, Export Dropdown, and Print */}
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => fetchActiveReport()}
                disabled={loading}
                className="h-7 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>

              {/* Export Options Dropdown Menu */}
              <Dropdown
                align="right"
                trigger={
                  <button
                    type="button"
                    disabled={loading || reportData.length === 0}
                    className="h-7 px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    <span>Export</span>
                    <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                }
              >
                <DropdownItem icon={FileSpreadsheet} onClick={() => handleExport('excel')}>
                  Excel Spreadsheet (.xlsx)
                </DropdownItem>
                <DropdownItem icon={FileText} onClick={() => handleExport('csv')}>
                  CSV Document (.csv)
                </DropdownItem>
                <DropdownDivider />
                <DropdownItem icon={Code2} onClick={() => handleExport('json')}>
                  JSON Dataset (.json)
                </DropdownItem>
              </Dropdown>

              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={loading || reportData.length === 0}
                className="h-7 px-3 py-1 text-xs font-bold rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
          </div>

          {/* High-Density Multi-Filter Controls Bar */}
          <div className="mt-4 bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                <Filter className="w-3 h-3 text-indigo-600" />
                Filter Parameters
              </div>
              <button
                onClick={handleResetFilters}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {/* Academic Year Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Academic Year</label>
                <select
                  value={filters.academicYearId}
                  onChange={(e) => handleFilterChange('academicYearId', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Current Year</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Class</label>
                <select
                  value={filters.classId}
                  onChange={(e) => handleFilterChange('classId', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Classes</option>
                  {filterOptions.classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Section</label>
                <select
                  value={filters.sectionId}
                  onChange={(e) => handleFilterChange('sectionId', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Sections</option>
                  {filterOptions.sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Medium Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Medium</label>
                <select
                  value={filters.mediumId}
                  onChange={(e) => handleFilterChange('mediumId', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All Mediums</option>
                  {filterOptions.mediums.map((med) => (
                    <option key={med.id} value={med.id}>
                      {med.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stream Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider flex items-center justify-between">
                  <span>Stream</span>
                  {!isStreamSupported && (
                    <span className="text-[9px] text-amber-600 font-semibold uppercase">N/A</span>
                  )}
                </label>
                <select
                  value={filters.streamId}
                  disabled={!isStreamSupported}
                  onChange={(e) => handleFilterChange('streamId', e.target.value)}
                  className={`w-full border rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                    !isStreamSupported
                      ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed text-slate-400'
                      : 'bg-slate-50 border-slate-200 focus:bg-white'
                  }`}
                >
                  <option value="">{isStreamSupported ? 'All Streams' : 'All Streams (N/A)'}</option>
                  {filterOptions.streams.map((strm) => (
                    <option key={strm.id} value={strm.id}>
                      {strm.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status or Month Filter */}
              {activeTab === 'student-list' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Student Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive (Left/Graduated)</option>
                    <option value="LEFT">Left</option>
                    <option value="GRADUATED">Graduated</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5 uppercase tracking-wider">Fee Month</label>
                  <select
                    value={filters.month}
                    onChange={(e) => handleFilterChange('month', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">All Months</option>
                    {monthOptions.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Keyword Search Row */}
            <div className="mt-2.5 pt-2 border-t border-slate-100">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search student name, admission no, phone, receipt no..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1 text-[11px] font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
              </div>
            </div>
          </div>

          {/* Compact KPI Analytics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
            {/* STUDENT LIST METRICS */}
            {activeTab === 'student-list' && (
              <>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Total Students</p>
                    <p className="text-base font-black text-slate-900">{metrics.total || 0}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Active Enrolled</p>
                    <p className="text-base font-black text-emerald-600">{metrics.active || 0}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Inactive / Left</p>
                    <p className="text-base font-black text-amber-600">{metrics.inactive || 0}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Classes Count</p>
                    <p className="text-base font-black text-slate-900">{metrics.uniqueClasses || 0}</p>
                  </div>
                </div>
              </>
            )}

            {/* FEE COLLECTION METRICS */}
            {activeTab === 'fee-collection' && (
              <>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Total Collection</p>
                    <p className="text-base font-black text-emerald-600">{formatCurrency(metrics.totalAmt || 0)}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Receipt Vouchers</p>
                    <p className="text-base font-black text-slate-900">{metrics.receiptCount || 0}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Cash Collection</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(metrics.cashAmt || 0)}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Online / UPI Collection</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(metrics.onlineAmt || 0)}</p>
                  </div>
                </div>
              </>
            )}

            {/* OUTSTANDING METRICS */}
            {activeTab === 'outstanding-list' && (
              <>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Total Dues Pending</p>
                    <p className="text-base font-black text-rose-600">{formatCurrency(metrics.totalDues || 0)}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Total Billed</p>
                    <p className="text-sm font-black text-slate-900">{formatCurrency(metrics.totalBilled || 0)}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Amount Paid</p>
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(metrics.totalPaid || 0)}</p>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">Students with Dues</p>
                    <p className="text-base font-black text-slate-900">{metrics.studentCount || 0}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MAIN REPORT SECTION (CHARTS / TABLES)                                     */}
      {/* ========================================================================= */}
      <div className="w-full mt-4">
        {activeTab === 'charts' ? (
          <FinancialReportCharts
            chartData={chartData}
            loading={loading}
            filters={filters}
            classOptions={filterOptions.classes}
          />
        ) : (
          <div id="printable-report-area" className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 print:p-0 print:border-none print:shadow-none">
          {/* Printable Formal Header (Only Visible during Window Print) */}
          <div className="hidden print:block mb-4">
            <SchoolReportHeader
              school={schoolHeader}
              documentTitle={activeTabConfig.title}
              academicYear={selectedYear?.name || ''}
            />
            <div className="text-center text-xs font-semibold text-slate-600 mt-2 pb-3 border-b border-slate-300">
              <p>Filter Parameters: {getFilterSummaryString()}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Printed On: {new Date().toLocaleDateString('en-IN')} at {new Date().toLocaleTimeString('en-IN')}
              </p>
            </div>
          </div>

          {/* On-screen Header Banner */}
          <div className="print:hidden flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 mb-3 border-b border-slate-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">{activeTabConfig.title}</h2>
                <Badge variant="outline" className="font-mono text-[10px] font-bold text-slate-700 bg-slate-50">
                  {reportData.length} records
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{activeTabConfig.description}</p>
            </div>

            <div className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/80">
              Filters: <span className="text-slate-800 font-bold">{getFilterSummaryString()}</span>
            </div>
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="py-14 text-center">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2.5"></div>
              <p className="text-xs font-bold text-slate-800">Compiling Report Dataset...</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Applying parameters and security rules...</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="py-14 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <AlertCircle className="w-9 h-9 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No matching report records found</p>
              <p className="text-[11px] text-slate-500 mt-1">Try adjusting your filters or clearing parameters above.</p>
            </div>
          ) : (
            <Table minWidth="min-w-full">
              <TableHeader>
                <TableRow className="bg-slate-100/90 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider border-y border-black print:bg-slate-200 print:text-black print:border-y print:border-black">
                  {/* TAB 1: STUDENT LIST COLUMNS */}
                  {activeTab === 'student-list' && (
                    <>
                      <TableHead className="w-10 text-center">S.No</TableHead>
                      <TableHead>Student Info</TableHead>
                      <TableHead>Guardian & Contact</TableHead>
                      <TableHead>Class & Section</TableHead>
                      <TableHead>Medium & Stream</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </>
                  )}

                  {/* TAB 2: FEE COLLECTION COLUMNS */}
                  {activeTab === 'fee-collection' && (
                    <>
                      <TableHead className="w-10 text-center">S.No</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Receipt No</TableHead>
                      <TableHead>Student Name & Adm No</TableHead>
                      <TableHead>Class & Sec</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead className="text-center">Payment Mode</TableHead>
                      <TableHead className="text-right">Amount (₹)</TableHead>
                    </>
                  )}

                  {/* TAB 3: OUTSTANDING LIST COLUMNS */}
                  {activeTab === 'outstanding-list' && (
                    <>
                      <TableHead className="w-10 text-center">S.No</TableHead>
                      <TableHead>Student Name & Adm No</TableHead>
                      <TableHead>Guardian & Phone</TableHead>
                      <TableHead>Class & Sec</TableHead>
                      <TableHead className="text-right print:hidden">Total Charged</TableHead>
                      <TableHead className="text-right print:hidden">Amount Paid</TableHead>
                      <TableHead className="text-right">Outstanding Dues</TableHead>
                      <TableHead className="text-center">Dues Status</TableHead>
                    </>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-black">
                {reportData.map((row, idx) => (
                  <TableRow key={row.id || row.studentId || idx} className="hover:bg-slate-50/80 transition-colors border-b border-black print:hover:bg-transparent print:border-b print:border-black">
                    {/* TAB 1: STUDENT LIST ROWS */}
                    {activeTab === 'student-list' && (
                      <>
                        <TableCell className="text-center font-bold text-slate-500 print:text-black py-2 px-3 text-[11px]">{idx + 1}</TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="font-bold text-slate-900 text-xs">{row.studentName}</div>
                          <div className="text-[10px] font-mono text-indigo-600 font-semibold print:text-black">
                            {row.admissionNo}
                          </div>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="text-xs font-semibold text-slate-800">{row.guardianName || '—'}</div>
                          <div className="text-[10px] font-mono text-slate-500">{row.phone || '—'}</div>
                        </TableCell>
                        <TableCell className="py-2 px-3 font-semibold text-slate-800 text-xs">{row.className}</TableCell>
                        <TableCell className="py-2 px-3 text-xs text-slate-600">
                          <span className="font-medium">{row.mediumName || '—'}</span>
                          {row.streamName && row.streamName !== '-' && (
                            <span className="ml-1 text-[10px] text-indigo-600 font-semibold">({row.streamName})</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-center">
                          <Badge
                            variant={row.status === 'ACTIVE' ? 'success' : 'secondary'}
                            className="text-[9px] uppercase font-bold px-1.5 py-0.2"
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      </>
                    )}

                    {/* TAB 2: FEE COLLECTION ROWS */}
                    {activeTab === 'fee-collection' && (
                      <>
                        <TableCell className="text-center font-bold text-slate-500 print:text-black py-2 px-3 text-[11px]">{idx + 1}</TableCell>
                        <TableCell className="py-2 px-3 font-mono text-xs text-slate-700">{formatDate(row.date)}</TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="font-mono font-bold text-emerald-700 text-xs print:text-black">{row.receiptNo || '—'}</div>
                          {row.referenceNumber && row.referenceNumber !== '-' && (
                            <div className="text-[9px] font-mono text-slate-400">Ref: {row.referenceNumber}</div>
                          )}
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="font-bold text-slate-900 text-xs">{row.studentName}</div>
                          <div className="text-[10px] font-mono text-slate-500">{row.admissionNo}</div>
                        </TableCell>
                        <TableCell className="py-2 px-3 font-semibold text-slate-800 text-xs">{row.className}</TableCell>
                        <TableCell className="py-2 px-3 text-xs text-slate-700">{row.feeType}</TableCell>
                        <TableCell className="py-2 px-3 text-center">
                          <Badge variant="outline" className="text-[9px] font-bold uppercase bg-slate-50 text-slate-700 border-slate-200 px-1.5 py-0.2">
                            {row.paymentMode}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 px-3 text-right font-mono font-bold text-emerald-700 text-xs print:text-black">
                          {formatCurrency(row.amount)}
                        </TableCell>
                      </>
                    )}

                    {/* TAB 3: OUTSTANDING LIST ROWS */}
                    {activeTab === 'outstanding-list' && (
                      <>
                        <TableCell className="text-center font-bold text-slate-500 print:text-black py-2 px-3 text-[11px]">{idx + 1}</TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="font-bold text-slate-900 text-xs">{row.studentName}</div>
                          <div className="text-[10px] font-mono text-indigo-600 font-semibold print:text-black">{row.admissionNo}</div>
                        </TableCell>
                        <TableCell className="py-2 px-3">
                          <div className="text-xs font-semibold text-slate-800">{row.guardianName || '—'}</div>
                          <div className="text-[10px] font-mono text-slate-500">{row.phone || '—'}</div>
                        </TableCell>
                        <TableCell className="py-2 px-3 font-semibold text-slate-800 text-xs">{row.className}</TableCell>
                        <TableCell className="py-2 px-3 text-right font-mono text-slate-700 text-xs print:hidden">{formatCurrency(row.totalCharged)}</TableCell>
                        <TableCell className="py-2 px-3 text-right font-mono text-emerald-600 font-semibold text-xs print:hidden">{formatCurrency(row.paidAmount)}</TableCell>
                        <TableCell className="py-2 px-3 text-right font-mono font-black text-rose-600 text-xs print:text-black">
                          {formatCurrency(row.balance)}
                        </TableCell>
                        <TableCell className="py-2 px-3 text-center">
                          <Badge
                            variant={row.status === 'PARTIAL' ? 'warning' : 'danger'}
                            className="text-[9px] uppercase font-bold px-1.5 py-0.2"
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>

              {/* Table Footer Total Summary */}
              <tfoot>
                <tr className="bg-slate-100/90 font-bold border-t border-b border-black text-slate-900 text-xs print:bg-slate-200 print:border-t print:border-b print:border-black">
                  {activeTab === 'student-list' && (
                    <td colSpan={6} className="py-2.5 px-3 text-right">
                      Total Filtered Enrolled Students: <span className="text-indigo-700 font-black text-xs">{reportData.length}</span>
                    </td>
                  )}

                  {activeTab === 'fee-collection' && (
                    <>
                      <td colSpan={7} className="py-2.5 px-3 text-right font-black uppercase text-[11px]">
                        Grand Total Fee Collected:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-xs print:text-black">
                        {formatCurrency(reportData.reduce((acc, r) => acc + (r.amount || 0), 0))}
                      </td>
                    </>
                  )}

                  {activeTab === 'outstanding-list' && (
                    <>
                      <td colSpan={4} className="py-2.5 px-3 text-right font-black uppercase text-[11px]">
                        Grand Totals:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 text-xs print:hidden">
                        {formatCurrency(reportData.reduce((acc, r) => acc + (r.totalCharged || 0), 0))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 text-xs print:hidden">
                        {formatCurrency(reportData.reduce((acc, r) => acc + (r.paidAmount || 0), 0))}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-rose-700 text-xs print:text-black">
                        {formatCurrency(reportData.reduce((acc, r) => acc + (r.balance || 0), 0))}
                      </td>
                      <td></td>
                    </>
                  )}
                </tr>
              </tfoot>
            </Table>
          )}

          {/* Printable Official Footer Notice */}
          <div className="hidden print:block mt-6 pt-3 border-t border-slate-300 text-center text-[10px] text-slate-500">
            <p>AXOMSETU School SaaS Management System — Confidential Official Academic Report</p>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
