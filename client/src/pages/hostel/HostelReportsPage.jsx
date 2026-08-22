import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Building,
  Bed,
  CreditCard,
  LogOut,
  ArrowLeftRight,
  Search,
  Download,
  Filter,
  RefreshCw,
  Sparkles,
  DoorOpen,
} from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { useAcademicYear } from '../../context/AcademicYearContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { formatStudentClassInfo } from '../../utils/hostelUtils.js';
import { formatDate } from '../../utils/formatters.js';
import { exportToCSV } from '../../utils/csvExport.js';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';
import { StudentDetailsCell } from '../../components/hostel/StudentDetailsCell.jsx';
import { StudentPhotoModal } from '../../components/hostel/StudentPhotoModal.jsx';

export const HostelReportsPage = () => {
  const { currentAcademicYear, academicYears } = useAcademicYear();

  const [reportType, setReportType] = useState('residents'); // 'residents' | 'occupancy' | 'availability' | 'admissions' | 'transfers' | 'exits' | 'fees'
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [selectedPhotoStudent, setSelectedPhotoStudent] = useState(null);

  // Filters
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feeStatus, setFeeStatus] = useState('ALL');
  const [availabilityStatus, setAvailabilityStatus] = useState('ALL');
  const [hostels, setHostels] = useState([]);

  useEffect(() => {
    if (currentAcademicYear) {
      setSelectedAcademicYearId(currentAcademicYear.id);
    }
    fetchHostels();
  }, [currentAcademicYear]);

  useEffect(() => {
    fetchReport();
  }, [
    reportType,
    selectedAcademicYearId,
    selectedHostelId,
    startDate,
    endDate,
    feeStatus,
    availabilityStatus,
    searchQuery,
  ]);

  const fetchHostels = async () => {
    try {
      const res = await hostelService.listHostels();
      setHostels(res.data || []);
    } catch (err) {
      console.error('Failed to load hostels list:', err);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {
        academicYearId: selectedAcademicYearId || undefined,
        hostelId: selectedHostelId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchQuery.trim() || undefined,
      };

      if (reportType === 'fees' && feeStatus !== 'ALL') {
        params.status = feeStatus;
      }

      if (reportType === 'availability' && availabilityStatus !== 'ALL') {
        params.availabilityStatus = availabilityStatus;
      }

      const res = await hostelService.getReport(reportType, params);
      setReportData(res.data);
    } catch (err) {
      console.error('Hostel Report Load Error:', err);
      toast.error(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedHostelId('');
    setStartDate('');
    setEndDate('');
    setFeeStatus('ALL');
    setAvailabilityStatus('ALL');
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (!reportData) {
      toast.error('No report data to export');
      return;
    }

    const hostelNameText = hostels.find((h) => h.id === selectedHostelId)?.name || 'All_Hostels';
    const timestamp = new Date().toISOString().split('T')[0];

    if (reportType === 'residents') {
      const list = Array.isArray(reportData) ? reportData : [];
      const columns = [
        { key: 'studentName', label: 'Student Name' },
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'className', label: 'Class' },
        { key: 'sectionName', label: 'Section' },
        { key: 'hostelName', label: 'Hostel' },
        { key: 'roomNumber', label: 'Room' },
        { key: 'bedNumber', label: 'Bed' },
        { key: 'guardianName', label: 'Guardian' },
        { key: 'phone', label: 'Phone' },
        { key: 'startDate', label: 'Start Date' },
        { key: 'status', label: 'Status' },
      ];
      exportToCSV(list, columns, `Hostel_Residents_${hostelNameText}_${timestamp}.csv`);
    } else if (reportType === 'occupancy') {
      const list = Array.isArray(reportData) ? reportData : [];
      const columns = [
        { key: 'hostelName', label: 'Hostel Name' },
        { key: 'type', label: 'Gender Type' },
        { key: 'totalRooms', label: 'Total Rooms' },
        { key: 'totalBeds', label: 'Total Beds' },
        { key: 'occupiedBeds', label: 'Occupied Beds' },
        { key: 'availableBeds', label: 'Available Beds' },
        { key: 'occupancyRate', label: 'Occupancy Rate (%)' },
      ];
      exportToCSV(list, columns, `Hostel_Occupancy_${timestamp}.csv`);
    } else if (reportType === 'availability') {
      const list = Array.isArray(reportData) ? reportData : [];
      const mapped = list.map((r) => ({
        ...r,
        bedList: Array.isArray(r.availableBedNumbers) ? r.availableBedNumbers.join(', ') : 'None',
      }));
      const columns = [
        { key: 'hostelName', label: 'Hostel' },
        { key: 'roomNumber', label: 'Room Number' },
        { key: 'floor', label: 'Floor' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'occupiedBedsCount', label: 'Occupied' },
        { key: 'availableBedsCount', label: 'Available' },
        { key: 'bedList', label: 'Available Beds' },
      ];
      exportToCSV(mapped, columns, `Hostel_Bed_Availability_${timestamp}.csv`);
    } else if (reportType === 'admissions') {
      const list = Array.isArray(reportData) ? reportData : [];
      const columns = [
        { key: 'startDate', label: 'Admission Date' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'className', label: 'Class' },
        { key: 'sectionName', label: 'Section' },
        { key: 'hostelName', label: 'Hostel' },
        { key: 'roomNumber', label: 'Room' },
        { key: 'bedNumber', label: 'Bed' },
        { key: 'guardianName', label: 'Guardian' },
        { key: 'phone', label: 'Phone' },
      ];
      exportToCSV(list, columns, `Hostel_Admissions_${timestamp}.csv`);
    } else if (reportType === 'transfers') {
      const list = Array.isArray(reportData) ? reportData : [];
      const columns = [
        { key: 'transferDate', label: 'Transfer Date' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'className', label: 'Class' },
        { key: 'fromHostelName', label: 'From Hostel' },
        { key: 'fromRoomNumber', label: 'From Room' },
        { key: 'fromBedNumber', label: 'From Bed' },
        { key: 'toHostelName', label: 'To Hostel' },
        { key: 'toRoomNumber', label: 'To Room' },
        { key: 'toBedNumber', label: 'To Bed' },
        { key: 'reason', label: 'Reason' },
      ];
      exportToCSV(list, columns, `Hostel_Transfers_${timestamp}.csv`);
    } else if (reportType === 'exits') {
      const list = Array.isArray(reportData) ? reportData : [];
      const columns = [
        { key: 'effectiveDate', label: 'Hostel Effective Date' },
        { key: 'endDate', label: 'Exit Date' },
        { key: 'studentName', label: 'Student Name' },
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'className', label: 'Class' },
        { key: 'hostelName', label: 'Hostel' },
        { key: 'roomNumber', label: 'Room' },
        { key: 'bedNumber', label: 'Bed' },
        { key: 'exitReason', label: 'Exit Reason' },
      ];
      exportToCSV(list, columns, `Hostel_Exits_${timestamp}.csv`);
    } else if (reportType === 'fees') {
      const charges = reportData?.charges || [];
      const columns = [
        { key: 'studentName', label: 'Student Name' },
        { key: 'admissionNo', label: 'Admission No' },
        { key: 'className', label: 'Class' },
        { key: 'hostelName', label: 'Hostel' },
        { key: 'roomNumber', label: 'Room' },
        { key: 'bedNumber', label: 'Bed' },
        { key: 'title', label: 'Fee Title' },
        { key: 'month', label: 'Month' },
        { key: 'amount', label: 'Amount (₹)' },
        { key: 'paidAmount', label: 'Paid (₹)' },
        { key: 'dueAmount', label: 'Due (₹)' },
        { key: 'status', label: 'Status' },
      ];
      exportToCSV(charges, columns, `Hostel_Fees_Ledger_${timestamp}.csv`);
    }
  };

  // Compute Active Tab Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (!reportData) return null;

    if (reportType === 'residents') {
      const count = Array.isArray(reportData) ? reportData.length : 0;
      return { label: 'Active Residents', value: count, sub: 'Currently residing in hostel rooms' };
    }
    if (reportType === 'occupancy') {
      const list = Array.isArray(reportData) ? reportData : [];
      const totalBeds = list.reduce((acc, h) => acc + (h.totalBeds || 0), 0);
      const occupied = list.reduce((acc, h) => acc + (h.occupiedBeds || 0), 0);
      const available = list.reduce((acc, h) => acc + (h.availableBeds || 0), 0);
      const rate = totalBeds > 0 ? Math.round((occupied / totalBeds) * 100) : 0;
      return {
        label: 'Overall Occupancy',
        value: `${rate}%`,
        sub: `${occupied} Occupied / ${available} Free of ${totalBeds} Total Beds`,
      };
    }
    if (reportType === 'availability') {
      const list = Array.isArray(reportData) ? reportData : [];
      const freeBeds = list.reduce((acc, r) => acc + (r.availableBedsCount || 0), 0);
      return { label: 'Available Beds', value: freeBeds, sub: `Across ${list.length} monitored rooms` };
    }
    if (reportType === 'admissions') {
      const count = Array.isArray(reportData) ? reportData.length : 0;
      return { label: 'Admissions Logged', value: count, sub: 'Hostel enrollments in selected duration' };
    }
    if (reportType === 'transfers') {
      const count = Array.isArray(reportData) ? reportData.length : 0;
      return { label: 'Transfers Recorded', value: count, sub: 'Room / bed shifts across hostels' };
    }
    if (reportType === 'exits') {
      const count = Array.isArray(reportData) ? reportData.length : 0;
      return { label: 'Hostel Exits', value: count, sub: 'Total students checked out / exited' };
    }
    if (reportType === 'fees' && reportData?.summary) {
      return {
        label: 'Hostel Collections',
        value: `₹${(reportData.summary.totalPaid || 0).toLocaleString()}`,
        sub: `₹${(reportData.summary.totalUnpaid || 0).toLocaleString()} Outstanding dues`,
      };
    }
    return null;
  }, [reportData, reportType]);

  const selectedHostelName = hostels.find((h) => h.id === selectedHostelId)?.name || 'All Hostels';

  return (
    <div className="space-y-4 text-xs">
      {/* Report Selection Tabs */}
      <div className="flex space-x-1.5 bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto border border-slate-200 shadow-2xs">
        {[
          { id: 'residents', label: 'Current Residents', icon: Users },
          { id: 'occupancy', label: 'Hostel Occupancy', icon: Building },
          { id: 'availability', label: 'Bed Availability', icon: Bed },
          { id: 'admissions', label: 'Admissions Log', icon: DoorOpen },
          { id: 'transfers', label: 'Transfers Log', icon: ArrowLeftRight },
          { id: 'exits', label: 'Exits Log', icon: LogOut },
          { id: 'fees', label: 'Hostel Fees Ledger', icon: CreditCard },
        ].map((r) => {
          const Icon = r.icon;
          const isActive = reportType === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`flex items-center px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-indigo-600 shadow-sm font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className={`w-4 h-4 mr-1.5 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Filter & Action Controls Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="w-52 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student / room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Academic Year */}
          <div className="w-44">
            <Select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="py-1 text-xs"
            >
              {academicYears?.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Hostel Filter */}
          <div className="w-44">
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

          {/* Specific filter for Availability tab */}
          {reportType === 'availability' && (
            <div className="w-44">
              <Select
                value={availabilityStatus}
                onChange={(e) => setAvailabilityStatus(e.target.value)}
                className="py-1 text-xs"
              >
                <option value="ALL">All Rooms</option>
                <option value="AVAILABLE">Rooms with Free Beds</option>
                <option value="FULL">Fully Occupied Rooms</option>
              </Select>
            </div>
          )}

          {/* Specific filter for Fees tab */}
          {reportType === 'fees' && (
            <div className="w-36">
              <Select
                value={feeStatus}
                onChange={(e) => setFeeStatus(e.target.value)}
                className="py-1 text-xs"
              >
                <option value="ALL">All Fee Status</option>
                <option value="PAID">Paid Only</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="UNPAID">Unpaid Only</option>
              </Select>
            </div>
          )}

          {/* Date Range filters (for logs & fees) */}
          {['admissions', 'transfers', 'exits', 'fees'].includes(reportType) && (
            <>
              <div className="w-40">
                <DatePicker
                  placeholder="From Date"
                  value={startDate}
                  onChange={(val) => setStartDate(val)}
                  className="py-0.5 text-xs"
                />
              </div>
              <div className="w-40">
                <DatePicker
                  placeholder="To Date"
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                  className="py-0.5 text-xs"
                />
              </div>
            </>
          )}

          {/* Reset Filters button */}
          {(searchQuery || selectedHostelId || startDate || endDate || feeStatus !== 'ALL' || availabilityStatus !== 'ALL') && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-indigo-600 font-semibold px-2 py-1 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Action Controls (PDF Download & CSV Export) */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || !reportData}
            className="text-slate-700 hover:text-slate-900 border-slate-200"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
            Export CSV
          </Button>

          <DocumentActions
            templateId="hostelReport"
            data={{
              reportData,
              reportType,
              hostelName: selectedHostelName,
            }}
            filename={`Hostel_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`}
            title={`Hostel Report - ${reportType.toUpperCase()}`}
            variant="full"
          />
        </div>
      </div>

      {/* Summary KPI Banner */}
      {summaryMetrics && !loading && (
        <div className="bg-gradient-to-r from-indigo-50/70 via-indigo-50/40 to-slate-50 border border-indigo-100 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {summaryMetrics.label} ({selectedHostelName})
              </div>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {summaryMetrics.value}
              </div>
            </div>
          </div>
          <div className="text-xs font-medium text-slate-600 bg-white/80 px-3 py-1.5 rounded-xl border border-indigo-100/60 shadow-2xs">
            {summaryMetrics.sub}
          </div>
        </div>
      )}

      {/* Report Data Display */}
      {loading ? (
        <Card className="p-16 flex flex-col items-center justify-center space-y-3 text-slate-500">
          <Spinner size="lg" />
          <span className="font-semibold text-xs text-slate-600">Generating hostel report...</span>
        </Card>
      ) : !reportData || (Array.isArray(reportData) && reportData.length === 0) || (reportType === 'fees' && (!reportData.charges || reportData.charges.length === 0)) ? (
        <Card className="p-12 text-center text-xs text-slate-500 space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Filter className="w-6 h-6" />
          </div>
          <div className="font-bold text-slate-800 text-sm">No records found</div>
          <p className="text-slate-500 max-w-sm mx-auto">
            No hostel records match the applied criteria. Try changing academic year, hostel filter, date range, or clear search queries.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* REPORT 1: RESIDENTS */}
          {reportType === 'residents' && Array.isArray(reportData) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-slate-50/80 font-bold text-slate-800 border-b border-slate-200 text-xs flex justify-between items-center">
                <span>Active Residents Directory ({reportData.length} Students)</span>
                <span className="text-[11px] font-normal text-slate-500">{selectedHostelName}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Student Details (Name, Adm No, Guardian)</th>
                      <th className="px-4 py-2.5 text-left">Class & Section</th>
                      <th className="px-4 py-2.5 text-left">Hostel</th>
                      <th className="px-4 py-2.5 text-left">Room & Bed</th>
                      <th className="px-4 py-2.5 text-left">Start Date</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-2.5">
                          <StudentDetailsCell student={r} onPhotoClick={setSelectedPhotoStudent} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium">{formatStudentClassInfo(r)}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-800">{r.hostelName}</td>
                        <td className="px-4 py-2.5 text-indigo-600 font-bold">
                          Room {r.roomNumber} ({r.bedNumber})
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                          {formatDate(r.startDate)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant="green" className="text-[10px]">
                            {r.status || 'ACTIVE'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 2: OCCUPANCY */}
          {reportType === 'occupancy' && Array.isArray(reportData) && (
            <div className="space-y-4">
              {/* Metric Cards per Hostel */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {reportData.map((h) => (
                  <div key={h.hostelId} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3 hover:border-indigo-200 transition-all">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{h.hostelName}</h4>
                        <span className="text-[10px] text-slate-500 font-semibold">{h.type} Hostel</span>
                      </div>
                      <Badge
                        variant={h.occupancyRate >= 90 ? 'red' : h.occupancyRate >= 70 ? 'amber' : 'blue'}
                        className="text-[10px]"
                      >
                        {h.occupancyRate}% Occupied
                      </Badge>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          h.occupancyRate >= 90 ? 'bg-rose-500' : h.occupancyRate >= 70 ? 'bg-amber-500' : 'bg-indigo-600'
                        }`}
                        style={{ width: `${Math.min(100, h.occupancyRate)}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1 pt-1 text-center border-t border-slate-100 text-xs">
                      <div className="p-1.5 bg-slate-50 rounded-lg">
                        <span className="block text-[10px] text-slate-400 font-medium">Total Beds</span>
                        <strong className="text-slate-800 font-bold">{h.totalBeds}</strong>
                      </div>
                      <div className="p-1.5 bg-indigo-50/60 rounded-lg">
                        <span className="block text-[10px] text-indigo-500 font-medium">Occupied</span>
                        <strong className="text-indigo-700 font-bold">{h.occupiedBeds}</strong>
                      </div>
                      <div className="p-1.5 bg-emerald-50/60 rounded-lg">
                        <span className="block text-[10px] text-emerald-500 font-medium">Available</span>
                        <strong className="text-emerald-700 font-bold">{h.availableBeds}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Aggregated Occupancy Summary Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50/80 font-bold text-slate-800 border-b border-slate-200 text-xs">
                  Hostel Occupancy Breakdown Table
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Hostel Name</th>
                        <th className="px-4 py-2.5 text-left">Gender Type</th>
                        <th className="px-4 py-2.5 text-center">Total Rooms</th>
                        <th className="px-4 py-2.5 text-center">Total Beds</th>
                        <th className="px-4 py-2.5 text-center">Occupied Beds</th>
                        <th className="px-4 py-2.5 text-center">Available Beds</th>
                        <th className="px-4 py-2.5 text-right">Occupancy Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.map((h) => (
                        <tr key={h.hostelId} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 font-bold text-slate-900">{h.hostelName}</td>
                          <td className="px-4 py-2.5 text-slate-600">{h.type}</td>
                          <td className="px-4 py-2.5 text-center text-slate-700 font-medium">{h.totalRooms}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-800">{h.totalBeds}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-indigo-600">{h.occupiedBeds}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-emerald-600">{h.availableBeds}</td>
                          <td className="px-4 py-2.5 text-right font-black text-slate-900">{h.occupancyRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-200">
                      <tr>
                        <td className="px-4 py-2.5" colSpan={2}>Grand Total</td>
                        <td className="px-4 py-2.5 text-center">{reportData.reduce((a, b) => a + (b.totalRooms || 0), 0)}</td>
                        <td className="px-4 py-2.5 text-center">{reportData.reduce((a, b) => a + (b.totalBeds || 0), 0)}</td>
                        <td className="px-4 py-2.5 text-center text-indigo-700">{reportData.reduce((a, b) => a + (b.occupiedBeds || 0), 0)}</td>
                        <td className="px-4 py-2.5 text-center text-emerald-700">{reportData.reduce((a, b) => a + (b.availableBeds || 0), 0)}</td>
                        <td className="px-4 py-2.5 text-right text-indigo-700 font-black">
                          {summaryMetrics?.value || '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* REPORT 3: AVAILABILITY */}
          {reportType === 'availability' && Array.isArray(reportData) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-slate-50/80 font-bold text-slate-800 border-b border-slate-200 text-xs flex justify-between items-center">
                <span>Room & Bed Availability ({reportData.length} Rooms)</span>
                <span className="text-[11px] font-normal text-slate-500">
                  {reportData.reduce((acc, r) => acc + (r.availableBedsCount || 0), 0)} Vacant Beds Available
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Hostel</th>
                      <th className="px-4 py-2.5 text-left">Room Number</th>
                      <th className="px-4 py-2.5 text-left">Floor</th>
                      <th className="px-4 py-2.5 text-center">Capacity</th>
                      <th className="px-4 py-2.5 text-center">Free Beds Count</th>
                      <th className="px-4 py-2.5 text-left">Vacant Bed Labels</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.map((r) => (
                      <tr key={r.roomId} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-bold text-slate-900">{r.hostelName}</td>
                        <td className="px-4 py-2.5 font-bold text-indigo-600">Room {r.roomNumber}</td>
                        <td className="px-4 py-2.5 text-slate-500 font-medium">{r.floor || 'G'}</td>
                        <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{r.capacity}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              r.availableBedsCount > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {r.availableBedsCount} free
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px]">
                          {Array.isArray(r.availableBedNumbers) && r.availableBedNumbers.length > 0
                            ? r.availableBedNumbers.join(', ')
                            : <span className="text-slate-400 font-sans italic">None (Fully Occupied)</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 4: ADMISSIONS */}
          {reportType === 'admissions' && Array.isArray(reportData) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-slate-50/80 font-bold text-slate-800 border-b border-slate-200 text-xs">
                Hostel Admissions Log ({reportData.length} Records)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Admission Date</th>
                      <th className="px-4 py-2.5 text-left">Student Details (Name, Adm No, Guardian)</th>
                      <th className="px-4 py-2.5 text-left">Class & Section</th>
                      <th className="px-4 py-2.5 text-left">Hostel</th>
                      <th className="px-4 py-2.5 text-left">Room & Bed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                          {formatDate(a.startDate)}
                        </td>
                        <td className="px-4 py-2.5">
                          <StudentDetailsCell student={a.student} onPhotoClick={setSelectedPhotoStudent} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium">{formatStudentClassInfo(a)}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-800">{a.hostelName || a.hostel?.name}</td>
                        <td className="px-4 py-2.5 text-indigo-600 font-bold">
                          Room {a.roomNumber || a.room?.roomNumber} ({a.bedNumber || a.bed?.bedNumber})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 5: TRANSFERS */}
          {reportType === 'transfers' && Array.isArray(reportData) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-slate-50/80 font-bold text-slate-800 border-b border-slate-200 text-xs">
                Hostel Transfers Log ({reportData.length} Records)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Transfer Date</th>
                      <th className="px-4 py-2.5 text-left">Student Details (Name, Adm No, Guardian)</th>
                      <th className="px-4 py-2.5 text-left">Class & Section</th>
                      <th className="px-4 py-2.5 text-left">From</th>
                      <th className="px-4 py-2.5 text-left">To</th>
                      <th className="px-4 py-2.5 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                          {formatDate(t.transferDate)}
                        </td>
                        <td className="px-4 py-2.5">
                          <StudentDetailsCell student={t.student || t.enrollment?.student} onPhotoClick={setSelectedPhotoStudent} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium">{formatStudentClassInfo(t)}</td>
                        <td className="px-4 py-2.5 text-slate-600">
                          {t.fromHostelName || t.fromHostel?.name} (R-{t.fromRoomNumber || t.fromRoom?.roomNumber}, {t.fromBedNumber || t.fromBed?.bedNumber})
                        </td>
                        <td className="px-4 py-2.5 font-bold text-indigo-600">
                          {t.toHostelName || t.toHostel?.name} (R-{t.toRoomNumber || t.toRoom?.roomNumber}, {t.toBedNumber || t.toBed?.bedNumber})
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 italic">{t.reason || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 6: EXITS */}
          {reportType === 'exits' && Array.isArray(reportData) && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-slate-50/80 font-bold text-slate-800 border-b border-slate-200 text-xs">
                Hostel Exits Log ({reportData.length} Records)
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Hostel Effective Date</th>
                      <th className="px-4 py-2.5 text-left">Exit Date</th>
                      <th className="px-4 py-2.5 text-left">Student Details (Name, Adm No, Guardian)</th>
                      <th className="px-4 py-2.5 text-left">Class & Section</th>
                      <th className="px-4 py-2.5 text-left">Hostel & Room</th>
                      <th className="px-4 py-2.5 text-left">Exit Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData.map((x) => (
                      <tr key={x.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 text-indigo-700 font-mono text-[11px] font-semibold">
                          {formatDate(x.effectiveDate || x.startDate, 'N/A')}
                        </td>
                        <td className="px-4 py-2.5 text-rose-700 font-mono text-[11px] font-semibold">
                          {formatDate(x.endDate, 'N/A')}
                        </td>
                        <td className="px-4 py-2.5">
                          <StudentDetailsCell student={x.student} onPhotoClick={setSelectedPhotoStudent} />
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 font-medium">{formatStudentClassInfo(x)}</td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {x.hostelName || x.hostel?.name} (R-{x.roomNumber || x.room?.roomNumber}, {x.bedNumber || x.bed?.bedNumber})
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{x.exitReason || 'Hostel Exit'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 7: FEES */}
          {reportType === 'fees' && reportData?.summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-2xs">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Billed</span>
                  <span className="font-black text-slate-900 text-lg">
                    ₹{(reportData.summary.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-2xs">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Collected</span>
                  <span className="font-black text-emerald-600 text-lg">
                    ₹{(reportData.summary.totalPaid || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-2xs">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Outstanding Dues</span>
                  <span className="font-black text-rose-600 text-lg">
                    ₹{(reportData.summary.totalUnpaid || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-slate-200 text-center shadow-2xs">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider">Charges Count</span>
                  <span className="font-black text-indigo-600 text-lg">
                    {reportData.summary.totalCharges || 0}
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-3 bg-slate-50/80 font-bold text-slate-800 border-b border-slate-200 text-xs">
                  Hostel Fee Charges Ledger
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Student Details (Name, Adm No, Guardian)</th>
                        <th className="px-4 py-2.5 text-left">Class & Section</th>
                        <th className="px-4 py-2.5 text-left">Fee Title</th>
                        <th className="px-4 py-2.5 text-left">Month</th>
                        <th className="px-4 py-2.5 text-right">Amount</th>
                        <th className="px-4 py-2.5 text-right">Paid</th>
                        <th className="px-4 py-2.5 text-right">Due</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.charges?.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5">
                            <StudentDetailsCell student={c.student} onPhotoClick={setSelectedPhotoStudent} />
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 font-medium">{formatStudentClassInfo(c)}</td>
                          <td className="px-4 py-2.5 text-slate-700">{c.title || c.feeTypeName}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-500">{c.month}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900">₹{c.amount}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600 font-semibold">₹{c.paidAmount}</td>
                          <td className="px-4 py-2.5 text-right text-rose-600 font-bold">₹{c.dueAmount || 0}</td>
                          <td className="px-4 py-2.5 text-center">
                            <Badge
                              variant={c.status === 'PAID' ? 'green' : c.status === 'PARTIAL' ? 'amber' : 'red'}
                              className="text-[10px]"
                            >
                              {c.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STUDENT PHOTO PREVIEW MODAL ── */}
      <StudentPhotoModal
        isOpen={Boolean(selectedPhotoStudent)}
        onClose={() => setSelectedPhotoStudent(null)}
        student={selectedPhotoStudent}
      />
    </div>
  );
};

export default HostelReportsPage;
