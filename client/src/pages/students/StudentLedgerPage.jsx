import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, Loader2, RefreshCw } from 'lucide-react';
import { StudentSummaryCard } from '../../components/fees/StudentSummaryCard.jsx';
import { LedgerTimeline } from '../../components/fees/LedgerTimeline.jsx';
import { ReceiptTable } from '../../components/fees/ReceiptTable.jsx';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '../../services/student.service.js';
import { useStudentLedger, useStudentPayments } from '../../hooks/usePaymentEngine.js';
import { Button } from '../../components/ui/Button.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';

export const StudentLedgerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'payments'

  const { data: studentRes, isLoading: isLoadingStudent } = useQuery({
    queryKey: ['students', id],
    queryFn: () => studentService.getStudent(id),
    enabled: Boolean(id),
  });
  const { data: ledgerRes, isLoading: isLoadingLedger, refetch: refetchLedger } = useStudentLedger(id);
  const { data: paymentsRes, isLoading: isLoadingPayments } = useStudentPayments(id);

  const student = studentRes?.data || studentRes;
  const ledgerData = ledgerRes?.data || ledgerRes || {};
  const charges = ledgerData.charges || [];
  const summary = ledgerData.summary || {};
  const studentPayments = paymentsRes?.data || paymentsRes || [];

  if (isLoadingStudent || isLoadingLedger) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading student fee ledger...</p>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-2xs space-y-3">
        <p className="text-sm font-bold text-slate-900">Student Not Found</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/students')}>
          Back to Students List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Standardized Module Page Header */}
      <ModulePageHeader
        icon={FileText}
        title="Student Fee Ledger"
        description="Complete derived fee timeline, charge breakdown, and payment history."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/app/students')}>
              Back to List
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/app/fees/collect')}>
              Collect Fee
            </Button>
            <button
              onClick={() => refetchLedger()}
              className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Student Profile & Outstanding Summary Header */}
      <StudentSummaryCard student={student} outstandingSummary={summary} />

      {/* Navigation Sub-Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Fee Timeline & Charges ({charges.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 pb-3 px-1 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'payments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Payment History ({studentPayments.length})</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'timeline' ? (
        <LedgerTimeline charges={charges} />
      ) : (
        <ReceiptTable payments={studentPayments} isLoading={isLoadingPayments} />
      )}
    </div>
  );
};

export default StudentLedgerPage;
