import React, { useEffect, useState } from 'react';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Input.jsx';
import { DatePicker } from '../../components/ui/DatePicker.jsx';
import { Select } from '../../components/ui/Select.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { StaffSubNav } from './StaffSubNav.jsx';
import { IndividualStaffAdvanceReportModal } from './IndividualStaffAdvanceReportModal.jsx';
import { HandCoins, Plus, Search, FileText } from 'lucide-react';


export const StaffAdvancesPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [advanceDate, setAdvanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [remarks, setRemarks] = useState('');

  // Individual Advance Report Modal State
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportStaffId, setReportStaffId] = useState(null);
  const [reportStaffName, setReportStaffName] = useState('');


  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchAdvancesData = async () => {
    setLoading(true);
    try {
      const res = await staffService.getStaffList({ limit: 100 });
      setStaffList(res.data || []);
    } catch (err) {
      console.error('Failed to load staff advances data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvancesData();
  }, []);

  const handleGiveAdvance = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedStaffId) {
      setError('Please select a staff member.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid advance amount.');
      return;
    }

    setSubmitting(true);
    try {
      await staffService.disburseAdvance(selectedStaffId, {
        amount: numAmount,
        advanceDate,
        paymentMode,
        referenceNo,
        remarks,
      });

      setIsGiveModalOpen(false);
      setSelectedStaffId('');
      setAmount('');
      setReferenceNo('');
      setRemarks('');
      fetchAdvancesData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to disburse advance.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter staff with advances or search
  const filteredStaff = staffList.filter((st) => {
    const matchesSearch =
      st.name.toLowerCase().includes(search.toLowerCase()) ||
      st.employeeId.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  const activeStaff = staffList.filter(
    (st) => st.status === 'ACTIVE' || st.status === 'ON_LEAVE'
  );

  const staffOptions = activeStaff.map((st) => ({
    value: st.id,
    label: `${st.name} (${st.employeeId})`,
  }));

  const paymentModeOptions = [
    { value: 'CASH', label: 'Cash' },
    { value: 'UPI', label: 'UPI / Online' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHEQUE', label: 'Cheque' },
  ];

  return (
    <div className="space-y-6">
      <ModulePageHeader
        icon={HandCoins}
        title="Staff Advances"
        description="Disburse cash advances to active staff members and track outstanding recovery balances."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setIsGiveModalOpen(true)}>
            Give Advance
          </Button>
        }
      />

      <StaffSubNav />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff with Advances</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {staffList.filter((st) => Number(st.advanceBalance || 0) > 0).length}
            <span className="text-xs font-normal text-slate-500 ml-1">employees</span>
          </p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Outstanding Balance</span>
          <p className="text-2xl font-extrabold text-amber-600 font-mono mt-1">
            ₹{staffList.reduce((sum, st) => sum + Number(st.advanceBalance || 0), 0).toLocaleString('en-IN')}
          </p>
        </Card>

        <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Active Staff</span>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">
            {activeStaff.length}
            <span className="text-xs font-normal text-slate-500 ml-1">staff members</span>
          </p>
        </Card>
      </div>

      <Card className="p-4 bg-white border border-slate-200 shadow-2xs">
        <Input
          placeholder="Search staff by name or employee code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={Search}
        />
      </Card>

      <Card className="overflow-hidden shadow-2xs">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No staff records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Staff Member</th>
                  <th className="py-3.5 px-4 text-right">Base Salary (₹)</th>
                  <th className="py-3.5 px-4 text-right">Outstanding Advance (₹)</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredStaff.map((st) => {
                  const bal = Number(st.advanceBalance || 0);
                  const isOperational = st.status === 'ACTIVE' || st.status === 'ON_LEAVE';
                  return (
                    <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{st.name}</p>
                            <p className="text-[10px] text-slate-500 font-mono">ID: {st.employeeId}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                        ₹{Number(st.baseSalary || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold">
                        {bal > 0 ? (
                          <span className="text-amber-600">₹{bal.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isOperational ? (
                          bal > 0 ? (
                            <Badge variant="warning" size="sm">Outstanding</Badge>
                          ) : (
                            <Badge variant="neutral" size="sm">Clear</Badge>
                          )
                        ) : (
                          <Badge variant="danger" size="sm">Inactive</Badge>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            icon={FileText}
                            onClick={() => {
                              setReportStaffId(st.id);
                              setReportStaffName(st.name);
                              setIsReportModalOpen(true);
                            }}
                          >
                            View Report
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={!isOperational}
                            title={!isOperational ? 'Cannot disburse advance to inactive staff' : ''}
                            onClick={() => {
                              setSelectedStaffId(st.id);
                              setIsGiveModalOpen(true);
                            }}
                          >
                            Give Advance
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Give Advance Form Modal */}
      <Modal
        isOpen={isGiveModalOpen}
        onClose={() => setIsGiveModalOpen(false)}
        title="Give Staff Advance"
        size="md"
      >
        <form onSubmit={handleGiveAdvance} autoComplete="off" className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          <Select
            label="Select Staff *"
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
            options={[{ value: '', label: '-- Select Staff Member --' }, ...staffOptions]}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Advance Date *"
              value={advanceDate}
              onChange={(val) => setAdvanceDate(val)}
              required
            />

            <Input
              label="Advance Amount (₹) *"
              type="number"
              min="100"
              step="100"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <Select
            label="Payment Mode *"
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            options={paymentModeOptions}
          />

          <Input
            label="Transaction / Reference No."
            placeholder="e.g. Ref #12345"
            value={referenceNo}
            onChange={(e) => setReferenceNo(e.target.value)}
          />

          <Input
            label="Remarks / Note"
            placeholder="e.g. Personal emergency request"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="secondary" onClick={() => setIsGiveModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting} loadingText="Giving Advance...">
              Disburse Advance
            </Button>
          </div>
        </form>
      </Modal>

      {/* Individual Staff Advance Report Modal */}
      <IndividualStaffAdvanceReportModal
        isOpen={isReportModalOpen}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportStaffId(null);
          setReportStaffName('');
        }}
        staffId={reportStaffId}
        staffName={reportStaffName}
      />
    </div>
  );
};

