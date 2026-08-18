import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { staffService } from '../../services/staff.service.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';
import { StaffSubNav } from './StaffSubNav.jsx';
import { DisburseAdvanceModal } from './DisburseAdvanceModal.jsx';
import { AddEditStaffModal } from './AddEditStaffModal.jsx';
import { IndividualStaffAdvanceReportModal } from './IndividualStaffAdvanceReportModal.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { ArrowLeft, User, DollarSign, HandCoins, History, CreditCard, Plus, Edit, FileText } from 'lucide-react';

export const StaffDetailsPage = () => {
  const { staffId } = useParams();
  const navigate = useNavigate();

  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchStaffProfile = async () => {
    setLoading(true);
    try {
      const res = await staffService.getStaff(staffId);
      setStaff(res.data);
    } catch (err) {
      console.error('Failed to fetch staff profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffId) {
      fetchStaffProfile();
    }
  }, [staffId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-500 text-sm">Staff member not found.</p>
        <Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/app/staff')}>
          Back to Staff List
        </Button>
      </div>
    );
  }

  const getStatusBadge = (st) => {
    switch (st) {
      case 'ACTIVE':
        return <Badge variant="success">ACTIVE</Badge>;
      case 'ON_LEAVE':
        return <Badge variant="warning">ON LEAVE</Badge>;
      case 'INACTIVE':
        return <Badge variant="neutral">INACTIVE</Badge>;
      case 'RESIGNED':
        return <Badge variant="danger">RESIGNED</Badge>;
      default:
        return <Badge variant="neutral">{st}</Badge>;
    }
  };

  // Calculate advance totals
  const advances = staff.advances || [];
  const totalAdvanceGiven = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0);
  const totalAdvanceRecovered = advances.reduce((sum, a) => sum + Number(a.recovered || 0), 0);
  const remainingAdvanceBalance = Number(staff.advanceBalance || 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'salary', label: 'Salary', icon: DollarSign },
    { id: 'advance', label: 'Advance', icon: HandCoins },
    { id: 'history', label: 'Salary History', icon: History },
  ];

  return (
    <div className="space-y-6">
      <ModulePageHeader
        icon={User}
        title={`Staff Profile: ${staff.name}`}
        description={`View staff employee details, salary history, and department role (${staff.employeeId}).`}
        actions={
          <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/app/staff')}>
            Back to Staff List
          </Button>
        }
      />

      {/* Shared Staff Navigation Tabs */}
      <StaffSubNav />

      {/* Profile Header Bar */}
      <Card className="p-6 bg-white border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/app/staff')}
            />

            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
              {staff.name.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-extrabold text-slate-900">{staff.name}</h1>
                {getStatusBadge(staff.status)}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="font-mono font-bold text-indigo-700">{staff.employeeId}</span>
                <span>•</span>
                <span>{staff.designation || 'Teacher'}</span>
                <span>•</span>
                <span>{staff.department || 'Teaching Department'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              icon={Edit}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex space-x-1 border-b border-slate-200 mt-6 -mb-6 pt-2 overflow-x-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-5 bg-white border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <User className="w-4 h-4 text-indigo-600" /> Personal & Employment Info
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Full Name</span>
                <p className="font-bold text-slate-900 mt-0.5">{staff.name}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Employee Code</span>
                <p className="font-mono font-bold text-indigo-700 mt-0.5">{staff.employeeId}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Department</span>
                <p className="font-semibold text-slate-800 mt-0.5">{staff.department || '—'}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Designation</span>
                <p className="font-semibold text-slate-800 mt-0.5">{staff.designation || '—'}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Phone</span>
                <p className="font-mono text-slate-800 mt-0.5">{staff.phone || '—'}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Email</span>
                <p className="text-slate-800 mt-0.5">{staff.email || '—'}</p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Joining Date</span>
                <p className="text-slate-800 mt-0.5">
                  {staff.joiningDate
                    ? new Date(staff.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Status</span>
                <div className="mt-0.5">{getStatusBadge(staff.status)}</div>
              </div>
            </div>
          </Card>

          <Card className="p-5 bg-white border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <CreditCard className="w-4 h-4 text-indigo-600" /> Bank & Salary Details
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Monthly Base Salary</span>
                  <p className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                    ₹{Number(staff.baseSalary || 0).toLocaleString('en-IN')}
                  </p>
                </div>

                <Button variant="outline" size="sm" onClick={() => navigate('/app/staff/salary')}>
                  Revise Salary
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div>
                  <span className="text-slate-400 font-medium">Bank Name</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{staff.bankName || 'Not configured'}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Account Number</span>
                  <p className="font-mono font-semibold text-slate-800 mt-0.5">{staff.bankAccountNo || 'Not configured'}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">IFSC Code</span>
                  <p className="font-mono font-semibold text-slate-800 mt-0.5">{staff.ifscCode || '—'}</p>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Advance Balance</span>
                  <p className="font-mono font-bold text-amber-600 mt-0.5">
                    ₹{remainingAdvanceBalance.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: SALARY */}
      {activeTab === 'salary' && (
        <Card className="p-6 bg-white border border-slate-200 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Salary Configuration</h3>
              <p className="text-xs text-slate-500 mt-0.5">Current monthly salary setup for {staff.name}</p>
            </div>

            <Button variant="primary" icon={DollarSign} onClick={() => navigate('/app/staff/salary')}>
              Salary Setup & Revision
            </Button>
          </div>

          <div className="p-5 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-xs text-indigo-700 font-semibold">Active Base Monthly Salary</span>
              <p className="text-3xl font-extrabold text-indigo-950 font-mono mt-1">
                ₹{Number(staff.baseSalary || 0).toLocaleString('en-IN')}
              </p>
            </div>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg">
              Active Setup
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-700">
              Salary Setup by Academic Year
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                <tr>
                  <th className="p-3">Academic Year</th>
                  <th className="p-3">Effective From</th>
                  <th className="p-3 text-right">Base Salary (₹)</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(staff.salarySetups || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">
                      No explicit academic year setup configured. Using standard base salary.
                    </td>
                  </tr>
                ) : (
                  staff.salarySetups.map((s, idx) => (
                    <tr key={s.id}>
                      <td className="p-3 font-bold text-slate-900">{s.academicYear?.name || 'Academic Year'}</td>
                      <td className="p-3 font-mono text-slate-600">
                        {new Date(s.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ₹{Number(s.baseSalary).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-center">
                        {idx === 0 ? <Badge variant="success">Current</Badge> : <Badge variant="neutral">Historical</Badge>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 3: ADVANCE */}
      {activeTab === 'advance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 bg-white border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Advance Given</span>
              <p className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
                ₹{totalAdvanceGiven.toLocaleString('en-IN')}
              </p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recovered Till Date</span>
              <p className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
                ₹{totalAdvanceRecovered.toLocaleString('en-IN')}
              </p>
            </Card>

            <Card className="p-4 bg-white border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Advance</span>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  disabled={staff.status !== 'ACTIVE' && staff.status !== 'ON_LEAVE'}
                  title={staff.status !== 'ACTIVE' && staff.status !== 'ON_LEAVE' ? 'Cannot disburse advance to inactive staff' : ''}
                  onClick={() => setIsAdvanceModalOpen(true)}
                >
                  Give Advance
                </Button>
              </div>
              <p className="text-2xl font-extrabold text-amber-600 font-mono mt-1">
                ₹{remainingAdvanceBalance.toLocaleString('en-IN')}
              </p>
            </Card>
          </div>

          <Card className="overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Advance Ledger History</span>
              <Button
                variant="outline"
                size="sm"
                icon={FileText}
                onClick={() => setIsReportModalOpen(true)}
              >
                Individual Advance Report
              </Button>
            </div>

            {advances.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No advance payments given to this staff member yet.
              </div>
            ) : (
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Advance (₹)</th>
                    <th className="p-3 text-right">Recovered (₹)</th>
                    <th className="p-3 text-right">Remaining (₹)</th>
                    <th className="p-3">Mode</th>
                    <th className="p-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {advances.map((adv) => {
                    const amount = Number(adv.amount);
                    const recovered = Number(adv.recovered);
                    const rem = amount - recovered;
                    return (
                      <tr key={adv.id}>
                        <td className="p-3 font-mono text-slate-800">
                          {new Date(adv.advanceDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          ₹{amount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-700">
                          ₹{recovered.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-600">
                          ₹{rem.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3">{adv.paymentMode}</td>
                        <td className="p-3 text-slate-500">{adv.remarks || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {/* TAB 4: SALARY HISTORY */}
      {activeTab === 'history' && (
        <Card className="overflow-hidden border border-slate-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-800">
            Historical Salary Records & Setup History
          </div>

          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
              <tr>
                <th className="p-3">Academic Year</th>
                <th className="p-3">Effective From</th>
                <th className="p-3 text-right">Monthly Base Salary (₹)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {(staff.salarySetups || []).length === 0 ? (
                <tr>
                  <td className="p-3 font-bold text-slate-900">Current Academic Year</td>
                  <td className="p-3 font-mono text-slate-600">
                    {staff.joiningDate ? new Date(staff.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '01-Apr'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    ₹{Number(staff.baseSalary || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant="success">Current</Badge>
                  </td>
                </tr>
              ) : (
                staff.salarySetups.map((s, idx) => (
                  <tr key={s.id}>
                    <td className="p-3 font-bold text-slate-900">{s.academicYear?.name || 'Academic Year'}</td>
                    <td className="p-3 font-mono text-slate-600">
                      {new Date(s.effectiveFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">
                      ₹{Number(s.baseSalary).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      {idx === 0 ? <Badge variant="success">Current</Badge> : <Badge variant="neutral">Historical</Badge>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* Give Advance Modal */}
      <DisburseAdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        staff={staff}
        onSuccess={fetchStaffProfile}
      />

      {/* Edit Profile Modal */}
      <AddEditStaffModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        staff={staff}
        onSuccess={fetchStaffProfile}
      />

      {/* Individual Staff Advance Report Modal */}
      <IndividualStaffAdvanceReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        staffId={staffId}
        staffName={staff?.name}
      />
    </div>
  );
};
