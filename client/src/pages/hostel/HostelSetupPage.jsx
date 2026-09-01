import React, { useState, useEffect } from 'react';
import {
  Building,
  DoorOpen,
  Bed,
  Plus,
  Edit2,
  Trash2,
  Wrench,
  Ban,
  Layers,
  Filter,
} from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { StudentPhotoModal } from '../../components/hostel/StudentPhotoModal.jsx';
import { ManageHostelRoomsModal } from '../../components/hostel/ManageHostelRoomsModal.jsx';

export const HostelSetupPage = () => {
  const [activeTab, setActiveTab] = useState('hostels'); // 'hostels' | 'rooms' | 'beds'
  const [loading, setLoading] = useState(true);
  const [selectedPhotoStudent, setSelectedPhotoStudent] = useState(null);

  // Data
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);

  // Filters
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  // Modals
  const [hostelModalOpen, setHostelModalOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [hostelForm, setHostelForm] = useState({ name: '', code: '', type: 'COMBINED', address: '', description: '' });

  // Manage Hostel Rooms Modal (Unified Room Workspace)
  const [manageRoomsModalOpen, setManageRoomsModalOpen] = useState(false);
  const [targetHostelIdForRooms, setTargetHostelIdForRooms] = useState('');

  const [bedModalOpen, setBedModalOpen] = useState(false);
  const [bedForm, setBedForm] = useState({ hostelId: '', roomId: '', bedNumber: '', status: 'AVAILABLE' });

  const [bulkBedModalOpen, setBulkBedModalOpen] = useState(false);
  const [bulkBedForm, setBulkBedForm] = useState({ hostelId: '', roomId: '', count: 4, prefix: 'Bed' });

  // Confirmation Dialog States
  const [hostelToDelete, setHostelToDelete] = useState(null);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [bedToToggle, setBedToToggle] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHostels();
  }, []);

  useEffect(() => {
    if (activeTab === 'rooms') {
      fetchRooms();
    } else if (activeTab === 'beds') {
      fetchBeds();
    }
  }, [activeTab, selectedHostelId, selectedRoomId]);

  const fetchHostels = async () => {
    try {
      setLoading(true);
      const res = await hostelService.listHostels();
      setHostels(res.data || []);
      if (!selectedHostelId && res.data?.length > 0) {
        setSelectedHostelId(res.data[0].id);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load hostels');
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await hostelService.listRooms({ hostelId: selectedHostelId });
      setRooms(res.data || []);
      if (!selectedRoomId && res.data?.length > 0) {
        setSelectedRoomId(res.data[0].id);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const fetchBeds = async () => {
    try {
      setLoading(true);
      const res = await hostelService.listBeds({
        hostelId: selectedHostelId,
        roomId: selectedRoomId,
      });
      setBeds(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load beds');
    } finally {
      setLoading(false);
    }
  };

  // Hostel Handlers
  const handleOpenHostelModal = (hostel = null) => {
    if (hostel) {
      setEditingHostel(hostel);
      setHostelForm({
        name: hostel.name,
        code: hostel.code || '',
        type: hostel.type || 'COMBINED',
        address: hostel.address || '',
        description: hostel.description || '',
      });
    } else {
      setEditingHostel(null);
      setHostelForm({ name: '', code: '', type: 'COMBINED', address: '', description: '' });
    }
    setHostelModalOpen(true);
  };

  const handleSubmitHostel = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingHostel) {
        await hostelService.updateHostel(editingHostel.id, hostelForm);
        toast.success('Hostel updated successfully');
      } else {
        await hostelService.createHostel(hostelForm);
        toast.success('Hostel created successfully');
      }
      setHostelModalOpen(false);
      fetchHostels();
    } catch (err) {
      toast.error(err.message || 'Failed to save hostel');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDeleteHostel = async () => {
    if (!hostelToDelete) return;
    try {
      setSubmitting(true);
      await hostelService.deleteHostel(hostelToDelete.id);
      toast.success(`Hostel '${hostelToDelete.name}' deleted successfully`);
      setHostelToDelete(null);
      fetchHostels();
    } catch (err) {
      toast.error(err.message || 'Failed to delete hostel');
    } finally {
      setSubmitting(false);
    }
  };

  // Unified Room Management Modal Handler
  const handleOpenManageRoomsModal = (hostelId = '') => {
    const targetId = hostelId || selectedHostelId || (hostels[0]?.id || '');
    setTargetHostelIdForRooms(targetId);
    setManageRoomsModalOpen(true);
  };

  const handleRoomsUpdated = () => {
    fetchRooms();
    fetchHostels();
  };

  const handleConfirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    try {
      setSubmitting(true);
      await hostelService.deleteRoom(roomToDelete.id);
      toast.success(`Room '${roomToDelete.roomNumber}' deleted successfully`);
      setRoomToDelete(null);
      fetchRooms();
      fetchHostels();
    } catch (err) {
      toast.error(err.message || 'Failed to delete room');
    } finally {
      setSubmitting(false);
    }
  };

  // Bed Handlers
  const handleOpenBedModal = () => {
    setBedForm({
      hostelId: selectedHostelId || (hostels[0]?.id || ''),
      roomId: selectedRoomId || (rooms[0]?.id || ''),
      bedNumber: '',
      status: 'AVAILABLE',
    });
    setBedModalOpen(true);
  };

  const handleSubmitBed = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await hostelService.createBed(bedForm);
      toast.success('Bed added successfully');
      setBedModalOpen(false);
      fetchBeds();
    } catch (err) {
      toast.error(err.message || 'Failed to add bed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenBulkBedModal = () => {
    setBulkBedForm({
      hostelId: selectedHostelId || (hostels[0]?.id || ''),
      roomId: selectedRoomId || (rooms[0]?.id || ''),
      count: 4,
      prefix: 'Bed',
    });
    setBulkBedModalOpen(true);
  };

  const handleSubmitBulkBeds = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await hostelService.bulkCreateBeds(bulkBedForm);
      toast.success('Beds generated successfully');
      setBulkBedModalOpen(false);
      fetchBeds();
    } catch (err) {
      toast.error(err.message || 'Failed to bulk generate beds');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggleBedStatus = async () => {
    if (!bedToToggle) return;
    try {
      setSubmitting(true);
      await hostelService.updateBedStatus(bedToToggle.bedId, bedToToggle.newStatus);
      toast.success(`Bed ${bedToToggle.bedNumber} updated to ${bedToToggle.newStatus}`);
      setBedToToggle(null);
      fetchBeds();
    } catch (err) {
      toast.error(err.message || 'Failed to update bed status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex space-x-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('hostels')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'hostels'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Building className="w-3.5 h-3.5 inline mr-1" />
            Hostels ({hostels.length})
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'rooms'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <DoorOpen className="w-3.5 h-3.5 inline mr-1" />
            Rooms Setup
          </button>
          <button
            onClick={() => setActiveTab('beds')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeTab === 'beds'
                ? 'bg-white text-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Bed className="w-3.5 h-3.5 inline mr-1" />
            Beds Management
          </button>
        </div>

        <div>
          {activeTab === 'hostels' && (
            <Button size="sm" onClick={() => handleOpenHostelModal()} className="h-8 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Hostel
            </Button>
          )}
          {activeTab === 'rooms' && (
            <Button size="sm" onClick={() => handleOpenManageRoomsModal()} disabled={hostels.length === 0} className="h-8 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Room
            </Button>
          )}
          {activeTab === 'beds' && (
            <div className="flex space-x-2">
              <Button size="sm" variant="outline" onClick={handleOpenBulkBedModal} disabled={rooms.length === 0} className="h-8 text-xs">
                <Layers className="w-3.5 h-3.5 mr-1" />
                Bulk Add Beds
              </Button>
              <Button size="sm" onClick={handleOpenBedModal} disabled={rooms.length === 0} className="h-8 text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Bed
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters for Rooms and Beds */}
      {(activeTab === 'rooms' || activeTab === 'beds') && (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <div className="w-48">
            <Select
              value={selectedHostelId}
              onChange={(e) => {
                setSelectedHostelId(e.target.value);
                setSelectedRoomId('');
              }}
              className="py-1 text-xs"
            >
              <option value="">All Hostels</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.type})
                </option>
              ))}
            </Select>
          </div>

          {activeTab === 'beds' && (
            <div className="w-48">
              <Select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="py-1 text-xs"
              >
                <option value="">All Rooms</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} ({r.floor || 'G'})
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}

      {/* TAB 1: HOSTELS */}
      {activeTab === 'hostels' && (
        <div>
          {loading ? (
            <div className="flex justify-center p-12">
              <Spinner size="lg" />
            </div>
          ) : hostels.length === 0 ? (
            <Card className="p-8 text-center text-xs border-dashed text-slate-500">
              <Building className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p>No hostels created yet.</p>
              <Button size="sm" className="mt-3" onClick={() => handleOpenHostelModal()}>
                Create First Hostel
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {hostels.map((h) => (
                <Card key={h.id} className="p-4 relative hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{h.name}</h3>
                      {h.code && <p className="text-[11px] text-slate-500 font-mono">Code: {h.code}</p>}
                    </div>
                    <Badge variant={h.type === 'BOYS' ? 'blue' : h.type === 'GIRLS' ? 'pink' : 'purple'} className="text-[10px]">
                      {h.type} HOSTEL
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 min-h-[32px] line-clamp-2">
                    {h.address || h.description || 'No address specified'}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <div>
                      <span className="font-bold text-slate-900">{h.totalRooms}</span> Rooms
                    </div>
                    <div>
                      <span className="font-bold text-slate-900">{h.totalBeds}</span> Beds (
                      <span className="text-emerald-600 font-semibold">{h.availableBeds} available</span>)
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end space-x-1 pt-2 border-t border-slate-100">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenHostelModal(h)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-rose-600 hover:bg-rose-50" onClick={() => setHostelToDelete(h)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ROOMS */}
      {activeTab === 'rooms' && (
        <div>
          {loading ? (
            <div className="flex justify-center p-12">
              <Spinner size="lg" />
            </div>
          ) : rooms.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
              <DoorOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p>No rooms found matching filters.</p>
              <Button size="sm" icon={Plus} className="mt-3" onClick={() => handleOpenManageRoomsModal(selectedHostelId)}>
                Add Room
              </Button>
            </Card>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="px-3.5 py-2 text-left">Hostel</th>
                    <th className="px-3.5 py-2 text-left">Room Number</th>
                    <th className="px-3.5 py-2 text-left">Floor</th>
                    <th className="px-3.5 py-2 text-left">Room Type</th>
                    <th className="px-3.5 py-2 text-center">Capacity</th>
                    <th className="px-3.5 py-2 text-center">Available / Occupied</th>
                    <th className="px-3.5 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rooms.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-3.5 py-2 font-medium text-slate-900">{r.hostel.name}</td>
                      <td className="px-3.5 py-2 font-bold text-indigo-600">Room {r.roomNumber}</td>
                      <td className="px-3.5 py-2 text-slate-500">{r.floor || 'Ground'}</td>
                      <td className="px-3.5 py-2 text-slate-600">{r.roomType || 'Standard'}</td>
                      <td className="px-3.5 py-2 text-center font-semibold">{r.capacity} Beds</td>
                      <td className="px-3.5 py-2 text-center">
                        <span className="text-emerald-600 font-bold">{r.availableBedsCount} free</span> /{' '}
                        <span className="text-indigo-600 font-bold">{r.occupiedBedsCount} busy</span>
                      </td>
                      <td className="px-3.5 py-2 text-right space-x-1">
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => handleOpenManageRoomsModal(r.hostelId)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-rose-600" onClick={() => setRoomToDelete(r)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BEDS */}
      {activeTab === 'beds' && (
        <div>
          {loading ? (
            <div className="flex justify-center p-12">
              <Spinner size="lg" />
            </div>
          ) : beds.length === 0 ? (
            <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
              <Bed className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p>No beds found matching filters.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {beds.map((b) => {
                const isAvailable = b.status === 'AVAILABLE';
                const isOccupied = b.status === 'OCCUPIED';
                const isMaintenance = b.status === 'MAINTENANCE';

                return (
                  <div
                    key={b.id}
                    className={`p-3 rounded-xl border text-center transition-all ${isAvailable
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : isOccupied
                          ? 'border-indigo-200 bg-indigo-50/40'
                          : isMaintenance
                            ? 'border-amber-200 bg-amber-50/40'
                            : 'border-slate-200 bg-slate-100'
                      }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="truncate font-semibold">R-{b.room?.roomNumber}</span>
                      {isAvailable && <Badge variant="green" className="text-[9px] py-0 px-1.5">Free</Badge>}
                      {isOccupied && <Badge variant="blue" className="text-[9px] py-0 px-1.5">Busy</Badge>}
                      {isMaintenance && <Badge variant="amber" className="text-[9px] py-0 px-1.5">Maint.</Badge>}
                    </div>

                    <Bed className={`w-6 h-6 mx-auto my-1 ${isAvailable ? 'text-emerald-600' : isOccupied ? 'text-indigo-600' : 'text-slate-400'
                      }`} />

                    <div className="font-bold text-slate-900 text-xs">{b.bedNumber}</div>

                    {isOccupied && b.activeResident && (
                      <button
                        type="button"
                        onClick={() => setSelectedPhotoStudent({
                          name: b.activeResident.studentName,
                          admissionNo: b.activeResident.admissionNo,
                          photoUrl: b.activeResident.photoUrl,
                          guardianName: b.activeResident.guardianName,
                        })}
                        className="text-[10px] text-indigo-700 font-bold truncate mt-0.5 hover:underline cursor-pointer flex items-center justify-center gap-1 mx-auto"
                        title="Click to view photo & details"
                      >
                        {b.activeResident.studentName}
                      </button>
                    )}

                    {!isOccupied && (
                      <div className="mt-2 pt-1.5 border-t border-slate-200 flex justify-center space-x-1">
                        {isAvailable ? (
                          <>
                            <button
                              onClick={() => setBedToToggle({ bedId: b.id, newStatus: 'MAINTENANCE', bedNumber: b.bedNumber })}
                              title="Mark Maintenance"
                              className="p-1 hover:bg-amber-100 rounded text-amber-700 text-[11px]"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setBedToToggle({ bedId: b.id, newStatus: 'BLOCKED', bedNumber: b.bedNumber })}
                              title="Block Bed"
                              className="p-1 hover:bg-slate-200 rounded text-slate-700 text-[11px]"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => setBedToToggle({ bedId: b.id, newStatus: 'AVAILABLE', bedNumber: b.bedNumber })}
                            className="p-1 hover:bg-emerald-100 rounded text-emerald-700 text-[11px] font-bold"
                          >
                            Set Free
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT HOSTEL MODAL */}
      <Modal
        isOpen={hostelModalOpen}
        onClose={() => setHostelModalOpen(false)}
        title={editingHostel ? 'Edit Hostel' : 'Add New Hostel'}
      >
        <form onSubmit={handleSubmitHostel} autoComplete="off" className="space-y-3">
          <Input
            label="Hostel Name *"
            placeholder="Hostel Name"
            value={hostelForm.name}
            onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Hostel Code"
              placeholder="Hostel Code"
              value={hostelForm.code}
              onChange={(e) => setHostelForm({ ...hostelForm, code: e.target.value })}
            />
            <Select
              label="Hostel Type *"
              value={hostelForm.type}
              onChange={(e) => setHostelForm({ ...hostelForm, type: e.target.value })}
            >
              <option value="BOYS">Boys Hostel</option>
              <option value="GIRLS">Girls Hostel</option>
              <option value="COMBINED">Combined Hostel</option>
            </Select>
          </div>
          <Input
            label="Address"
            placeholder="Hostel Address"
            value={hostelForm.address}
            onChange={(e) => setHostelForm({ ...hostelForm, address: e.target.value })}
          />
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setHostelModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingHostel ? 'Update Hostel' : 'Create Hostel'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* UNIFIED ROOM MANAGEMENT MODAL */}
      <ManageHostelRoomsModal
        isOpen={manageRoomsModalOpen}
        onClose={() => setManageRoomsModalOpen(false)}
        hostels={hostels}
        initialHostelId={targetHostelIdForRooms}
        onSuccess={handleRoomsUpdated}
      />

      {/* CREATE SINGLE BED MODAL */}
      <Modal
        isOpen={bedModalOpen}
        onClose={() => setBedModalOpen(false)}
        title="Add Single Bed"
      >
        <form onSubmit={handleSubmitBed} autoComplete="off" className="space-y-3">
          <Select
            label="Hostel *"
            value={bedForm.hostelId}
            onChange={(e) => setBedForm({ ...bedForm, hostelId: e.target.value, roomId: '' })}
            required
          >
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </Select>
          <Select
            label="Room *"
            value={bedForm.roomId}
            onChange={(e) => setBedForm({ ...bedForm, roomId: e.target.value })}
            required
          >
            <option value="">Select Room</option>
            {rooms.filter((r) => r.hostelId === bedForm.hostelId).map((r) => (
              <option key={r.id} value={r.id}>Room {r.roomNumber}</option>
            ))}
          </Select>
          <Input
            label="Bed Number *"
            placeholder="Bed Number"
            value={bedForm.bedNumber}
            onChange={(e) => setBedForm({ ...bedForm, bedNumber: e.target.value })}
            required
          />
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setBedModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Add Bed
            </Button>
          </div>
        </form>
      </Modal>

      {/* BULK CREATE BEDS MODAL */}
      <Modal
        isOpen={bulkBedModalOpen}
        onClose={() => setBulkBedModalOpen(false)}
        title="Bulk Generate Beds"
      >
        <form onSubmit={handleSubmitBulkBeds} autoComplete="off" className="space-y-3">
          <Select
            label="Hostel *"
            value={bulkBedForm.hostelId}
            onChange={(e) => setBulkBedForm({ ...bulkBedForm, hostelId: e.target.value })}
            required
          >
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </Select>
          <Select
            label="Room *"
            value={bulkBedForm.roomId}
            onChange={(e) => setBulkBedForm({ ...bulkBedForm, roomId: e.target.value })}
            required
          >
            <option value="">Select Room</option>
            {rooms.filter((r) => r.hostelId === bulkBedForm.hostelId).map((r) => (
              <option key={r.id} value={r.id}>Room {r.roomNumber}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Number of Beds *"
              type="number"
              min="1"
              max="20"
              value={bulkBedForm.count}
              onChange={(e) => setBulkBedForm({ ...bulkBedForm, count: parseInt(e.target.value, 10) || 1 })}
              required
            />
            <Input
              label="Bed Prefix *"
              placeholder="Enter Prefix (e.g. Bed)"
              value={bulkBedForm.prefix}
              onChange={(e) => setBulkBedForm({ ...bulkBedForm, prefix: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setBulkBedModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Generate Beds
            </Button>
          </div>
        </form>
      </Modal>

      {/* CONFIRMATION DIALOGS */}
      <ConfirmDialog
        isOpen={!!hostelToDelete}
        onClose={() => setHostelToDelete(null)}
        onConfirm={handleConfirmDeleteHostel}
        title="Delete Hostel"
        message={`Are you sure you want to delete hostel '${hostelToDelete?.name}'?`}
        confirmText="Delete Hostel"
        variant="danger"
        loading={submitting}
      />

      <ConfirmDialog
        isOpen={!!roomToDelete}
        onClose={() => setRoomToDelete(null)}
        onConfirm={handleConfirmDeleteRoom}
        title="Delete Room"
        message={`Are you sure you want to delete Room '${roomToDelete?.roomNumber}'?`}
        confirmText="Delete Room"
        variant="danger"
        loading={submitting}
      />

      <ConfirmDialog
        isOpen={!!bedToToggle}
        onClose={() => setBedToToggle(null)}
        onConfirm={handleConfirmToggleBedStatus}
        title="Change Bed Status"
        message={`Are you sure you want to change Bed ${bedToToggle?.bedNumber} status to ${bedToToggle?.newStatus}?`}
        confirmText="Confirm Status"
        variant="amber"
        loading={submitting}
      />

      {/* ── STUDENT PHOTO PREVIEW MODAL ── */}
      <StudentPhotoModal
        isOpen={Boolean(selectedPhotoStudent)}
        onClose={() => setSelectedPhotoStudent(null)}
        student={selectedPhotoStudent}
      />
    </div>
  );
};
