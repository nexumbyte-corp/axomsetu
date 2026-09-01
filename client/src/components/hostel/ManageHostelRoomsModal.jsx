import React, { useState, useEffect } from 'react';
import {
  DoorOpen,
  Plus,
  Trash2,
  AlertTriangle,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Select } from '../ui/Select.jsx';
import { Badge } from '../ui/Badge.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { Alert } from '../ui/Alert.jsx';
import { ConfirmDialog } from '../ui/ConfirmDialog.jsx';
import { toast } from '../ui/Toast.jsx';

const ROOM_TYPE_OPTIONS = [
  'Dormitory',
  'Shared',
  'Private',
  'Standard',
  'Non-AC',
  'AC',
  'Deluxe AC',
  'Other',
];

export const ManageHostelRoomsModal = ({
  isOpen,
  onClose,
  hostels = [],
  initialHostelId = '',
  onSuccess,
}) => {
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [roomRows, setRoomRows] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deleteConfirmRoom, setDeleteConfirmRoom] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultHostelId = initialHostelId || (hostels[0]?.id || '');
      setSelectedHostelId(defaultHostelId);
      setModalError('');
    } else {
      setSelectedHostelId('');
      setRoomRows([]);
      setModalError('');
      setDeleteConfirmRoom(null);
    }
  }, [isOpen, initialHostelId, hostels]);

  useEffect(() => {
    if (isOpen && selectedHostelId) {
      setModalError('');
      fetchHostelRooms(selectedHostelId);
    } else {
      setRoomRows([]);
    }
  }, [selectedHostelId, isOpen]);

  const fetchHostelRooms = async (hostelId) => {
    if (!hostelId) return;
    try {
      setLoadingRooms(true);
      const res = await hostelService.listRooms({ hostelId });
      const fetched = (res.data || []).map((r) => ({
        id: r.id,
        isNew: false,
        roomNumber: r.roomNumber || '',
        capacity: r.capacity || 2,
        floor: r.floor || '',
        roomType: r.roomType || 'Non-AC',
        occupiedBedsCount: r.occupiedBedsCount || 0,
        totalBedsCount: r.totalBedsCount || 0,
        original: {
          roomNumber: r.roomNumber || '',
          capacity: r.capacity || 2,
          floor: r.floor || '',
          roomType: r.roomType || 'Non-AC',
        },
        error: '',
      }));
      setRoomRows(fetched);
    } catch (err) {
      toast.error(err.message || 'Failed to load rooms');
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleAddMoreRoom = () => {
    const newRow = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      isNew: true,
      roomNumber: '',
      capacity: 2,
      floor: '1st Floor',
      roomType: 'Non-AC',
      error: '',
    };
    setRoomRows((prev) => [...prev, newRow]);
  };

  const handleUpdateRow = (id, field, value) => {
    setModalError('');
    setRoomRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return {
          ...row,
          [field]: value,
          error: '', // clear row error on edit
        };
      })
    );
  };

  const handleRemoveDraftRow = (id) => {
    setRoomRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handlePromptDeleteExistingRoom = (row) => {
    setDeleteConfirmRoom(row);
  };

  const handleConfirmDeleteRoom = async () => {
    if (!deleteConfirmRoom) return;
    try {
      setDeleting(true);
      await hostelService.deleteRoom(deleteConfirmRoom.id);
      toast.success(`Room '${deleteConfirmRoom.roomNumber}' deleted successfully`);
      setDeleteConfirmRoom(null);
      fetchHostelRooms(selectedHostelId);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err.message || 'Failed to delete room');
    } finally {
      setDeleting(false);
    }
  };

  const validateRows = () => {
    let isValid = true;
    const roomNumberCounts = {};

    // Count room numbers across all rows
    roomRows.forEach((row) => {
      const num = (row.roomNumber || '').trim().toLowerCase();
      if (num) {
        roomNumberCounts[num] = (roomNumberCounts[num] || 0) + 1;
      }
    });

    const validated = roomRows.map((row) => {
      let rowError = '';
      const num = (row.roomNumber || '').trim();
      const parsedCap = parseInt(row.capacity, 10);

      if (!num) {
        rowError = 'Room No. is required';
        isValid = false;
      } else if (roomNumberCounts[num.toLowerCase()] > 1) {
        rowError = `Duplicate Room No. '${num}'`;
        isValid = false;
      } else if (
        row.capacity === '' ||
        row.capacity === null ||
        row.capacity === undefined ||
        isNaN(parsedCap) ||
        parsedCap < 1
      ) {
        rowError = 'Capacity must be at least 1';
        isValid = false;
      } else if (parsedCap > 50) {
        rowError = 'Capacity max is 50';
        isValid = false;
      } else if (!(row.floor || '').trim()) {
        rowError = 'Floor is required';
        isValid = false;
      } else if (!(row.roomType || '').trim()) {
        rowError = 'Room Type is required';
        isValid = false;
      }

      return {
        ...row,
        error: rowError,
      };
    });

    setRoomRows(validated);
    return isValid;
  };

  const handleSaveChanges = async () => {
    setModalError('');

    if (!selectedHostelId) {
      const msg = 'Please select a hostel first';
      setModalError(msg);
      toast.error(msg);
      return;
    }

    if (roomRows.length === 0) {
      const msg = 'Please add at least one room';
      setModalError(msg);
      toast.error(msg);
      return;
    }

    if (!validateRows()) {
      const msg = 'Please fix validation errors in room rows';
      setModalError(msg);
      toast.error(msg);
      return;
    }

    try {
      setSubmitting(true);
      let newCount = 0;
      let updateCount = 0;

      for (const row of roomRows) {
        const payload = {
          hostelId: selectedHostelId,
          roomNumber: row.roomNumber.trim(),
          capacity: parseInt(row.capacity, 10),
          floor: row.floor.trim(),
          roomType: row.roomType.trim(),
        };

        if (row.isNew) {
          await hostelService.createRoom(payload);
          newCount++;
        } else {
          // Check if changed
          const isChanged =
            row.roomNumber.trim() !== row.original.roomNumber ||
            parseInt(row.capacity, 10) !== row.original.capacity ||
            row.floor.trim() !== row.original.floor ||
            row.roomType.trim() !== row.original.roomType;

          if (isChanged) {
            await hostelService.updateRoom(row.id, {
              roomNumber: payload.roomNumber,
              capacity: payload.capacity,
              floor: payload.floor,
              roomType: payload.roomType,
            });
            updateCount++;
          }
        }
      }

      const totalProcessed = newCount + updateCount;
      if (totalProcessed > 0) {
        toast.success(
          `Saved room changes (${newCount} created, ${updateCount} updated)`
        );
      } else {
        toast.info('No changes detected');
      }

      if (onSuccess) onSuccess();
      onClose(); // Automatically close modal on successful save!
    } catch (err) {
      const errMsg =
        err.response?.data?.message || err.message || 'Failed to save room changes';
      setModalError(errMsg);
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedHostelObj = hostels.find((h) => h.id === selectedHostelId);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Manage Hostel Rooms"
        description="Select a hostel and manage its rooms, capacity, floor and room type."
        size="2xl"
      >
        <div className="space-y-4 text-xs">
          {modalError && <Alert type="danger">{modalError}</Alert>}

          {/* Hostel Selector Header */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Building className="w-4 h-4 text-indigo-600" />
                Select Hostel *
              </label>

              {selectedHostelObj && (
                <div className="flex items-center gap-2">
                  <Badge variant="indigo" className="text-[10px]">
                    Managing: {selectedHostelObj.name} ({selectedHostelObj.type})
                  </Badge>
                  <Badge variant="neutral" className="text-[10px]">
                    {roomRows.length} Rooms Total
                  </Badge>
                </div>
              )}
            </div>

            <Select
              value={selectedHostelId}
              onChange={(e) => setSelectedHostelId(e.target.value)}
              className="py-1.5 text-xs bg-white"
            >
              <option value="">-- Select a hostel --</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.type} Hostel)
                </option>
              ))}
            </Select>
          </div>

          {/* Rooms Table / Form Workspace */}
          {!selectedHostelId ? (
            <div className="p-10 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
              <DoorOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">Please select a hostel above to manage its rooms.</p>
            </div>
          ) : loadingRooms ? (
            <div className="flex justify-center p-12">
              <Spinner size="lg" />
            </div>
          ) : roomRows.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
              <DoorOpen className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <p className="font-bold text-slate-800 text-sm">No rooms added yet</p>
                <p className="text-slate-500 text-xs mt-0.5">Start by adding the first room to this hostel.</p>
              </div>
              <Button size="sm" icon={Plus} onClick={handleAddMoreRoom} className="h-8 text-xs">
                Add Room
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop / Tablet Header */}
              <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-3 py-2 bg-slate-100/80 rounded-lg text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <div className="col-span-3">Room No. *</div>
                <div className="col-span-2">Bed Capacity *</div>
                <div className="col-span-3">Floor *</div>
                <div className="col-span-3">Room Type *</div>
                <div className="col-span-1 text-center">Action</div>
              </div>

              {/* Room Rows List */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {roomRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className={`p-3 sm:p-2.5 rounded-xl border transition-all ${
                      row.error
                        ? 'border-rose-300 bg-rose-50/30'
                        : row.isNew
                        ? 'border-indigo-200 bg-indigo-50/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Desktop Horizontal Row Layout */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <Input
                          placeholder="e.g. 101"
                          value={row.roomNumber}
                          onChange={(e) => handleUpdateRow(row.id, 'roomNumber', e.target.value)}
                          className="py-1 text-xs font-semibold"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="1"
                          max="50"
                          placeholder="Beds"
                          value={row.capacity}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateRow(
                              row.id,
                              'capacity',
                              val === '' ? '' : parseInt(val, 10) || ''
                            );
                          }}
                          className="py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="e.g. 1st Floor"
                          value={row.floor}
                          onChange={(e) => handleUpdateRow(row.id, 'floor', e.target.value)}
                          className="py-1 text-xs"
                        />
                      </div>
                      <div className="col-span-3">
                        <Select
                          value={row.roomType}
                          onChange={(e) => handleUpdateRow(row.id, 'roomType', e.target.value)}
                          className="py-1 text-xs bg-white"
                        >
                          {ROOM_TYPE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="col-span-1 flex justify-center items-center">
                        {row.isNew ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveDraftRow(row.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove draft room row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteExistingRoom(row)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Stacked Card Layout */}
                    <div className="sm:hidden space-y-2">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <span className="font-bold text-slate-700">Room #{idx + 1}</span>
                        {row.isNew ? (
                          <Badge variant="indigo" className="text-[9px]">
                            New Draft
                          </Badge>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handlePromptDeleteExistingRoom(row)}
                            className="text-rose-600 font-medium hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Room No. *
                          </label>
                          <Input
                            placeholder="e.g. 101"
                            value={row.roomNumber}
                            onChange={(e) => handleUpdateRow(row.id, 'roomNumber', e.target.value)}
                            className="py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Bed Capacity *
                          </label>
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            value={row.capacity}
                            onChange={(e) => {
                              const val = e.target.value;
                              handleUpdateRow(
                                row.id,
                                'capacity',
                                val === '' ? '' : parseInt(val, 10) || ''
                              );
                            }}
                            className="py-1 text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Floor *
                          </label>
                          <Input
                            placeholder="e.g. 1st Floor"
                            value={row.floor}
                            onChange={(e) => handleUpdateRow(row.id, 'floor', e.target.value)}
                            className="py-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                            Room Type *
                          </label>
                          <Select
                            value={row.roomType}
                            onChange={(e) => handleUpdateRow(row.id, 'roomType', e.target.value)}
                            className="py-1 text-xs bg-white"
                          >
                            {ROOM_TYPE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Inline Validation Error Message */}
                    {row.error && (
                      <div className="mt-1 text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{row.error}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add More Room Button */}
              <div className="pt-2 flex justify-center sm:justify-start">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={handleAddMoreRoom}
                  className="h-8 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                >
                  Add More Room
                </Button>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="mt-6 flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              loading={submitting}
              loadingText="Saving..."
              onClick={handleSaveChanges}
              disabled={!selectedHostelId || roomRows.length === 0}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Room Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteConfirmRoom)}
        onClose={() => setDeleteConfirmRoom(null)}
        onConfirm={handleConfirmDeleteRoom}
        title={`Delete Room ${deleteConfirmRoom?.roomNumber}?`}
        message={`This will permanently remove Room '${deleteConfirmRoom?.roomNumber}' from ${
          selectedHostelObj?.name || 'the hostel'
        }. Any unused beds in this room will also be deleted. This action cannot be undone.`}
        confirmText="Delete Room"
        variant="danger"
        loading={deleting}
      />
    </>
  );
};
