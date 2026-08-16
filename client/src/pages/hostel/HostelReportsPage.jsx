import React, { useState, useEffect } from 'react';
import {
  Printer,
  Users,
  Building,
  Bed,
  CreditCard,
  LogOut,
  ArrowLeftRight,
} from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { useAcademicYear } from '../../context/AcademicYearContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { formatStudentClassInfo } from '../../utils/hostelUtils.js';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';

export const HostelReportsPage = () => {
  const { currentAcademicYear, academicYears } = useAcademicYear();

  const [reportType, setReportType] = useState('residents'); // 'residents' | 'occupancy' | 'availability' | 'admissions' | 'transfers' | 'exits' | 'fees'
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Filters
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [hostels, setHostels] = useState([]);

  useEffect(() => {
    if (currentAcademicYear) {
      setSelectedAcademicYearId(currentAcademicYear.id);
    }
    fetchHostels();
  }, [currentAcademicYear]);

  useEffect(() => {
    fetchReport();
  }, [reportType, selectedAcademicYearId, selectedHostelId, startDate, endDate]);

  const fetchHostels = async () => {
    try {
      const res = await hostelService.listHostels();
      setHostels(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await hostelService.getReport(reportType, {
        academicYearId: selectedAcademicYearId,
        hostelId: selectedHostelId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setReportData(res.data);
    } catch (err) {
      toast.error(err.message || 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Report Selection Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
        {[
          { id: 'residents', label: 'Current Residents', icon: Users },
          { id: 'occupancy', label: 'Hostel Occupancy', icon: Building },
          { id: 'availability', label: 'Bed Availability', icon: Bed },
          { id: 'admissions', label: 'Admissions Log', icon: Users },
          { id: 'transfers', label: 'Transfers Log', icon: ArrowLeftRight },
          { id: 'exits', label: 'Exits Log', icon: LogOut },
          { id: 'fees', label: 'Hostel Fees Ledger', icon: CreditCard },
        ].map((r) => {
          const Icon = r.icon;
          return (
            <button
              key={r.id}
              onClick={() => setReportType(r.id)}
              className={`flex items-center px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                reportType === r.id
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5 mr-1" />
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Filter Bar */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-44">
            <Select
              label="Academic Year"
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

          <div className="w-44">
            <Select
              label="Hostel"
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

          <div className="w-36">
            <Input
              label="From Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="w-36">
            <Input
              label="To Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <DocumentActions
            templateId="hostelReport"
            data={{
              reportData,
              reportType,
              hostelName: hostels.find((h) => h.id === selectedHostelId)?.name || 'All Hostels',
            }}
            filename={`Hostel_Report_${reportType}.pdf`}
            title={`Hostel Report - ${reportType.toUpperCase()}`}
          />
        </div>
      </div>

      {/* Report Data Display */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : !reportData ? (
        <Card className="p-8 text-center text-xs text-slate-500">
          No report data generated.
        </Card>
      ) : (
        <div>
          {/* REPORT 1: RESIDENTS */}
          {reportType === 'residents' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-50 font-bold text-slate-800 border-b border-slate-200 text-xs">
                Current Active Residents Report
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2 text-left">Student Name</th>
                      <th className="px-3.5 py-2 text-left">Admission No</th>
                      <th className="px-3.5 py-2 text-left">Class & Section</th>
                      <th className="px-3.5 py-2 text-left">Hostel Name</th>
                      <th className="px-3.5 py-2 text-left">Room & Bed</th>
                      <th className="px-3.5 py-2 text-left">Start Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.isArray(reportData) && reportData.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2 font-bold text-slate-900">{r.studentName}</td>
                        <td className="px-3.5 py-2 text-slate-600 font-mono">{r.admissionNo}</td>
                        <td className="px-3.5 py-2 text-slate-700 font-medium">{formatStudentClassInfo(r)}</td>
                        <td className="px-3.5 py-2 font-semibold text-slate-800">{r.hostelName}</td>
                        <td className="px-3.5 py-2 text-indigo-600 font-bold">Room {r.roomNumber} ({r.bedNumber})</td>
                        <td className="px-3.5 py-2 text-slate-500">{new Date(r.startDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 2: OCCUPANCY */}
          {reportType === 'occupancy' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.isArray(reportData) && reportData.map((h) => (
                  <div key={h.hostelId} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900 text-sm">{h.hostelName}</h4>
                      <Badge variant="blue" className="text-[10px]">{h.occupancyRate}% Occupied</Badge>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${h.occupancyRate}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 pt-1">
                      <span>Total Beds: <strong>{h.totalBeds}</strong></span>
                      <span>Occupied: <strong className="text-indigo-600">{h.occupiedBeds}</strong></span>
                      <span>Available: <strong className="text-emerald-600">{h.availableBeds}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REPORT 3: AVAILABILITY */}
          {reportType === 'availability' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-50 font-bold text-slate-800 border-b border-slate-200 text-xs">
                Room & Bed Availability Report
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2 text-left">Hostel</th>
                      <th className="px-3.5 py-2 text-left">Room Number</th>
                      <th className="px-3.5 py-2 text-left">Floor</th>
                      <th className="px-3.5 py-2 text-center">Capacity</th>
                      <th className="px-3.5 py-2 text-center">Free Beds Count</th>
                      <th className="px-3.5 py-2 text-left">Vacant Bed Labels</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.isArray(reportData) && reportData.map((r) => (
                      <tr key={r.roomId} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2 font-bold text-slate-900">{r.hostelName}</td>
                        <td className="px-3.5 py-2 font-bold text-indigo-600">Room {r.roomNumber}</td>
                        <td className="px-3.5 py-2 text-slate-500">{r.floor || 'G'}</td>
                        <td className="px-3.5 py-2 text-center font-semibold">{r.capacity}</td>
                        <td className="px-3.5 py-2 text-center font-bold text-emerald-600">{r.availableBedsCount} free</td>
                        <td className="px-3.5 py-2 text-slate-600 font-mono text-[11px]">
                          {r.availableBedNumbers?.join(', ') || 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 4: ADMISSIONS */}
          {reportType === 'admissions' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-50 font-bold text-slate-800 border-b border-slate-200 text-xs">
                Hostel Admissions Log Report
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2 text-left">Admission Date</th>
                      <th className="px-3.5 py-2 text-left">Student Name</th>
                      <th className="px-3.5 py-2 text-left">Admission No</th>
                      <th className="px-3.5 py-2 text-left">Hostel</th>
                      <th className="px-3.5 py-2 text-left">Room & Bed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.isArray(reportData) && reportData.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2 text-slate-500 font-mono">{new Date(a.startDate).toLocaleDateString()}</td>
                        <td className="px-3.5 py-2 font-bold text-slate-900">{a.student?.name}</td>
                        <td className="px-3.5 py-2 text-slate-600 font-mono">{a.student?.admissionNo}</td>
                        <td className="px-3.5 py-2 font-semibold text-slate-800">{a.hostel?.name}</td>
                        <td className="px-3.5 py-2 text-indigo-600 font-bold">Room {a.room?.roomNumber} ({a.bed?.bedNumber})</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 5: TRANSFERS */}
          {reportType === 'transfers' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-50 font-bold text-slate-800 border-b border-slate-200 text-xs">
                Hostel Transfers Log Report
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2 text-left">Transfer Date</th>
                      <th className="px-3.5 py-2 text-left">Student Name</th>
                      <th className="px-3.5 py-2 text-left">From</th>
                      <th className="px-3.5 py-2 text-left">To</th>
                      <th className="px-3.5 py-2 text-left">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.isArray(reportData) && reportData.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2 text-slate-500 font-mono">{new Date(t.transferDate).toLocaleDateString()}</td>
                        <td className="px-3.5 py-2 font-bold text-slate-900">{t.enrollment?.student?.name}</td>
                        <td className="px-3.5 py-2 text-slate-600">{t.fromHostel?.name} (R-{t.fromRoom?.roomNumber})</td>
                        <td className="px-3.5 py-2 font-bold text-indigo-600">{t.toHostel?.name} (R-{t.toRoom?.roomNumber})</td>
                        <td className="px-3.5 py-2 text-slate-500 italic">{t.reason || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORT 6: EXITS */}
          {reportType === 'exits' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <div className="px-4 py-2.5 bg-slate-50 font-bold text-slate-800 border-b border-slate-200 text-xs">
                Hostel Exits Log Report
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2 text-left">Exit Date</th>
                      <th className="px-3.5 py-2 text-left">Student Name</th>
                      <th className="px-3.5 py-2 text-left">Hostel & Room</th>
                      <th className="px-3.5 py-2 text-left">Exit Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {Array.isArray(reportData) && reportData.map((x) => (
                      <tr key={x.id} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2 text-slate-500 font-mono">{x.endDate ? new Date(x.endDate).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-3.5 py-2 font-bold text-slate-900">{x.student?.name}</td>
                        <td className="px-3.5 py-2 text-slate-700">{x.hostel?.name} (R-{x.room?.roomNumber}, {x.bed?.bedNumber})</td>
                        <td className="px-3.5 py-2 text-slate-600">{x.exitReason || 'Hostel Exit'}</td>
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
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="block text-[10px] text-slate-500">Total Billed</span>
                  <span className="font-extrabold text-slate-900 text-base">₹{reportData.summary.totalAmount}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="block text-[10px] text-slate-500">Total Collected</span>
                  <span className="font-extrabold text-emerald-600 text-base">₹{reportData.summary.totalPaid}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="block text-[10px] text-slate-500">Outstanding</span>
                  <span className="font-extrabold text-rose-600 text-base">₹{reportData.summary.totalUnpaid}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center">
                  <span className="block text-[10px] text-slate-500">Charges Count</span>
                  <span className="font-extrabold text-indigo-600 text-base">{reportData.summary.totalCharges}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-50 font-bold text-slate-800 border-b border-slate-200 text-xs">
                  Hostel Fee Charges Ledger
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-600">
                      <tr>
                        <th className="px-3.5 py-2 text-left">Student</th>
                        <th className="px-3.5 py-2 text-left">Fee Title</th>
                        <th className="px-3.5 py-2 text-left">Month</th>
                        <th className="px-3.5 py-2 text-right">Amount</th>
                        <th className="px-3.5 py-2 text-right">Paid</th>
                        <th className="px-3.5 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {reportData.charges.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50/50">
                          <td className="px-3.5 py-2 font-bold text-slate-900">{c.student?.name}</td>
                          <td className="px-3.5 py-2 text-slate-700">{c.title}</td>
                          <td className="px-3.5 py-2 font-mono text-slate-500">{c.month}</td>
                          <td className="px-3.5 py-2 text-right font-bold text-slate-900">₹{c.amount}</td>
                          <td className="px-3.5 py-2 text-right text-emerald-600 font-semibold">₹{c.paidAmount}</td>
                          <td className="px-3.5 py-2 text-center">
                            <Badge variant={c.status === 'PAID' ? 'green' : c.status === 'PARTIAL' ? 'amber' : 'red'} className="text-[10px]">
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
    </div>
  );
};
