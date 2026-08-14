import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building,
  Bed,
  Users,
  CheckCircle2,
  UserPlus,
  ArrowLeftRight,
  LogOut,
  Eye,
  Search,
} from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { useAcademicYear } from '../../context/AcademicYearContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { formatStudentClassInfo } from '../../utils/hostelUtils.js';
import { HostelTransferModal } from '../../components/hostel/HostelTransferModal.jsx';
import { HostelExitModal } from '../../components/hostel/HostelExitModal.jsx';

export const HostelDashboardPage = () => {
  const navigate = useNavigate();
  const { currentAcademicYear } = useAcademicYear();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [recentResidents, setRecentResidents] = useState([]);

  // Modals for Quick Actions from Overview
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [exitModalOpen, setExitModalOpen] = useState(false);
  const [actionResident, setActionResident] = useState(null);

  // Quick Action Selection Dialog (if user clicks Transfer/Exit without pre-selecting resident)
  const [selectResidentModalOpen, setSelectResidentModalOpen] = useState(false);
  const [pendingActionType, setPendingActionType] = useState(null); // 'transfer' | 'exit'
  const [allActiveResidents, setAllActiveResidents] = useState([]);
  const [selectedResidentId, setSelectedResidentId] = useState('');

  useEffect(() => {
    fetchOverviewData();
  }, [currentAcademicYear]);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const [statsRes, hostelsRes, residentsRes] = await Promise.all([
        hostelService.getDashboardData({ academicYearId: currentAcademicYear?.id }),
        hostelService.listHostels(),
        hostelService.listResidents({
          academicYearId: currentAcademicYear?.id,
          status: 'ACTIVE',
        }),
      ]);

      setStats(statsRes.data || null);
      setHostels(hostelsRes.data || []);
      const activeList = residentsRes.data || [];
      setAllActiveResidents(activeList);
      setRecentResidents(activeList.slice(0, 10)); // Show top 10 recent active residents
    } catch (err) {
      console.error('Failed loading overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenActionModal = (actionType, residentObj = null) => {
    if (residentObj) {
      setActionResident(residentObj);
      if (actionType === 'transfer') setTransferModalOpen(true);
      if (actionType === 'exit') setExitModalOpen(true);
    } else {
      // Prompt user to pick active resident first
      setPendingActionType(actionType);
      setSelectedResidentId('');
      setSelectResidentModalOpen(true);
    }
  };

  const handleConfirmSelectResidentForAction = () => {
    const resObj = allActiveResidents.find((r) => r.id === selectedResidentId);
    if (!resObj) return;

    setActionResident(resObj);
    setSelectResidentModalOpen(false);
    if (pendingActionType === 'transfer') setTransferModalOpen(true);
    if (pendingActionType === 'exit') setExitModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. TOP METRICS & QUICK ACTIONS IN COMPACT ERP LAYOUT */}
      <div className="space-y-3">
        {/* Metric Cards - Single Row on Desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hostels</span>
              <Building className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats?.totalHostels || 0}</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">{stats?.totalRooms || 0} Rooms</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Beds</span>
              <Bed className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats?.totalBeds || 0}</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">Capacity setup</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Occupied Beds</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">{stats?.occupiedBeds || 0}</div>
            <span className="text-[11px] text-blue-600 font-semibold block mt-0.5">{stats?.occupancyRate || 0}% Occupancy</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Available Beds</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-black text-emerald-700 mt-1">{stats?.availableBeds || 0}</div>
            <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">Ready for admission</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Residents</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-xl font-black text-indigo-700 mt-1">{stats?.activeResidents || 0}</div>
            <span className="text-[11px] text-slate-500 block mt-0.5">In current session</span>
          </div>
        </div>

        {/* Quick Operational Action Controls */}
        <div className="bg-slate-900 text-white rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <div>
            <h3 className="font-bold text-sm text-white">Hostel Operations Toolbar</h3>
            <p className="text-xs text-slate-400">Perform instant admission, room transfer, or resident exit operations</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/app/hostel/admission')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-3.5 py-1.5 shadow-xs"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              + Admit Student
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenActionModal('transfer')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs px-3.5 py-1.5"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />
              Transfer Resident
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenActionModal('exit')}
              className="bg-slate-800 hover:bg-slate-700 text-rose-300 border-slate-700 text-xs px-3.5 py-1.5"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5 text-rose-400" />
              Hostel Exit
            </Button>
          </div>
        </div>
      </div>

      {/* 2. HOSTEL AVAILABILITY TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Hostel Capacity & Availability</h3>
          <Button variant="ghost" size="sm" className="text-xs h-7 text-indigo-600" onClick={() => navigate('/app/hostel/setup')}>
            Configure Rooms & Beds
          </Button>
        </div>

        {hostels.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No hostels configured yet. Click "Configure Rooms & Beds" to set up hostels.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3.5 py-2 text-left">Hostel</th>
                  <th className="px-3.5 py-2 text-center">Occupied</th>
                  <th className="px-3.5 py-2 text-center">Capacity</th>
                  <th className="px-3.5 py-2 text-center">Available</th>
                  <th className="px-3.5 py-2 text-center">Status</th>
                  <th className="px-3.5 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {hostels.map((h) => {
                  const isFull = h.availableBeds === 0;
                  return (
                    <tr key={h.id} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-2 font-bold text-slate-900">
                        {h.name}
                        <span className="ml-2 text-[10px] font-normal text-slate-500 font-mono">({h.type})</span>
                      </td>
                      <td className="px-3.5 py-2 text-center font-bold text-blue-600">{h.occupiedBeds}</td>
                      <td className="px-3.5 py-2 text-center text-slate-600">{h.totalBeds}</td>
                      <td className="px-3.5 py-2 text-center font-bold text-emerald-600">{h.availableBeds}</td>
                      <td className="px-3.5 py-2 text-center">
                        <Badge variant={isFull ? 'red' : 'green'} className="text-[10px] py-0.5 px-2">
                          {isFull ? 'FULL' : 'AVAILABLE'}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-indigo-600 hover:bg-indigo-50"
                          onClick={() => navigate('/app/hostel/residents', { state: { hostelId: h.id } })}
                        >
                          View Residents
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. RECENT / CURRENT RESIDENTS TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Current Residents Directory</h3>
          <Button variant="ghost" size="sm" className="text-xs h-7 text-indigo-600" onClick={() => navigate('/app/hostel/residents')}>
            View All Residents ({allActiveResidents.length})
          </Button>
        </div>

        {recentResidents.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No active hostel residents enrolled. Use "+ Admit Student" to admit residents.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="px-3.5 py-2 text-left">Student</th>
                  <th className="px-3.5 py-2 text-left">Class & Section</th>
                  <th className="px-3.5 py-2 text-left">Hostel</th>
                  <th className="px-3.5 py-2 text-left">Room</th>
                  <th className="px-3.5 py-2 text-left">Bed</th>
                  <th className="px-3.5 py-2 text-left">Start Date</th>
                  <th className="px-3.5 py-2 text-center">Status</th>
                  <th className="px-3.5 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {recentResidents.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-3.5 py-2">
                      <div className="font-bold text-slate-900">{r.studentName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">Adm: {r.admissionNo}</div>
                    </td>
                    <td className="px-3.5 py-2 text-slate-700 font-medium">
                      {formatStudentClassInfo(r)}
                    </td>
                    <td className="px-3.5 py-2 font-semibold text-slate-800">{r.hostelName}</td>
                    <td className="px-3.5 py-2 text-slate-700">Room {r.roomNumber}</td>
                    <td className="px-3.5 py-2 font-bold text-indigo-600">{r.bedNumber}</td>
                    <td className="px-3.5 py-2 text-slate-600">
                      {new Date(r.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-3.5 py-2 text-center">
                      <Badge variant="green" className="text-[10px] py-0.5 px-2">ACTIVE</Badge>
                    </td>
                    <td className="px-3.5 py-2 text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-indigo-600 hover:bg-indigo-50"
                        onClick={() => handleOpenActionModal('transfer', r)}
                      >
                        Transfer
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={() => handleOpenActionModal('exit', r)}
                      >
                        Exit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SELECT ACTIVE RESIDENT DIALOG (If user clicked Transfer/Exit from top bar) */}
      <Modal
        isOpen={selectResidentModalOpen}
        onClose={() => setSelectResidentModalOpen(false)}
        title={pendingActionType === 'transfer' ? 'Select Resident for Transfer' : 'Select Resident for Hostel Exit'}
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Choose an active hostel resident to perform {pendingActionType}:
          </p>
          <Select
            label="Active Resident *"
            value={selectedResidentId}
            onChange={(e) => setSelectedResidentId(e.target.value)}
          >
            <option value="">Select Resident</option>
            {allActiveResidents.map((r) => (
              <option key={r.id} value={r.id}>
                {r.studentName} (Adm: {r.admissionNo}) - {r.hostelName} (Room {r.roomNumber}, {r.bedNumber})
              </option>
            ))}
          </Select>

          <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={() => setSelectResidentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedResidentId}
              onClick={handleConfirmSelectResidentForAction}
              className={pendingActionType === 'exit' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'}
            >
              Proceed to {pendingActionType === 'transfer' ? 'Transfer' : 'Exit'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* REUSABLE TRANSFER MODAL */}
      <HostelTransferModal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        resident={actionResident}
        onSuccess={fetchOverviewData}
      />

      {/* REUSABLE EXIT MODAL */}
      <HostelExitModal
        isOpen={exitModalOpen}
        onClose={() => setExitModalOpen(false)}
        resident={actionResident}
        onSuccess={fetchOverviewData}
      />
    </div>
  );
};
