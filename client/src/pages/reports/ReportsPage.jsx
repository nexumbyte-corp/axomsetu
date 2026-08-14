import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Search,
  Users,
  GraduationCap,
  CreditCard,
  Building,
  Briefcase,
  Calculator,
  Wallet,
  ShieldCheck,
  FileSpreadsheet,
  ArrowLeft,
  Printer,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Loader2,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Drawer } from '../../components/ui/Drawer.jsx';
import { Pagination } from '../../components/ui/Pagination.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { DocumentPreviewModal } from '../../components/documents/DocumentPreviewModal.jsx';

import { REPORT_CATEGORIES, REPORT_REGISTRY, getReportById } from '../../core/reports/reportRegistry.js';
import { reportService } from '../../services/report.service.js';
import { exportToCSV } from '../../utils/csvExport.js';
import { useAcademicYear } from '../../hooks/useAcademicYear.js';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import { useAuth } from '../../hooks/useAuth.js';

const CATEGORY_ICONS = {
  all: FileSpreadsheet,
  students: Users,
  academic: GraduationCap,
  fees: CreditCard,
  staff: Briefcase,
  payroll: Calculator,
  finance: Wallet,
  audit: ShieldCheck,
};

export const ReportsPage = () => {
  useDocumentTitle('Reports');
  const { selectedYearId, selectedYear, academicYears } = useAcademicYear();
  const { user } = useAuth();
  const schoolHeader = user?.schoolAdmins?.[0]?.school || user?.school || {};


  // Navigation & Search State
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentReports, setRecentReports] = useState(() => {
    try {
      const saved = localStorage.getItem('recent_reports');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Dynamic Filter Dependencies Dropdowns
  const [filterOptions, setFilterOptions] = useState({
    classes: [],
    sections: [],
    mediums: [],
    streams: [],
    feeTypes: [],
    staff: [],
    categories: [],
    fundSources: [],
    students: [],
  });

  // Selected Report & Config Drawer State
  const [activeReport, setActiveReport] = useState(null);
  const [isConfigDrawerOpen, setIsConfigDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({});

  // Report Data & View State
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'preview'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportResult, setReportResult] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // PDF Preview Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfData, setPdfData] = useState(null);
  const [actionLoading, setActionLoading] = useState({ pdf: false, print: false, csv: false });

  // Load filter options on mount
  useEffect(() => {
    const loadOptions = async () => {
      const opts = await reportService.fetchFilterOptions();
      setFilterOptions(opts);
    };
    loadOptions();
  }, []);

  // Filter report list based on search and category
  const filteredReports = useMemo(() => {
    return REPORT_REGISTRY.filter((report) => {
      const matchesCategory = activeCategory === 'all' || report.category === activeCategory;
      const matchesSearch =
        searchQuery === '' ||
        report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Sync academicYearId filter whenever global selectedYearId changes
  useEffect(() => {
    if (selectedYearId && activeReport?.filters?.includes('academicYearId')) {
      const updatedFilters = {
        ...filters,
        academicYearId: selectedYearId,
      };
      setFilters(updatedFilters);
      if (viewMode === 'preview') {
        handleGenerateReport(1, updatedFilters);
      }
    }
  }, [selectedYearId]);

  // Open Configuration Drawer when user clicks [ Generate ]
  const handleOpenConfig = (report) => {
    setActiveReport(report);
    // Reset filters cleanly to defaults for this report
    const initialFilters = {};
    if (report.filters.includes('academicYearId')) {
      initialFilters.academicYearId = selectedYearId || '';
    }
    setFilters(initialFilters);
    setIsConfigDrawerOpen(true);
  };

  // Add report to recent reports list in localStorage
  const trackRecentReport = (report) => {
    setRecentReports((prev) => {
      const updated = [report.id, ...prev.filter((id) => id !== report.id)].slice(0, 5);
      localStorage.setItem('recent_reports', JSON.stringify(updated));
      return updated;
    });
  };

  // Execute report generation backend call
  const handleGenerateReport = async (pageToFetch = 1, customFilters = null) => {
    if (!activeReport) return;

    const activeFilters = customFilters || filters;

    setLoading(true);
    setError(null);
    setIsConfigDrawerOpen(false);
    setViewMode('preview');
    trackRecentReport(activeReport);

    try {
      const params = {
        ...activeFilters,
        page: pageToFetch,
        limit: 20,
      };

      const res = await reportService.fetchReport(activeReport.endpoint, params);
      setReportResult(res);
      setCurrentPage(pageToFetch);
    } catch (err) {
      console.error('Report execution failed', err);
      setError(err.message || 'Failed to generate report data.');
      toast.error('Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  // Filter input change handler
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Export CSV Action
  const handleExportCSV = () => {
    if (!activeReport || !reportResult) return;
    setActionLoading((prev) => ({ ...prev, csv: true }));

    try {
      const rawData = reportResult.data || [];
      const columns = activeReport.columns || [];
      const filename = `${activeReport.id}_${new Date().toISOString().split('T')[0]}.csv`;

      exportToCSV(rawData, columns, filename);
      toast.success('CSV exported successfully.');
    } catch (err) {
      toast.error('Failed exporting CSV.');
    } finally {
      setActionLoading((prev) => ({ ...prev, csv: false }));
    }
  };

  // Prepare PDF data payload
  const preparePdfPayload = () => {
    if (!activeReport || !reportResult) return null;
    return {
      schoolHeader,
      reportMeta: {
        title: activeReport.title,
      },
      data: reportResult.data || [],
      columns: activeReport.columns || [],
      summary: reportResult.summary || {},
      filtersApplied: filters,
    };
  };


  // Generate PDF modal preview
  const handleOpenPdfModal = () => {
    const payload = preparePdfPayload();
    if (!payload) return;
    setPdfData(payload);
    setIsPdfModalOpen(true);
  };

  // Direct Print PDF Action
  const handleDirectPrint = async () => {
    const payload = preparePdfPayload();
    if (!payload) return;
    setActionLoading((prev) => ({ ...prev, print: true }));

    try {
      const { printPdfDocument } = await import('../../core/documents/documentEngine.js');
      await printPdfDocument({
        templateId: activeReport.pdfTemplate || 'genericReport',
        data: payload,
      });
    } catch (err) {
      toast.error('Failed printing report document.');
    } finally {
      setActionLoading((prev) => ({ ...prev, print: false }));
    }
  };

  // Helper to translate raw filter IDs to clean human-readable names
  const getFilterHumanLabel = (key, val) => {
    if (!val) return null;

    switch (key) {
      case 'academicYearId': {
        const yr = academicYears.find((y) => y.id === val);
        return { label: 'Academic Year', value: yr ? yr.name : val };
      }
      case 'classId': {
        const cls = filterOptions.classes.find((c) => c.id === val);
        return { label: 'Class', value: cls ? cls.name : val };
      }
      case 'sectionId': {
        const sec = filterOptions.sections.find((s) => s.id === val);
        return { label: 'Section', value: sec ? sec.name : val };
      }
      case 'mediumId': {
        const med = filterOptions.mediums.find((m) => m.id === val);
        return { label: 'Medium', value: med ? med.name : val };
      }
      case 'streamId': {
        const str = filterOptions.streams.find((s) => s.id === val);
        return { label: 'Stream', value: str ? str.name : val };
      }
      case 'feeTypeId': {
        const ft = filterOptions.feeTypes.find((f) => f.id === val);
        return { label: 'Fee Type', value: ft ? ft.name : val };
      }
      case 'categoryId': {
        const cat = filterOptions.categories.find((c) => c.id === val);
        return { label: 'Category', value: cat ? cat.name : val };
      }
      case 'fundSourceId': {
        const fs = filterOptions.fundSources.find((f) => f.id === val);
        return { label: 'Fund Source', value: fs ? fs.name : val };
      }
      case 'staffId': {
        const st = filterOptions.staff.find((s) => s.id === val);
        return { label: 'Staff Member', value: st ? `${st.name} (${st.employeeId})` : val };
      }
      case 'studentId': {
        const st = filterOptions.students.find((s) => s.id === val);
        return { label: 'Student', value: st ? `${st.name} (${st.admissionNo})` : val };
      }
      case 'startDate':
        return { label: 'From Date', value: val };
      case 'endDate':
        return { label: 'To Date', value: val };
      case 'paymentMode':
        return { label: 'Payment Mode', value: val.replace(/_/g, ' ') };
      case 'status':
        return { label: 'Status', value: val };
      case 'search':
        return { label: 'Search Query', value: `"${val}"` };
      default: {
        const cleanKey = key.replace(/([A-Z])/g, ' $1');
        return { label: cleanKey.charAt(0).toUpperCase() + cleanKey.slice(1), value: String(val) };
      }
    }
  };

  // Cell Value Formatter
  const formatCellValue = (val, col) => {
    if (val === null || val === undefined || val === '') return '-';

    if (col.type === 'currency') {
      return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }
    if (col.type === 'date' && val) {
      return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (col.type === 'badge') {
      const badgeVariant =
        val === 'ACTIVE' || val === 'SUCCESS' || val === 'CREDIT' || val === 'PAID'
          ? 'success'
          : val === 'UNPAID' || val === 'DEBIT' || val === 'PARTIAL' || val === 'LEFT'
            ? 'danger'
            : 'warning';
      return <Badge variant={badgeVariant}>{String(val).replace(/_/g, ' ')}</Badge>;
    }

    // Replace enum underscores
    if (typeof val === 'string' && val.includes('_') && val === val.toUpperCase()) {
      return val.replace(/_/g, ' ');
    }

    return String(val);
  };

  return (
    <div className="space-y-6">
      {/* Module Page Header */}
      <ModulePageHeader
        title="Reports & Analytics Center"
        description="Generate, view, print, and export business reports across students, academics, fees, payroll, and finance."
        icon={BarChart3}
      />

      {/* Main View Mode Handler */}
      {viewMode === 'list' ? (
        <div className="space-y-6">
          {/* Top Controls: Search Bar & Category Tabs */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              {/* Live Search */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search reports by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                />
              </div>
            </div>

            {/* Category Navigation Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {REPORT_CATEGORIES.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.id] || FileSpreadsheet;
                const isActive = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${isActive
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Reports Bar */}
          {recentReports.length > 0 && searchQuery === '' && activeCategory === 'all' && (
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 mb-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Recently Generated Reports</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentReports.map((id) => {
                  const rep = getReportById(id);
                  if (!rep) return null;
                  return (
                    <button
                      key={rep.id}
                      onClick={() => handleOpenConfig(rep)}
                      className="px-3 py-1.5 bg-white border border-indigo-200/60 hover:border-indigo-400 rounded-lg text-xs font-semibold text-indigo-700 shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      <span>{rep.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reports Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
              Available Reports ({filteredReports.length})
            </h3>

            {filteredReports.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">No Reports Found</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Try clearing your search query or selecting another category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {report.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {report.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {report.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {report.filters.length} Dynamic Filters
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenConfig(report)}
                        className="py-1 px-3 text-xs"
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Report Data Preview View */
        <div className="space-y-5">
          {/* Top Header Action Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('list')}
                className="shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div>
                <h2 className="text-sm font-bold text-slate-900">{activeReport?.title}</h2>
                <p className="text-[11px] text-slate-500">{activeReport?.description}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 overflow-x-auto shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfigDrawerOpen(true)}
              >
                <Filter className="w-3.5 h-3.5 mr-1" />
                Configure Filters
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDirectPrint}
                disabled={loading || actionLoading.print}
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Print
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenPdfModal}
                disabled={loading}
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Generate PDF
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleExportCSV}
                disabled={loading || actionLoading.csv}
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Active Applied Filter Badges with Human Labels */}
          {Object.keys(filters).length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-700">Applied Filters:</span>
              {Object.entries(filters).map(([k, v]) => {
                if (!v) return null;
                const formatted = getFilterHumanLabel(k, v);
                if (!formatted) return null;

                return (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-200 font-medium text-indigo-700 text-[11px]"
                  >
                    {formatted.label}: <strong className="text-slate-900">{formatted.value}</strong>
                  </span>
                );
              })}
            </div>
          )}

          {/* Special Header Banner for Student/Staff Ledgers */}
          {reportResult?.student && (
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Student Fee Ledger: {reportResult.student.name}
                </h4>
                <p className="text-[11px] text-slate-600 font-mono">
                  Admission No: {reportResult.student.admissionNo} | Phone: {reportResult.student.phone || 'N/A'}
                </p>
              </div>
            </div>
          )}

          {reportResult?.staff && (
            <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {activeReport?.title || 'Staff Statement'}: {reportResult.staff.name}
                </h4>
                <p className="text-[11px] text-slate-600 font-mono">
                  Employee ID: {reportResult.staff.employeeId} | Dept: {reportResult.staff.department || 'General'} | Designation: {reportResult.staff.designation || 'Staff'}
                </p>
              </div>
            </div>
          )}


          {/* Loading Skeleton */}
          {loading ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-700">Generating report data, please wait...</p>
            </div>
          ) : error ? (
            /* Error State */
            <div className="bg-rose-50 p-8 text-center rounded-2xl border border-rose-200 text-rose-700 space-y-3">
              <p className="text-xs font-bold">{error}</p>
              <Button variant="outline" size="sm" onClick={() => handleGenerateReport(1)}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Retry
              </Button>
            </div>
          ) : reportResult ? (
            <div className="space-y-5">
              {/* Summary Cards Grid */}
              {reportResult.summary && Object.keys(reportResult.summary).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(reportResult.summary).map(([key, value]) => {
                    if (typeof value === 'object' && value !== null) return null;

                    const label = key.replace(/([A-Z])/g, ' $1').toUpperCase();
                    const isAmount =
                      key.toLowerCase().includes('amount') ||
                      key.toLowerCase().includes('collection') ||
                      key.toLowerCase().includes('expense') ||
                      key.toLowerCase().includes('total') ||
                      key.toLowerCase().includes('outstanding') ||
                      key.toLowerCase().includes('balance');

                    const displayValue = isAmount
                      ? `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                      : String(value);

                    return (
                      <div
                        key={key}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs"
                      >
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {label}
                        </p>
                        <p className="text-sm sm:text-base font-bold text-slate-900 mt-1 truncate">
                          {displayValue}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Table Data View */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        {activeReport?.columns?.map((col) => (
                          <th
                            key={col.key}
                            className={`p-3.5 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Array.isArray(reportResult.data) && reportResult.data.length > 0 ? (
                        reportResult.data.map((row, idx) => (
                          <tr
                            key={row.id || idx}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            {activeReport?.columns?.map((col) => (
                              <td
                                key={col.key}
                                className={`p-3.5 font-medium text-slate-700 whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'
                                  } ${col.bold ? 'font-bold text-slate-900' : ''}`}
                              >
                                {formatCellValue(row[col.key], col)}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={activeReport?.columns?.length || 1}
                            className="p-12 text-center text-slate-500 text-xs"
                          >
                            No records found for the selected report filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {reportResult.pagination && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <Pagination
                      currentPage={reportResult.pagination.page}
                      totalPages={reportResult.pagination.totalPages}
                      onPageChange={(p) => handleGenerateReport(p)}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Dynamic Report Filter Drawer */}
      <Drawer
        isOpen={isConfigDrawerOpen}
        onClose={() => setIsConfigDrawerOpen(false)}
        title={`${activeReport?.title || 'Report'} Configurations`}
        position="right"
      >
        <div className="space-y-5 p-1">
          <p className="text-xs text-slate-500">
            Configure parameters and click <strong>Preview Report</strong> to load data.
          </p>

          {/* Academic Year Filter */}
          {activeReport?.filters?.includes('academicYearId') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
              <select
                value={filters.academicYearId || ''}
                onChange={(e) => handleFilterChange('academicYearId', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Academic Years</option>
                {academicYears.map((yr) => (
                  <option key={yr.id} value={yr.id}>
                    {yr.name} {yr.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Student Selector Filter */}
          {activeReport?.filters?.includes('studentId') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Student</label>
              <select
                value={filters.studentId || ''}
                onChange={(e) => handleFilterChange('studentId', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">-- Choose Student --</option>
                {filterOptions.students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.admissionNo})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Staff Selector Filter */}
          {activeReport?.filters?.includes('staffId') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Staff Member</label>
              <select
                value={filters.staffId || ''}
                onChange={(e) => handleFilterChange('staffId', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Staff Members</option>
                {filterOptions.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.employeeId})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Filters */}
          {activeReport?.filters?.includes('startDate') && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>
            </div>
          )}

          {/* Class Filter */}
          {activeReport?.filters?.includes('classId') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Class</label>
              <select
                value={filters.classId || ''}
                onChange={(e) => handleFilterChange('classId', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Classes</option>
                {filterOptions.classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Section Filter */}
          {activeReport?.filters?.includes('sectionId') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Section</label>
              <select
                value={filters.sectionId || ''}
                onChange={(e) => handleFilterChange('sectionId', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Sections</option>
                {filterOptions.sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Medium Filter */}
          {activeReport?.filters?.includes('mediumId') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Medium</label>
              <select
                value={filters.mediumId || ''}
                onChange={(e) => handleFilterChange('mediumId', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Mediums</option>
                {filterOptions.mediums.map((med) => (
                  <option key={med.id} value={med.id}>
                    {med.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Stream Filter */}
          {activeReport?.filters?.includes('streamId') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Stream</label>
              <select
                value={filters.streamId || ''}
                onChange={(e) => handleFilterChange('streamId', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Streams</option>
                {filterOptions.streams.map((str) => (
                  <option key={str.id} value={str.id}>
                    {str.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fee Type Filter */}
          {activeReport?.filters?.includes('feeTypeId') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fee Type</label>
              <select
                value={filters.feeTypeId || ''}
                onChange={(e) => handleFilterChange('feeTypeId', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Fee Types</option>
                {filterOptions.feeTypes.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Expense Category Filter */}
          {activeReport?.filters?.includes('categoryId') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expense Category</label>
              <select
                value={filters.categoryId || ''}
                onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Categories</option>
                {filterOptions.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Fund Source Filter */}
          {activeReport?.filters?.includes('fundSourceId') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Fund Source</label>
              <select
                value={filters.fundSourceId || ''}
                onChange={(e) => handleFilterChange('fundSourceId', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Fund Sources</option>
                {filterOptions.fundSources.map((fs) => (
                  <option key={fs.id} value={fs.id}>
                    {fs.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Mode Filter */}
          {activeReport?.filters?.includes('paymentMode') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={filters.paymentMode || ''}
                onChange={(e) => handleFilterChange('paymentMode', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Payment Modes</option>
                <option value="CASH">CASH</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">BANK TRANSFER</option>
                <option value="CHEQUE">CHEQUE</option>
                <option value="DEMAND_DRAFT">DEMAND DRAFT</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          )}

          {/* Staff Department Filter */}
          {activeReport?.filters?.includes('department') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
              <input
                type="text"
                placeholder="e.g. Science, Mathematics, Administration..."
                value={filters.department || ''}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              />
            </div>
          )}

          {/* Status Filter */}
          {activeReport?.filters?.includes('status') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="LEFT">LEFT</option>
                <option value="UNPAID">UNPAID</option>
                <option value="PARTIAL">PARTIAL</option>
                <option value="PAID">PAID</option>
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setFilters({})}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={() => handleGenerateReport(1)}
            >
              Preview Report
            </Button>
          </div>
        </div>
      </Drawer>

      {/* PDF Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        templateId={activeReport?.pdfTemplate || 'genericReport'}
        data={pdfData}
        filename={`${activeReport?.id || 'Report'}.pdf`}
        title={activeReport?.title || 'Report PDF Document'}
      />
    </div>
  );
};

export default ReportsPage;
