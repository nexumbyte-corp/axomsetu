import React, { useState, useEffect } from 'react';
import { reportService } from '../../services/report.service.js';
import { exportToCSV } from '../../utils/csvExport.js';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { DocumentPreviewModal } from '../../components/documents/DocumentPreviewModal.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { printPdfDocument } from '../../core/documents/documentEngine.js';
import { Printer, Download, FileText, Filter, RefreshCw } from 'lucide-react';


export const IndividualStaffAdvanceReportModal = ({
  isOpen = false,
  onClose,
  staffId = null,
  staffName = '',
}) => {
  const { user } = useAuth();
  const schoolHeader = user?.schoolAdmins?.[0]?.school || user?.school || {};

  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState(null);

  // PDF Preview State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfPayload, setPdfPayload] = useState(null);


  const fetchLedger = async (customStartDate = startDate, customEndDate = endDate) => {
    if (!staffId) return;

    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (customStartDate) params.startDate = customStartDate;
      if (customEndDate) params.endDate = customEndDate;

      const res = await reportService.fetchIndividualStaffAdvanceLedger(staffId, params);
      setReportResult(res);
    } catch (err) {
      console.error('Failed to load individual staff advance ledger:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch advance report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && staffId) {
      fetchLedger();
    } else {
      setReportResult(null);
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen, staffId]);

  if (!isOpen) return null;

  const staff = reportResult?.staff || {};
  const ledger = reportResult?.data || [];
  const summary = reportResult?.summary || { totalAdvances: 0, totalRecovered: 0, totalOutstandingBalance: 0 };

  const columns = [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'type', label: 'Type', type: 'badge' },
    { key: 'description', label: 'Description', bold: true },
    { key: 'refNo', label: 'Ref / Voucher #' },
    { key: 'disbursedAmount', label: 'Disbursed (₹)', type: 'currency', align: 'right' },
    { key: 'recoveredAmount', label: 'Recovered (₹)', type: 'currency', align: 'right' },
    { key: 'balance', label: 'Advance Balance (₹)', type: 'currency', align: 'right', bold: true },
  ];

  const preparePdfData = () => {
    return {
      schoolHeader,
      reportMeta: {
        title: `Staff Advance Statement - ${staff.name || staffName || 'Staff Member'}`,
      },
      data: ledger,
      columns,
      summary,
      filtersApplied: {
        ...(staff.name && { 'Staff Name': `${staff.name} (${staff.employeeId})` }),
        ...(startDate && { 'From Date': startDate }),
        ...(endDate && { 'To Date': endDate }),
      },
    };
  };


  const handleOpenPdf = () => {
    const payload = preparePdfData();
    setPdfPayload(payload);
    setIsPdfModalOpen(true);
  };

  const handleDirectPrint = async () => {
    try {
      const payload = preparePdfData();
      await printPdfDocument({
        templateId: 'genericReport',
        data: payload,
      });
    } catch (err) {
      toast.error('Failed printing advance statement.');
    }
  };

  const handleExportCSV = () => {
    try {
      const filename = `Staff_Advance_Report_${staff.employeeId || 'Staff'}_${new Date().toISOString().split('T')[0]}.csv`;
      exportToCSV(ledger, columns, filename);
      toast.success('CSV exported successfully.');
    } catch (err) {
      toast.error('Failed exporting CSV.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Individual Staff Advance Report: ${staff.name || staffName}`}
      size="xl"
    >
      <div className="space-y-5">
        {/* Staff Profile Header Banner */}
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-extrabold text-lg text-indigo-300">
              {staff.name ? staff.name.charAt(0) : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{staff.name || staffName}</h3>
                <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono text-[10px] font-bold">
                  {staff.employeeId || '-'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Dept: <span className="font-semibold text-white">{staff.department || 'General'}</span> | Designation:{' '}
                <span className="font-semibold text-white">{staff.designation || 'Staff'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDirectPrint} disabled={loading || ledger.length === 0} className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Printer className="w-3.5 h-3.5 mr-1" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleOpenPdf} disabled={loading || ledger.length === 0} className="bg-white/10 text-white border-white/20 hover:bg-white/20">
              <FileText className="w-3.5 h-3.5 mr-1" />
              PDF Report
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={loading || ledger.length === 0}>
              <Download className="w-3.5 h-3.5 mr-1" />
              CSV
            </Button>
          </div>
        </div>

        {/* Date Filters Bar */}
        <div className="flex flex-col sm:flex-row items-end gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex-1 grid grid-cols-2 gap-3 w-full">
            <Input
              label="From Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white text-xs"
            />
            <Input
              label="To Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => fetchLedger(startDate, endDate)} loading={loading}>
              <Filter className="w-3.5 h-3.5 mr-1" />
              Filter
            </Button>
            {(startDate || endDate) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  fetchLedger('', '');
                }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Metric Cards Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Disbursed</span>
            <p className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
              ₹{Number(summary.totalDisbursed || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Recovered</span>
            <p className="text-base font-extrabold text-emerald-600 font-mono mt-0.5">
              ₹{Number(summary.totalRecovered || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending / Allocated</span>
            <p className="text-base font-extrabold text-amber-600 font-mono mt-0.5">
              ₹{Number(summary.pendingRecovery || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>

          <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Available for New Payroll</span>
            <p className="text-base font-extrabold text-indigo-600 font-mono mt-0.5">
              ₹{Number(summary.availableForAllocation || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </Card>
        </div>

        {/* Ledger Table */}
        <Card className="overflow-hidden border border-slate-200 shadow-2xs">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-xs text-rose-600 space-y-2">
              <p className="font-bold">{error}</p>
              <Button variant="outline" size="sm" onClick={() => fetchLedger()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Retry
              </Button>
            </div>
          ) : ledger.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No advance disbursement or recovery records found for this staff member.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-center">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 font-mono">Ref / Voucher #</th>
                    <th className="py-3 px-4 text-right">Disbursed (₹)</th>
                    <th className="py-3 px-4 text-right">Recovered (₹)</th>
                    <th className="py-3 px-4 text-right">Advance Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {ledger.map((item) => {
                    const isDisbursed = item.type === 'DISBURSEMENT';
                    const isPending = item.type === 'RECOVERY_PENDING';
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-800 whitespace-nowrap">
                          {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          {isDisbursed ? (
                            <Badge variant="warning" size="sm">DISBURSED</Badge>
                          ) : isPending ? (
                            <Badge variant="neutral" size="sm">ALLOCATED</Badge>
                          ) : (
                            <Badge variant="success" size="sm">RECOVERED</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-900 font-semibold max-w-xs truncate">
                          {item.description}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {item.refNo}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {item.disbursedAmount > 0 ? (
                            `₹${item.disbursedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {item.recoveredAmount > 0 ? (
                            `₹${item.recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-indigo-700">
                          ₹{item.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

      {/* PDF Document Preview Modal */}
      {isPdfModalOpen && (
        <DocumentPreviewModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          templateId="genericReport"
          data={pdfPayload}
          filename={`Staff_Advance_Report_${staff.employeeId || 'Staff'}.pdf`}
          title={`Staff Advance Report PDF - ${staff.name || staffName}`}
        />
      )}
    </Modal>
  );
};
