import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Search,
  Eye,
  ArrowLeftRight,
  LogOut,
  UserPlus,
  Filter,
} from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { useAcademicYear } from '../../context/AcademicYearContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Drawer } from '../../components/ui/Drawer.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { formatStudentClassInfo } from '../../utils/hostelUtils.js';
import { HostelTransferModal } from '../../components/hostel/HostelTransferModal.jsx';
import { HostelExitModal } from '../../components/hostel/HostelExitModal.jsx';

export const HostelResidentsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentAcademicYear } = useAcademicYear();

  const [loading, setLoading] = useState(true);
  const [residents, setResidents] = useState([]);
  const [hostels, setHostels] = useState([]);

  // Filters
  const [selectedHostelId, setSelectedHostelId] = useState(location.state?.hostelId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');

  // Selected Resident Drawer & Actions State
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState(null);

  // Modals
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    fetchResidents();
  }, [currentAcademicYear, selectedHostelId, statusFilter]);

  const fetchHostels = async () => {
    try {
      const res = await hostelService.listHostels();
      setHostels(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const res = await hostelService.listResidents({
        academicYearId: currentAcademicYear?.id,
        hostelId: selectedHostelId || undefined,
        status: statusFilter,
      });
      setResidents(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load residents');
    } finally {
      setLoading(false);
    }
  };

  const filteredResidents = residents.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const classStr = formatStudentClassInfo(r).toLowerCase();
    return (
      (r.studentName && r.studentName.toLowerCase().includes(q)) ||
      (r.admissionNo && r.admissionNo.toLowerCase().includes(q)) ||
      (r.phone && r.phone.toLowerCase().includes(q)) ||
      (r.hostelName && r.hostelName.toLowerCase().includes(q)) ||
      (r.roomNumber && r.roomNumber.toLowerCase().includes(q)) ||
      classStr.includes(q)
    );
  });

  const handleOpenDrawer = (resItem) => {
    setSelectedResident(resItem);
    setDrawerOpen(true);
  };

  const handleTriggerTransfer = (resItem) => {
    setSelectedResident(resItem);
    setTransferModalOpen(true);
  };

  const handleTriggerExit = (resItem) => {
    setSelectedResident(resItem);
    setExitModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* SINGLE-ROW COMPACT TOOLBAR */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
          {/* Search Box */}
          <div className="w-full sm:w-72 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
              placeholder="Search by name, admission no. or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* All Hostels Select */}
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

          {/* Status Filter Select */}
          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 text-xs"
            >
              <option value="ACTIVE">Active Residents</option>
              <option value="EXITED">Exited Residents</option>
            </Select>
          </div>
        </div>

        {/* Primary Action Button */}
        <Button
          size="sm"
          onClick={() => navigate('/app/hostel/admission')}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-1.5 px-3.5 shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5 mr-1.5" />
          + Admit Student
        </Button>
      </div>

      {/* COMPACT RESIDENTS TABLE */}
      {loading ? (
        <div className="flex justify-center p-12">
          <Spinner size="lg" />
        </div>
      ) : filteredResidents.length === 0 ? (
        <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p>No residents found matching the selected search criteria.</p>
        </Card>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold">
              <tr>
                <th className="px-3.5 py-2.5 text-left">Student</th>
                <th className="px-3.5 py-2.5 text-left">Class & Section</th>
                <th className="px-3.5 py-2.5 text-left">Hostel & Room</th>
                <th className="px-3.5 py-2.5 text-left">Bed</th>
                <th className="px-3.5 py-2.5 text-left">Start Date</th>
                <th className="px-3.5 py-2.5 text-center">Status</th>
                <th className="px-3.5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredResidents.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-3.5 py-2.5">
                    <div className="font-bold text-slate-900">{r.studentName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Adm: {r.admissionNo}</div>
                  </td>
                  <td className="px-3.5 py-2.5 font-medium text-slate-700">
                    {formatStudentClassInfo(r)}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="font-semibold text-slate-900">{r.hostelName}</div>
                    <div className="text-[11px] text-slate-500">Room {r.roomNumber}</div>
                  </td>
                  <td className="px-3.5 py-2.5 font-bold text-indigo-600">{r.bedNumber}</td>
                  <td className="px-3.5 py-2.5 text-slate-600">
                    {new Date(r.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-3.5 py-2.5 text-center">
                    <Badge variant={r.status === 'ACTIVE' ? 'green' : 'gray'} className="text-[10px] py-0.5 px-2">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-3.5 py-2.5 text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-indigo-600 hover:bg-indigo-50"
                      onClick={() => handleOpenDrawer(r)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* COMPACT RESIDENT DETAILS DRAWER */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Resident Details & History"
      >
        {selectedResident && (
          <div className="space-y-4 text-xs">
            {/* Student Info Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Student Profile</span>
              <h3 className="font-bold text-slate-900 text-sm">{selectedResident.studentName}</h3>
              <p className="text-slate-600">
                Admission No: <strong className="text-slate-800 font-mono">{selectedResident.admissionNo}</strong>
              </p>
              <p className="text-indigo-700 font-semibold pt-0.5">
                {formatStudentClassInfo(selectedResident)}
              </p>
              {selectedResident.guardianName && (
                <p className="text-slate-500 text-[11px]">Guardian: {selectedResident.guardianName} {selectedResident.phone ? `(${selectedResident.phone})` : ''}</p>
              )}
            </div>

            {/* Accommodation Details Box */}
            <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100 space-y-2">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Current Accommodation</span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="block text-slate-500 text-[11px]">Hostel Building:</span>
                  <span className="font-bold text-slate-900">{selectedResident.hostelName}</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[11px]">Room & Bed:</span>
                  <span className="font-bold text-indigo-600">Room {selectedResident.roomNumber} ({selectedResident.bedNumber})</span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[11px]">Hostel Start Date:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(selectedResident.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 text-[11px]">Enrollment Status:</span>
                  <Badge variant={selectedResident.status === 'ACTIVE' ? 'green' : 'gray'} className="text-[10px]">
                    {selectedResident.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons embedded in Resident Details */}
            {selectedResident.status === 'ACTIVE' && (
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDrawerOpen(false);
                    handleTriggerTransfer(selectedResident);
                  }}
                  className="bg-white hover:bg-slate-50 border-slate-300 text-indigo-700"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
                  Transfer Resident
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDrawerOpen(false);
                    handleTriggerExit(selectedResident);
                  }}
                  className="bg-white hover:bg-rose-50 border-rose-200 text-rose-600"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Hostel Exit
                </Button>
              </div>
            )}

            {/* Transfer History Log if any */}
            {selectedResident.transferHistory?.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Transfer History</span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedResident.transferHistory.map((t) => (
                    <div key={t.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-0.5">
                      <div className="flex justify-between font-semibold text-slate-900">
                        <span>{t.fromHostel?.name} (R-{t.fromRoom?.roomNumber}) → {t.toHostel?.name} (R-{t.toRoom?.roomNumber})</span>
                        <span className="text-slate-400 font-mono">{new Date(t.transferDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-500 italic">{t.reason || 'Routine Transfer'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* EMBEDDED REUSABLE MODALS */}
      <HostelTransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        resident={selectedResident}
        onSuccess={fetchResidents}
      />

      <HostelExitModal
        isOpen={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        resident={selectedResident}
        onSuccess={fetchResidents}
      />
    </div>
  );
};
