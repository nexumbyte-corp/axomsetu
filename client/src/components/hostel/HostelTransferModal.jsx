import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Bed } from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { DatePicker } from '../ui/DatePicker.jsx';
import { Select } from '../ui/Select.jsx';
import { Badge } from '../ui/Badge.jsx';
import { toast } from '../ui/Toast.jsx';
import { formatStudentClassInfo } from '../../utils/hostelUtils.js';

export const HostelTransferModal = ({ isOpen, onClose, resident, onSuccess }) => {
  const [hostels, setHostels] = useState([]);
  const [toHostelId, setToHostelId] = useState('');
  const [toRooms, setToRooms] = useState([]);
  const [toRoomId, setToRoomId] = useState('');
  const [toBeds, setToBeds] = useState([]);
  const [selectedToBed, setSelectedToBed] = useState(null);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferReason, setTransferReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHostels();
      // Reset selections
      setToHostelId('');
      setToRoomId('');
      setSelectedToBed(null);
      setTransferReason('');
      setTransferDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (toHostelId) {
      fetchToRooms(toHostelId);
    } else {
      setToRooms([]);
      setToRoomId('');
      setToBeds([]);
      setSelectedToBed(null);
    }
  }, [toHostelId]);

  useEffect(() => {
    if (toRoomId && toHostelId) {
      fetchToBeds(toHostelId, toRoomId);
    } else {
      setToBeds([]);
      setSelectedToBed(null);
    }
  }, [toRoomId]);

  const fetchHostels = async () => {
    try {
      const res = await hostelService.listHostels();
      setHostels(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load hostels');
    }
  };

  const fetchToRooms = async (hId) => {
    try {
      const res = await hostelService.listRooms({ hostelId: hId, isActive: 'true' });
      setToRooms(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load rooms');
    }
  };

  const fetchToBeds = async (hId, rId) => {
    try {
      const res = await hostelService.listBeds({ hostelId: hId, roomId: rId });
      setToBeds(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load beds');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resident || !resident.id) {
      toast.error('No resident selected for transfer');
      return;
    }
    if (!toHostelId || !toRoomId || !selectedToBed) {
      toast.error('Please select target hostel, room, and available bed');
      return;
    }

    try {
      setSubmitting(true);
      await hostelService.transferStudent({
        enrollmentId: resident.id,
        toHostelId,
        toRoomId,
        toBedId: selectedToBed.id,
        transferDate,
        reason: transferReason || 'Hostel Transfer',
      });

      toast.success(`Transferred ${resident.studentName || 'student'} successfully!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Transfer failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!resident) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hostel Room Transfer"
      description="Transfer resident to another hostel building, room, or bed."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Resident Summary Header */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-900 text-sm">{resident.studentName}</span>
            <span className="text-slate-500 ml-2">Adm No: {resident.admissionNo}</span>
            <p className="text-slate-600 mt-0.5 font-medium">
              {formatStudentClassInfo(resident)}
            </p>
            <p className="text-indigo-600 mt-0.5">
              Current: <strong>{resident.hostelName}</strong> • Room {resident.roomNumber} ({resident.bedNumber})
            </p>
          </div>
          <Badge variant="blue">ACTIVE RESIDENT</Badge>
        </div>

        {/* Target Hostel & Room Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Target Hostel *"
            value={toHostelId}
            onChange={(e) => setToHostelId(e.target.value)}
            required
          >
            <option value="">Select Target Hostel</option>
            {hostels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.type})
              </option>
            ))}
          </Select>

          <Select
            label="Target Room *"
            value={toRoomId}
            onChange={(e) => setToRoomId(e.target.value)}
            disabled={!toHostelId}
            required
          >
            <option value="">Select Target Room</option>
            {toRooms.map((r) => (
              <option key={r.id} value={r.id} disabled={r.availableBedsCount === 0}>
                Room {r.roomNumber} ({r.availableBedsCount} available / {r.capacity} cap)
              </option>
            ))}
          </Select>
        </div>

        {/* Visual BookMyShow-style Bed Selector */}
        {toRoomId && (
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select Available Bed *
            </label>
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800">
              {toBeds.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">No beds found in room.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {toBeds.map((b) => {
                    const isAvailable = b.status === 'AVAILABLE';
                    const isSelected = selectedToBed?.id === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => setSelectedToBed(b)}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400 font-bold shadow'
                            : isAvailable
                            ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-600/60 text-emerald-300 font-semibold cursor-pointer'
                            : 'bg-red-950/20 border-red-900/50 text-red-400 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <Bed className="w-4 h-4 mx-auto mb-1" />
                        <span className="text-xs block">{b.bedNumber}</span>
                        <span className="text-[10px] uppercase block opacity-80 mt-0.5">
                          {isSelected ? 'Selected' : b.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transfer Date and Reason */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DatePicker
            label="Transfer Effective Date *"
            value={transferDate}
            onChange={(val) => setTransferDate(val)}
            required
          />
          <Input
            label="Reason for Transfer"
            placeholder="Enter reason for room change"
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
          />
        </div>

        <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting} className="bg-indigo-600 hover:bg-indigo-700">
            <ArrowLeftRight className="w-4 h-4 mr-1.5" />
            Confirm Transfer
          </Button>
        </div>
      </form>
    </Modal>
  );
};
