import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, DoorOpen, Bed, ArrowRight, ArrowLeft, Check, User, Eye, AlertTriangle } from 'lucide-react';
import { hostelService } from '../../services/hostel.service.js';
import { studentService } from '../../services/student.service.js';
import { useAcademicYear } from '../../context/AcademicYearContext.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { Alert } from '../../components/ui/Alert.jsx';
import { StudentAvatar } from '../../components/students/StudentAvatar.jsx';
import { formatStudentClassInfo } from '../../utils/hostelUtils.js';
import { StudentPhotoModal } from '../../components/hostel/StudentPhotoModal.jsx';

export const HostelAdmissionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentAcademicYear, selectedYearId, academicYears } = useAcademicYear();

  const activeAcademicYearId = currentAcademicYear?.id || selectedYearId || (academicYears && academicYears[0]?.id);

  const [step, setStep] = useState(1); // 1: Student Search, 2: Hostel & Room, 3: Bed Picker, 4: Date & Review
  const [selectedPhotoStudent, setSelectedPhotoStudent] = useState(null);

  // Step 1: Student Search (Strictly ACTIVE students NOT enrolled in hostel)
  const [studentQuery, setStudentQuery] = useState('');
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [studentOptions, setStudentOptions] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Step 2 & 3: Hostel, Room, Bed Selection
  const [hostels, setHostels] = useState([]);
  const [selectedHostel, setSelectedHostel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [bedsInRoom, setBedsInRoom] = useState([]);
  const [selectedBed, setSelectedBed] = useState(null);

  // Step 4: Admission Date & Fee Preview & Overrides
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [feeConfig, setFeeConfig] = useState(null);
  const [admissionFeeOverride, setAdmissionFeeOverride] = useState('');
  const [monthlyFeeOverride, setMonthlyFeeOverride] = useState('');

  // Confirmation Modal
  const [showConfirmAdmission, setShowConfirmAdmission] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchHostels();
    fetchInitialActiveStudents();
  }, [activeAcademicYearId]);

  useEffect(() => {
    if (location.state?.student) {
      if (location.state.student.status === 'ACTIVE') {
        if (location.state.student.hostel?.enrolled) {
          toast.error('Student is already enrolled in hostel.');
        } else {
          setSelectedStudent(location.state.student);
          setStep(2);
        }
      } else {
        toast.error('Only active students may be admitted to hostel.');
      }
    } else if (location.state?.studentId) {
      fetchStudentById(location.state.studentId);
    }
  }, [location.state]);

  useEffect(() => {
    if (selectedHostel) {
      fetchRooms(selectedHostel.id);
    }
  }, [selectedHostel]);

  useEffect(() => {
    if (selectedRoom && selectedHostel) {
      fetchBeds(selectedHostel.id, selectedRoom.id);
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (activeAcademicYearId && selectedHostel) {
      fetchFeeConfig();
    }
  }, [activeAcademicYearId, selectedHostel]);

  const fetchStudentById = async (stId) => {
    try {
      const res = await studentService.getStudent(stId, activeAcademicYearId);
      if (res.data) {
        if (res.data.status !== 'ACTIVE') {
          toast.error('Selected student is not active. Only active students can be admitted.');
          return;
        }
        if (res.data.hostel?.enrolled) {
          toast.error('Student is already enrolled in hostel.');
          return;
        }
        setSelectedStudent(res.data);
        setStep(2);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pre-selected student');
    }
  };

  const fetchInitialActiveStudents = async () => {
    try {
      setSearchingStudents(true);
      const params = {
        status: 'ACTIVE',
        limit: 100,
      };
      if (activeAcademicYearId && typeof activeAcademicYearId === 'string' && activeAcademicYearId !== 'undefined' && activeAcademicYearId.length > 10) {
        params.academicYearId = activeAcademicYearId;
      }
      const res = await studentService.listStudents(params);
      const allActive = res.data || [];
      const unenrolled = allActive.filter((st) => !st.hostel?.enrolled);
      setStudentOptions(unenrolled);
    } catch (err) {
      console.error('Failed fetching active students:', err);
    } finally {
      setSearchingStudents(false);
    }
  };

  const fetchHostels = async () => {
    try {
      const res = await hostelService.listHostels();
      setHostels(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load hostels');
    }
  };

  const fetchRooms = async (hostelId) => {
    try {
      const res = await hostelService.listRooms({ hostelId, isActive: 'true' });
      setRooms(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load rooms');
    }
  };

  const fetchBeds = async (hostelId, roomId) => {
    try {
      const res = await hostelService.listBeds({ hostelId, roomId });
      setBedsInRoom(res.data || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load beds');
    }
  };

  const fetchFeeConfig = async () => {
    if (!activeAcademicYearId || !selectedHostel) return;
    try {
      const res = await hostelService.getFeeConfig({
        academicYearId: activeAcademicYearId,
        hostelId: selectedHostel.id,
      });
      setFeeConfig(res.data);
      if (res.data) {
        setAdmissionFeeOverride(res.data.admissionFeeEnabled ? res.data.admissionFeeAmount : 0);
        setMonthlyFeeOverride(res.data.monthlyFeeEnabled ? res.data.monthlyFeeAmount : 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchStudents = async (queryStr) => {
    setStudentQuery(queryStr);
    try {
      setSearchingStudents(true);
      const params = {
        status: 'ACTIVE',
        limit: 100,
      };
      if (queryStr && queryStr.trim()) {
        params.search = queryStr.trim();
      }
      if (activeAcademicYearId && typeof activeAcademicYearId === 'string' && activeAcademicYearId !== 'undefined' && activeAcademicYearId.length > 10) {
        params.academicYearId = activeAcademicYearId;
      }
      const res = await studentService.listStudents(params);
      const allActive = res.data || [];
      const unenrolled = allActive.filter((st) => !st.hostel?.enrolled);
      setStudentOptions(unenrolled);
    } catch (err) {
      console.error('Error searching students:', err);
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleConfirmAdmission = async () => {
    if (!activeAcademicYearId) {
      toast.error('Please select an active Academic Year');
      return;
    }

    if (!selectedStudent || !selectedHostel || !selectedRoom || !selectedBed || !startDate) {
      toast.error('Please complete all admission steps before submitting');
      return;
    }

    if (feeConfig && feeConfig.isFeeSet === false) {
      toast.error(`Hostel fee structure is not set for ${selectedHostel.name}. Please configure hostel fee rates before admitting students.`);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        academicYearId: activeAcademicYearId,
        studentId: selectedStudent.id,
        hostelId: selectedHostel.id,
        roomId: selectedRoom.id,
        bedId: selectedBed.id,
        startDate,
        admissionFeeOverride: admissionFeeOverride !== '' ? parseFloat(admissionFeeOverride) : undefined,
        monthlyFeeOverride: monthlyFeeOverride !== '' ? parseFloat(monthlyFeeOverride) : undefined,
      };

      await hostelService.admitStudent(payload);
      toast.success(`Admitted ${selectedStudent.name} to ${selectedHostel.name} (Room ${selectedRoom.roomNumber}, ${selectedBed.bedNumber}) successfully!`);
      setShowConfirmAdmission(false);
      navigate('/app/hostel/residents');
    } catch (err) {
      toast.error(err.message || 'Failed to complete hostel admission');
      setShowConfirmAdmission(false);
      if (err.message && err.message.toLowerCase().includes('bed is no longer available')) {
        setStep(3);
        fetchBeds(selectedHostel.id, selectedRoom.id);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to extract student academic placement fields cleanly
  const renderStudentMeta = (st) => {
    if (!st) return null;

    const primaryEnrollment =
      st.enrollment ||
      (Array.isArray(st.enrollments) ? st.enrollments[0] : null) ||
      st.academic ||
      st;

    const cls =
      primaryEnrollment?.class?.name ||
      primaryEnrollment?.className ||
      st.academic?.class?.name ||
      st.class?.name ||
      st.className ||
      '';

    const sec =
      primaryEnrollment?.section?.name ||
      primaryEnrollment?.sectionName ||
      st.academic?.section?.name ||
      st.section?.name ||
      st.sectionName ||
      '';

    const med =
      primaryEnrollment?.medium?.name ||
      primaryEnrollment?.mediumName ||
      st.academic?.medium?.name ||
      st.medium?.name ||
      st.mediumName ||
      '';

    const strm =
      primaryEnrollment?.stream?.name ||
      primaryEnrollment?.streamName ||
      st.academic?.stream?.name ||
      st.stream?.name ||
      st.streamName ||
      '';

    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 mt-1">
        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
          Adm No: {st.admissionNo}
        </span>

        {cls && (
          <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
            Class {cls}
          </span>
        )}

        {sec && (
          <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
            Section {sec}
          </span>
        )}

        {med && (
          <span className="font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded text-[11px]">
            {med} Medium
          </span>
        )}

        {strm && (
          <Badge variant="indigo" size="xs" className="font-semibold">
            Stream: {strm}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* Wizard Progress Header */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between text-xs">
          {[
            { id: 1, label: '1. Select Student' },
            { id: 2, label: '2. Hostel & Room' },
            { id: 3, label: '3. Pick Bed (Visual)' },
            { id: 4, label: '4. Start Date & Review' },
          ].map((s) => (
            <div
              key={s.id}
              className={`flex items-center space-x-1.5 font-bold ${
                step === s.id
                  ? 'text-indigo-600'
                  : step > s.id
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === s.id
                    ? 'bg-indigo-600 text-white'
                    : step > s.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {step > s.id ? <Check className="w-3 h-3" /> : s.id}
              </div>
              <span className="hidden sm:inline text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: ACTIVE UNENROLLED STUDENT SEARCH & SELECTION */}
      {step === 1 && (
        <Card className="p-4 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Step 1: Select Student for Hostel Admission
              </h2>
              <p className="text-xs text-slate-500">
                Displaying active students who are <strong>NOT currently enrolled in hostel</strong>.
              </p>
            </div>
            <Badge variant="indigo" size="sm">
              {studentOptions.length} Eligible Unenrolled Students
            </Badge>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-300 outline-none"
              placeholder="Search unenrolled student by name, admission number or phone..."
              value={studentQuery}
              onChange={(e) => handleSearchStudents(e.target.value)}
              autoFocus
            />
            {searchingStudents && (
              <div className="absolute right-3 top-2.5">
                <Spinner size="sm" />
              </div>
            )}
          </div>

          {/* Student Search Result Cards with Photo, Name, Adm No, Class, Stream, Medium, Section */}
          {studentOptions.length > 0 ? (
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {studentOptions.map((st) => {
                const isSelected = selectedStudent?.id === st.id;
                return (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStudent(st)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-50/90 border-2 border-indigo-600 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50/80 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Passport Photo / Avatar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoStudent({ name: st.name, admissionNo: st.admissionNo, photoUrl: st.photoUrl, guardianName: st.guardianName });
                        }}
                        className="relative group w-12 h-14 rounded-xl bg-slate-100 border border-slate-200 shadow-2xs overflow-hidden flex items-center justify-center shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:opacity-90 transition-all cursor-pointer"
                        title="Click to view full photo"
                      >
                        {st.photoUrl ? (
                          <img
                            src={st.photoUrl}
                            alt={st.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <StudentAvatar name={st.name} size="md" />
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </button>

                      {/* Metadata */}
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-sm hover:text-indigo-600 transition-colors">
                            {st.name}
                          </h3>
                          <Badge variant="green" size="xs">ACTIVE</Badge>
                          <Badge variant="neutral" size="xs">Day Scholar</Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <span className="font-medium text-slate-400">Guardian:</span>
                          <span className="font-semibold text-slate-700">{st.guardianName || st.fatherName || 'N/A'}</span>
                        </div>
                        {renderStudentMeta(st)}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <Button
                        size="sm"
                        variant={isSelected ? 'primary' : 'outline'}
                        className="h-8 text-xs font-bold"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudent(st);
                          setStep(2);
                        }}
                      >
                        {isSelected ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !searchingStudents && (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <User className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  No unenrolled active students found matching search criteria.
                </p>
              </div>
            )
          )}

          {selectedStudent && (
            <div className="p-4 bg-indigo-50/90 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-12 rounded-lg bg-white border border-indigo-200 overflow-hidden shrink-0">
                  {selectedStudent.photoUrl ? (
                    <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <StudentAvatar name={selectedStudent.name} size="sm" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Target Student Selected</span>
                  <h4 className="font-bold text-slate-900 text-sm">{selectedStudent.name}</h4>
                  {renderStudentMeta(selectedStudent)}
                </div>
              </div>

              <Button size="sm" variant="primary" onClick={() => setStep(2)} className="w-full sm:w-auto justify-center">
                Next: Select Hostel & Room
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* STEP 2: HOSTEL & ROOM SELECTION */}
      {step === 2 && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                {selectedStudent?.photoUrl ? (
                  <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <StudentAvatar name={selectedStudent?.name} size="sm" />
                )}
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Step 2: Select Hostel & Room</h2>
                <p className="text-xs text-slate-600 font-medium">
                  Student: <strong>{selectedStudent?.name}</strong> • {formatStudentClassInfo(selectedStudent)}
                </p>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => setStep(1)} className="h-7 text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
          </div>

          {/* Hostel Availability Table */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. Choose Available Hostel *
            </label>
            {hostels.length === 0 ? (
              <p className="text-xs text-slate-500">No hostels configured yet.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 font-semibold text-slate-600">
                    <tr>
                      <th className="px-3.5 py-2 text-left">Hostel</th>
                      <th className="px-3.5 py-2 text-center">Capacity</th>
                      <th className="px-3.5 py-2 text-center">Occupied</th>
                      <th className="px-3.5 py-2 text-center">Available</th>
                      <th className="px-3.5 py-2 text-center">Status</th>
                      <th className="px-3.5 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {hostels.map((h) => {
                      const isFull = h.availableBeds === 0;
                      const isSelected = selectedHostel?.id === h.id;
                      return (
                        <tr
                          key={h.id}
                          className={`hover:bg-slate-50 ${isSelected ? 'bg-indigo-50/60 font-semibold' : ''}`}
                        >
                          <td className="px-3.5 py-2 font-bold text-slate-900">{h.name} ({h.type})</td>
                          <td className="px-3.5 py-2 text-center">{h.totalBeds}</td>
                          <td className="px-3.5 py-2 text-center text-blue-600 font-bold">{h.occupiedBeds}</td>
                          <td className="px-3.5 py-2 text-center text-emerald-600 font-bold">{h.availableBeds}</td>
                          <td className="px-3.5 py-2 text-center">
                            <Badge variant={isFull ? 'red' : 'green'} className="text-[10px] py-0.5 px-2">
                              {isFull ? 'FULL' : 'Available'}
                            </Badge>
                          </td>
                          <td className="px-3.5 py-2 text-right">
                            <Button
                              disabled={isFull}
                              size="sm"
                              variant={isSelected ? 'primary' : 'outline'}
                              className="h-7 text-xs"
                              onClick={() => {
                                setSelectedHostel(h);
                                setSelectedRoom(null);
                                setSelectedBed(null);
                              }}
                            >
                              {isSelected ? 'Selected' : 'Select Hostel'}
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

          {/* Room Selection */}
          {selectedHostel && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                2. Choose Room in {selectedHostel.name} *
              </label>

              {rooms.length === 0 ? (
                <p className="text-xs text-slate-500">No rooms available in this hostel.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {rooms.map((r) => {
                    const isSelected = selectedRoom?.id === r.id;
                    const hasFreeBeds = r.availableBedsCount > 0;
                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          if (hasFreeBeds) {
                            setSelectedRoom(r);
                            setSelectedBed(null);
                          }
                        }}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          !hasFreeBeds
                            ? 'opacity-40 bg-slate-100 border-slate-200 cursor-not-allowed'
                            : isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow'
                            : 'bg-white border-slate-200 hover:border-indigo-400 cursor-pointer'
                        }`}
                      >
                        <DoorOpen className={`w-4 h-4 mx-auto ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                        <div className="text-xs font-bold mt-1">Room {r.roomNumber}</div>
                        <span className={`text-[10px] block ${isSelected ? 'text-indigo-100' : 'text-emerald-600 font-medium'}`}>
                          {r.availableBedsCount} / {r.capacity} Available
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {selectedHostel && feeConfig && feeConfig.isFeeSet === false && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Hostel Fee Structure Not Set</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                Hostel fee rates have not been configured for <strong>{selectedHostel.name}</strong> for the selected academic year. Students cannot be admitted until fee rates (monthly or admission fee) are set.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/hostel/fees')}
                className="bg-white text-xs text-amber-900 border-amber-300 hover:bg-amber-100"
              >
                Go to Hostel Fee Setup & Set Rates →
              </Button>
            </div>
          )}

          {selectedHostel && selectedRoom && (
            <div className="flex items-center justify-between pt-3">
              {feeConfig && feeConfig.isFeeSet === false && (
                <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Fee structure not set — Admission disabled
                </span>
              )}
              <Button
                size="sm"
                onClick={() => {
                  if (feeConfig && feeConfig.isFeeSet === false) {
                    toast.error(`Hostel fee structure is not set for ${selectedHostel.name}. Please configure fee rates first.`);
                    return;
                  }
                  setStep(3);
                }}
                disabled={Boolean(feeConfig && feeConfig.isFeeSet === false)}
                className="ml-auto"
              >
                Next: Pick Bed Visually
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* STEP 3: BOOKMYSHOW-STYLE VISUAL BED PICKER */}
      {step === 3 && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Step 3: Visual Bed Picker</h2>
              <p className="text-xs text-slate-500">
                Hostel: <strong>{selectedHostel?.name}</strong> • Room <strong>{selectedRoom?.roomNumber}</strong>
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep(2)} className="h-7 text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-700">
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded bg-indigo-600"></div>
              <span>Selected</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded bg-rose-500 opacity-60"></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-3 h-3 rounded bg-amber-400 opacity-60"></div>
              <span>Maintenance / Blocked</span>
            </div>
          </div>

          {/* Interactive Bed Matrix */}
          <div className="p-6 bg-slate-900 rounded-xl border border-slate-800">
            <div className="text-center text-slate-400 text-[10px] uppercase tracking-widest font-semibold mb-4">
              ── ROOM {selectedRoom?.roomNumber} BED LAYOUT ──
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {bedsInRoom.map((b) => {
                const isAvailable = b.status === 'AVAILABLE';
                const isOccupied = b.status === 'OCCUPIED';
                const isSelected = selectedBed?.id === b.id;

                return (
                  <button
                    key={b.id}
                    type="button"
                    disabled={!isAvailable}
                    onClick={() => setSelectedBed(b)}
                    className={`p-3 rounded-lg border flex flex-col items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-400 text-white ring-2 ring-indigo-400 shadow-md font-bold'
                        : isAvailable
                        ? 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-600/60 text-emerald-300 font-semibold cursor-pointer'
                        : isOccupied
                        ? 'bg-rose-950/20 border-rose-900/50 text-rose-400 opacity-50 cursor-not-allowed'
                        : 'bg-amber-950/20 border-amber-900/50 text-amber-400 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <Bed className="w-5 h-5 mb-1" />
                    <span className="font-bold text-xs">{b.bedNumber}</span>
                    <span className="text-[9px] mt-0.5 uppercase">
                      {isSelected ? 'SELECTED' : b.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedBed && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Selected Bed</span>
                <h4 className="font-bold text-slate-900 text-sm">{selectedBed.bedNumber} (Room {selectedRoom.roomNumber})</h4>
              </div>
              <Button size="sm" onClick={() => setStep(4)}>
                Next: Start Date & Review
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* STEP 4: START DATE & COMPACT REVIEW */}
      {step === 4 && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Step 4: Review & Confirm Admission</h2>
              <p className="text-xs text-slate-500">Review enrollment details before final confirmation</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStep(3)} className="h-7 text-xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back
            </Button>
          </div>

          {feeConfig && feeConfig.isFeeSet === false && (
            <Alert type="warning" title="Admission Blocked — Fee Structure Not Set">
              Hostel fee rates for <strong>{selectedHostel?.name}</strong> are not configured for the selected academic year. Please set up fee rates before admitting students.
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/app/hostel/fees')}
                  className="bg-white text-xs"
                >
                  Configure Hostel Fee Rates →
                </Button>
              </div>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Enrollment Summary */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1 uppercase tracking-wider">
                Enrollment Overview
              </h3>
              
              <div className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-200 mb-2">
                <div className="w-10 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                  {selectedStudent?.photoUrl ? (
                    <img src={selectedStudent.photoUrl} alt={selectedStudent.name} className="w-full h-full object-cover" />
                  ) : (
                    <StudentAvatar name={selectedStudent?.name} size="sm" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{selectedStudent?.name}</h4>
                  {renderStudentMeta(selectedStudent)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Hostel:</span>
                  <span className="font-semibold text-slate-800">{selectedHostel?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Room & Bed:</span>
                  <span className="font-bold text-indigo-600">Room {selectedRoom?.roomNumber} - {selectedBed?.bedNumber}</span>
                </div>
              </div>
            </div>

            {/* Fee Policy & Admission Fee Overrides */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
              <h3 className="font-bold text-slate-900 text-xs border-b border-slate-200 pb-1 uppercase tracking-wider flex items-center justify-between">
                <span>Hostel Fee Policy & Admission Overrides</span>
                <span className="text-[10px] text-indigo-600 font-normal">Editable for this student</span>
              </h3>
              
              {feeConfig?.admissionFeeEnabled ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Hostel Admission Fee (Default: ₹{feeConfig.admissionFeeAmount})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={admissionFeeOverride}
                    onChange={(e) => setAdmissionFeeOverride(e.target.value)}
                    placeholder={`Default ₹${feeConfig.admissionFeeAmount}`}
                    className="h-8 text-xs bg-white"
                  />
                </div>
              ) : null}

              {feeConfig?.monthlyFeeEnabled ? (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Start Month Hostel Monthly Fee (Default: ₹{feeConfig.monthlyFeeAmount})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyFeeOverride}
                    onChange={(e) => setMonthlyFeeOverride(e.target.value)}
                    placeholder={`Default ₹${feeConfig.monthlyFeeAmount}`}
                    className="h-8 text-xs bg-white"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Setting to ₹0 waives the start month monthly fee charge.
                  </p>
                </div>
              ) : null}

              {feeConfig && feeConfig.isFeeSet === false && (
                <div className="text-xs text-rose-600 font-bold italic py-2">
                  No fee rates are enabled or configured for this hostel.
                </div>
              )}
            </div>
          </div>

          <div className="max-w-xs">
            <Input
              label="Hostel Start Date *"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end space-x-3">
            <Button variant="outline" onClick={() => navigate('/app/hostel')}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (feeConfig && feeConfig.isFeeSet === false) {
                  toast.error(`Hostel fee structure is not set for ${selectedHostel?.name}. Please configure fee rates first.`);
                  return;
                }
                setShowConfirmAdmission(true);
              }}
              disabled={Boolean(feeConfig && feeConfig.isFeeSet === false)}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              Confirm Hostel Admission
            </Button>
          </div>
        </Card>
      )}

      {/* CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={showConfirmAdmission}
        onClose={() => setShowConfirmAdmission(false)}
        onConfirm={handleConfirmAdmission}
        title="Confirm Hostel Admission"
        message={`Are you sure you want to admit ${selectedStudent?.name} (Adm: ${selectedStudent?.admissionNo}) to ${selectedHostel?.name}, Room ${selectedRoom?.roomNumber} (${selectedBed?.bedNumber}) starting on ${startDate}?`}
        confirmText="Admit Student"
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
