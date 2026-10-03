import React, { useEffect, useState, useRef, useMemo } from 'react';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StaffSubNav } from '../staff/StaffSubNav.jsx';
import { DocumentActions } from '../../components/documents/DocumentActions.jsx';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  User,
  Search,
  ChevronDown,
  Check,
  X,
} from 'lucide-react';

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI / GPay / PhonePe' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer / NEFT' },
  { value: 'CHEQUE', label: 'Cheque' },
];

export const SalaryPaymentsPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(true);

  const [pendingData, setPendingData] = useState(null);
  const [loadingPending, setLoadingPending] = useState(false);

  // Selection state: Map of payrollId -> { selected: boolean, payNowAmount: number, error: string }
  const [selectionMap, setSelectionMap] = useState({});

  // Payment form metadata
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [paying, setPaying] = useState(false);

  // Modals state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);

  // Searchable Staff Dropdown State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [staffSearch, setStaffSearch] = useState('');
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const selectedStaff = useMemo(
    () => staffList.find((st) => st.id === selectedStaffId) || null,
    [staffList, selectedStaffId]
  );

  const filteredStaffList = useMemo(() => {
    if (!staffSearch.trim()) return staffList;
    const q = staffSearch.toLowerCase().trim();
    return staffList.filter((st) => {
      const nameMatch = st.name?.toLowerCase().includes(q);
      const idMatch = st.employeeId?.toLowerCase().includes(q);
      const deptMatch = st.department?.toLowerCase().includes(q);
      const desigMatch = st.designation?.toLowerCase().includes(q);
      const roleMatch = st.role?.toLowerCase().includes(q);
      const phoneMatch = st.phone?.includes(q);
      return Boolean(nameMatch || idMatch || deptMatch || desigMatch || roleMatch || phoneMatch);
    });
  }, [staffList, staffSearch]);

  const fetchStaffDirectory = async () => {
    setLoadingStaff(true);
    try {
      const res = await staffService.getStaffList({ limit: 250, status: 'ACTIVE' });
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  useEffect(() => {
    fetchStaffDirectory();
  }, []);

  const fetchPendingPayrolls = async (staffId) => {
    if (!staffId) {
      setPendingData(null);
      setSelectionMap({});
      return;
    }
    setLoadingPending(true);
    try {
      const res = await staffService.getPendingPayrollsForStaff(staffId);
      const data = res.data;
      setPendingData(data);

      const initialMap = {};
      (data.pendingPayrolls || []).forEach((p, idx) => {
        initialMap[p.id] = {
          selected: idx === 0,
          payNowAmount: p.balance,
          balance: p.balance,
          error: '',
        };
      });
      setSelectionMap(initialMap);
    } catch (err) {
      console.error('Failed to load pending payrolls:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchPendingPayrolls(selectedStaffId);
  }, [selectedStaffId]);

  const handleSelectOldest = (count) => {
    const num = parseInt(count, 10);
    if (!pendingData?.pendingPayrolls) return;

    setSelectionMap((prev) => {
      const updated = { ...prev };
      pendingData.pendingPayrolls.forEach((p, idx) => {
        if (updated[p.id]) {
          updated[p.id].selected = idx < num;
          updated[p.id].payNowAmount = p.balance;
          updated[p.id].error = '';
        }
      });
      return updated;
    });
  };

  const handleSelectAll = (select) => {
    if (!pendingData?.pendingPayrolls) return;
    setSelectionMap((prev) => {
      const updated = { ...prev };
      pendingData.pendingPayrolls.forEach((p) => {
        if (updated[p.id]) {
          updated[p.id].selected = select;
          updated[p.id].payNowAmount = p.balance;
          updated[p.id].error = '';
        }
      });
      return updated;
    });
  };

  const handleToggleSelect = (payrollId) => {
    setSelectionMap((prev) => {
      const item = prev[payrollId];
      if (!item) return prev;
      return {
        ...prev,
        [payrollId]: {
          ...item,
          selected: !item.selected,
        },
      };
    });
  };

  const handlePayNowChange = (payrollId, val) => {
    setSelectionMap((prev) => {
      const item = prev[payrollId];
      if (!item) return prev;
      const numVal = parseFloat(val);
      let error = '';
      if (isNaN(numVal) || numVal <= 0) {
        error = 'Amount must be > 0';
      } else if (numVal > item.balance + 0.01) {
        error = `Exceeds max ₹${item.balance.toLocaleString('en-IN')}`;
      }
      return {
        ...prev,
        [payrollId]: {
          ...item,
          payNowAmount: isNaN(numVal) ? val : numVal,
          error,
        },
      };
    });
  };

  const handleFillRemaining = (payrollId) => {
    setSelectionMap((prev) => {
      const item = prev[payrollId];
      if (!item) return prev;
      return {
        ...prev,
        [payrollId]: {
          ...item,
          selected: true,
          payNowAmount: item.balance,
          error: '',
        },
      };
    });
  };

  const selectedEntries = Object.entries(selectionMap).filter(([_, v]) => v.selected);
  const selectedCount = selectedEntries.length;
  const hasValidationError = selectedEntries.some(
    ([_, v]) => Boolean(v.error) || Number(v.payNowAmount) <= 0 || Number(v.payNowAmount) > v.balance + 0.01
  );
  const totalPayNow = selectedEntries.reduce((sum, [_, v]) => sum + (Number(v.payNowAmount) || 0), 0);

  const handlePreSubmit = (e) => {
    e.preventDefault();
    if (!selectedStaffId || selectedCount === 0) {
      alert('Please select at least one pending month to pay.');
      return;
    }
    if (hasValidationError) {
      alert('Please correct validation errors before proceeding with payment.');
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmDisbursement = async () => {
    const paymentsPayload = selectedEntries.map(([payrollId, v]) => ({
      monthlyPayrollId: payrollId,
      payNowAmount: Number(v.payNowAmount),
    }));

    setPaying(true);
    try {
      const res = await staffService.recordMultiMonthSalaryPayment({
        staffId: selectedStaffId,
        payments: paymentsPayload,
        paymentMode,
        referenceNo,
        remarks,
      });

      const receiptRes = await staffService.getSalaryPaymentReceiptData(res.data.salaryPayment.id);

      setShowConfirmModal(false);
      setSuccessModalData(receiptRes.data);
      setReferenceNo('');
      setRemarks('');
      fetchPendingPayrolls(selectedStaffId);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Payment processing failed.');
    } finally {
      setPaying(false);
    }
  };

  const allPayrollsSelected =
    pendingData?.pendingPayrolls?.length > 0 &&
    pendingData.pendingPayrolls.every((p) => selectionMap[p.id]?.selected);

  return (
    <div className="space-y-4">
      <ModulePageHeader
        icon={CreditCard}
        title="Salary Payments & Disbursal"
        description="Disburse pending monthly staff salaries with partial settlement and instant voucher generation."
      />

      <StaffSubNav />

      <Card className="p-3 bg-white border border-slate-200 shadow-2xs overflow-visible relative z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="w-full md:w-96 relative" ref={dropdownRef}>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Select Staff Member
            </label>

            {/* Custom Searchable Staff Combobox Trigger */}
            <button
              type="button"
              disabled={loadingStaff}
              onClick={() => {
                setIsDropdownOpen((prev) => {
                  const next = !prev;
                  if (next) {
                    setTimeout(() => searchRef.current?.focus(), 50);
                  }
                  return next;
                });
              }}
              className={`w-full h-9 px-3 rounded-lg border flex items-center justify-between gap-2 text-xs transition-all bg-white cursor-pointer ${
                isDropdownOpen
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'border-slate-300 hover:border-slate-400 shadow-2xs'
              } ${loadingStaff ? 'bg-slate-50 cursor-not-allowed opacity-60' : ''}`}
            >
              {loadingStaff ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Spinner size="sm" />
                  <span>Loading staff directory...</span>
                </div>
              ) : selectedStaff ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {selectedStaff.name?.charAt(0)}
                  </div>
                  <span className="font-bold text-slate-900 truncate">{selectedStaff.name}</span>
                  <span className="font-mono text-slate-500 text-[10px] shrink-0 font-medium">
                    ({selectedStaff.employeeId})
                  </span>
                  {(selectedStaff.department || selectedStaff.designation) && (
                    <span className="text-slate-400 text-[10px] hidden sm:inline truncate">
                      • {selectedStaff.department || selectedStaff.designation}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search or select staff member...</span>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0 text-slate-400">
                {selectedStaffId && !loadingStaff && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedStaffId('');
                      setStaffSearch('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        setSelectedStaffId('');
                        setStaffSearch('');
                      }
                    }}
                    className="p-1 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    title="Clear selection"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180 text-indigo-600' : ''
                  }`}
                />
              </div>
            </button>

            {/* Dropdown Menu Panel */}
            {isDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in duration-100 min-w-[320px]">
                {/* Search Bar Header */}
                <div className="p-2 border-b border-slate-100 bg-slate-50/80">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      placeholder="Search by name, ID, role, dept..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsDropdownOpen(false);
                        }
                      }}
                    />
                    {staffSearch && (
                      <button
                        type="button"
                        onClick={() => setStaffSearch('')}
                        className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                        title="Clear search text"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1 px-1 text-[10px] text-slate-400 font-medium">
                    <span>
                      {filteredStaffList.length} of {staffList.length} staff
                    </span>
                    {selectedStaffId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStaffId('');
                          setIsDropdownOpen(false);
                        }}
                        className="text-rose-600 hover:underline font-semibold cursor-pointer"
                      >
                        Clear selection
                      </button>
                    )}
                  </div>
                </div>

                {/* Staff List Options */}
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100/80 text-xs">
                  {filteredStaffList.length === 0 ? (
                    <div className="py-6 px-4 text-center text-slate-400">
                      <Search className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                      <p className="font-semibold text-slate-600 text-xs">No staff found</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">No active staff match "{staffSearch}"</p>
                      {staffSearch && (
                        <button
                          type="button"
                          onClick={() => setStaffSearch('')}
                          className="mt-2 text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredStaffList.map((st) => {
                      const isSelected = st.id === selectedStaffId;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setSelectedStaffId(st.id);
                            setIsDropdownOpen(false);
                            setStaffSearch('');
                          }}
                          className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 text-indigo-900'
                              : 'hover:bg-slate-50 text-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {st.name?.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-xs truncate ${isSelected ? 'font-bold text-indigo-900' : 'font-semibold text-slate-900'}`}>
                                  {st.name}
                                </span>
                                <span className="font-mono text-[10px] px-1 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold shrink-0">
                                  {st.employeeId}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="truncate">{st.designation || st.department || 'Staff'}</span>
                                {Number(st.advanceBalance || 0) > 0 && (
                                  <span className="font-mono text-amber-700 bg-amber-50 px-1 rounded shrink-0">
                                    Adv: ₹{Number(st.advanceBalance).toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {pendingData?.staff ? (
            <div className="flex flex-wrap items-center gap-4 bg-slate-50 border border-slate-200/80 rounded-xl px-3.5 py-2 flex-1 justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 leading-snug">{pendingData.staff.name}</h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {pendingData.staff.employeeId} | {pendingData.staff.designation || 'Staff'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Pending Months</span>
                  <span className="font-bold text-slate-900">{pendingData.pendingCount}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-medium block">Total Balance Due</span>
                  <span className="font-extrabold text-rose-600">
                    ₹{pendingData.totalBalance.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-1">
              Select a staff member to view pending salary records.
            </div>
          )}
        </div>
      </Card>

      {!selectedStaffId ? (
        <Card className="p-12 text-center text-slate-500 text-xs">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="font-bold text-slate-700 text-sm">No Staff Selected</p>
          <p className="mt-1 text-slate-400">Please choose a staff member above to start disbursing monthly salaries.</p>
        </Card>
      ) : loadingPending ? (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" />
        </div>
      ) : !pendingData || pendingData.pendingPayrolls.length === 0 ? (
        <Card className="p-10 text-center text-slate-500 text-xs space-y-2">
          <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">All Clear! No Pending Salary Dues</h4>
          <p className="text-slate-500">
            All prepared salary records for <strong>{pendingData?.staff?.name}</strong> have been fully paid.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
          <div className="lg:col-span-2 space-y-3">
            <Card className="overflow-hidden shadow-2xs border border-slate-200">
              <div className="p-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Pending Monthly Salaries ({pendingData.pendingCount})
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 font-medium">Quick Select:</span>
                  <button
                    onClick={() => handleSelectOldest(1)}
                    className="px-2 py-0.5 font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded transition-colors"
                  >
                    1st Month
                  </button>
                  <button
                    onClick={() => handleSelectOldest(2)}
                    className="px-2 py-0.5 font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 rounded transition-colors"
                  >
                    2 Months
                  </button>
                  <button
                    onClick={() => handleSelectAll(!allPayrollsSelected)}
                    className="px-2 py-0.5 font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded transition-colors"
                  >
                    {allPayrollsSelected ? 'Clear All' : 'Select All'}
                  </button>
                </div>
              </div>

              <div className="table-responsive-wrapper">
                <table className="w-full text-xs text-left min-w-[650px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={allPayrollsSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3 text-right">Net Due (₹)</th>
                      <th className="py-2.5 px-3 text-right">Paid (₹)</th>
                      <th className="py-2.5 px-3 text-right">Balance (₹)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right w-44">Disburse Now (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-xs">
                    {pendingData.pendingPayrolls.map((p) => {
                      const item = selectionMap[p.id] || {};
                      const isSelected = Boolean(item.selected);
                      const hasErr = Boolean(item.error);

                      return (
                        <tr
                          key={p.id}
                          className={`transition-colors ${
                            hasErr ? 'bg-rose-50/60' : isSelected ? 'bg-indigo-50/30' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(p.id)}
                              className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                            />
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900">{p.month} {p.year}</span>
                            {p.academicYearName && (
                              <span className="text-[10px] text-slate-400 block font-mono">{p.academicYearName}</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-semibold">
                            ₹{p.netSalary.toLocaleString('en-IN')}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            ₹{p.paidAmount.toLocaleString('en-IN')}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                            ₹{p.balance.toLocaleString('en-IN')}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            {p.paidAmount > 0 ? (
                              <Badge variant="neutral" size="sm">PARTIAL</Badge>
                            ) : (
                              <Badge variant="warning" size="sm">UNPAID</Badge>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right space-y-1">
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                type="button"
                                onClick={() => handleFillRemaining(p.id)}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline shrink-0"
                                title="Set full balance"
                              >
                                Full
                              </button>
                              <Input
                                size="sm"
                                type="number"
                                min="1"
                                max={p.balance}
                                value={item.payNowAmount ?? p.balance}
                                onChange={(e) => handlePayNowChange(p.id, e.target.value)}
                                disabled={!isSelected}
                                className={`w-28 text-right font-mono font-bold text-xs ${
                                  hasErr ? 'border-rose-500 focus:ring-rose-500 bg-rose-50' : ''
                                }`}
                              />
                            </div>
                            {hasErr && isSelected && (
                              <p className="text-[10px] text-rose-600 font-bold text-right leading-tight">
                                {item.error}
                              </p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-3 sticky top-16">
            <Card className="p-3.5 bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Settlement Summary
                </span>
                <Badge variant="success" size="sm">
                  {selectedCount} Month{selectedCount !== 1 ? 's' : ''} Selected
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-700">Total Disbursement</span>
                <span className="font-mono text-xl font-extrabold text-emerald-900">
                  ₹{totalPayNow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </Card>

            <Card className="p-3.5 bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                <span>Payment Details</span>
              </h4>

              {hasValidationError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold rounded-lg flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                  <span>Fix validation errors before disbursing salary.</span>
                </div>
              )}

              <form onSubmit={handlePreSubmit} autoComplete="off" className="space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Payment Mode *</label>
                  <Select
                    size="sm"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    options={PAYMENT_MODES}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Ref / UTR / Cheque No.</label>
                  <Input
                    size="sm"
                    placeholder="e.g. UTR / Txn # / Cheque #"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Remarks</label>
                  <Input
                    size="sm"
                    placeholder="Optional disbursement note..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    fullWidth
                    icon={DollarSign}
                    disabled={selectedCount === 0 || totalPayNow <= 0 || hasValidationError}
                  >
                    Disburse ₹{totalPayNow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}

      <Modal
        isOpen={showConfirmModal}
        onClose={paying ? undefined : () => setShowConfirmModal(false)}
        size="sm"
        title="Confirm Salary Disbursement"
        description="Please verify payment details before confirming transaction."
      >
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">{pendingData?.staff?.name}</h4>
                <p className="text-[10px] text-slate-500 font-mono">{pendingData?.staff?.employeeId}</p>
              </div>
            </div>
            <Badge variant="info" size="sm">{selectedCount} Month(s)</Badge>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Total Disburse Amount</span>
              <span className="font-mono text-lg font-extrabold text-emerald-900">
                ₹{totalPayNow.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 text-[11px]">
              <div className="flex items-center justify-between bg-white/80 px-2 py-1 rounded border border-emerald-100">
                <span className="text-slate-500 font-medium">Mode</span>
                <span className="font-bold text-slate-800">{paymentMode}</span>
              </div>
              {referenceNo && (
                <div className="flex items-center justify-between bg-white/80 px-2 py-1 rounded border border-emerald-100">
                  <span className="text-slate-500 font-medium">Ref #</span>
                  <span className="font-bold font-mono text-indigo-700">{referenceNo}</span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmModal(false)}
              disabled={paying}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDisbursement}
              isLoading={paying}
              loadingText="Disbursing..."
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Confirm & Disburse
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(successModalData)}
        onClose={() => setSuccessModalData(null)}
        title="Salary Disbursement Voucher Generated"
        size="lg"
      >
        {successModalData && (
          <div className="space-y-5 text-xs">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center space-y-1">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-base font-extrabold text-emerald-950">Disbursement Recorded</h3>
              <p className="text-xs text-emerald-700 font-mono">
                Voucher No: <span className="font-bold">{successModalData.paymentNumber}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-medium block">Staff Name</span>
                <p className="font-bold text-slate-900 text-xs mt-0.5">{successModalData.staff?.name}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Employee Code</span>
                <p className="font-mono font-bold text-indigo-700 text-xs mt-0.5">{successModalData.staff?.employeeId}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Payment Method</span>
                <p className="font-bold text-slate-800 text-xs mt-0.5">{successModalData.paymentMode}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium block">Disbursed Amount</span>
                <p className="font-mono font-extrabold text-emerald-700 text-sm mt-0.5">
                  ₹{Number(successModalData.netSalary).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <div className="bg-slate-900 text-white p-2 font-bold text-[11px] uppercase tracking-wider">
                Salary Settlement Breakdown
              </div>
              <div className="divide-y divide-slate-100">
                {(successModalData.allocations || []).map((alloc, idx) => {
                  const s = alloc.settlement || {};
                  return (
                    <div key={alloc.id || idx} className="p-3 bg-white space-y-2">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5">
                        <span className="font-bold text-slate-900">
                          Period: {alloc.monthlyPayroll?.month} {alloc.monthlyPayroll?.year}
                          {alloc.monthlyPayroll?.workingDays ? (
                            <span className="ml-2 font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              Worked: {alloc.monthlyPayroll.workedDays ?? '-'} / {alloc.monthlyPayroll.workingDays} days
                            </span>
                          ) : null}
                        </span>
                        <Badge variant={s.status === 'PAID' ? 'success' : 'neutral'} size="sm">
                          {s.status || 'PARTIALLY PAID'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono pt-0.5">
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Salary Due</span>
                          <span className="font-bold text-slate-900">₹{(s.salaryDue || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Previously Paid</span>
                          <span className="font-bold text-slate-600">₹{(s.previouslyPaid || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-600 font-bold block uppercase">Current Disbursement</span>
                          <span className="font-bold text-emerald-700">₹{(s.currentDisbursement || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-semibold block uppercase">Total Paid</span>
                          <span className="font-bold text-slate-900">₹{(s.totalPaid || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-600 font-bold block uppercase">Remaining Unpaid</span>
                          <span className="font-bold text-rose-700">₹{(s.remainingUnpaid || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end items-center gap-2.5 pt-2 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setSuccessModalData(null)}>
                Done
              </Button>
              <DocumentActions
                templateId="salary"
                data={successModalData}
                filename={`SalaryVoucher_${successModalData?.paymentNumber || 'VOUCHER'}.pdf`}
                title={`Salary Voucher #${successModalData?.paymentNumber || ''}`}
                variant="printOnly"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SalaryPaymentsPage;
