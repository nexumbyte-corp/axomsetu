import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, FileText, Loader2, RefreshCw, Printer, Download } from 'lucide-react';
import { StudentSummaryCard } from '../../components/fees/StudentSummaryCard.jsx';
import { LedgerTimeline } from '../../components/fees/LedgerTimeline.jsx';
import { ReceiptTable } from '../../components/fees/ReceiptTable.jsx';
import { useQuery } from '@tanstack/react-query';
import { studentService } from '../../services/student.service.js';
import { useStudentLedger, useStudentPayments } from '../../hooks/usePaymentEngine.js';
import { useAuth } from '../../hooks/useAuth.js';
import { Button } from '../../components/ui/Button.jsx';
import { ModulePageHeader } from '../../components/ui/ModulePageHeader.jsx';
import { toast } from '../../components/ui/Toast.jsx';
import { printPdfDocument, downloadPdfDocument } from '../../core/documents/documentEngine.js';

export const StudentLedgerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'payments'
  const [isPrintingStatement, setIsPrintingStatement] = useState(false);
  const [isDownloadingStatement, setIsDownloadingStatement] = useState(false);

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

  const schoolHeader =
    user?.schoolAdmins?.[0]?.school ||
    user?.school ||
    student?.school ||
    user?.staffProfile?.school ||
    user?.studentProfile?.school ||
    {};

  const handlePrintPaymentStatement = async () => {
    if (!studentPayments || studentPayments.length === 0) {
      toast.error('No payment records to print.');
      return;
    }
    setIsPrintingStatement(true);
    try {
      await printPdfDocument({
        templateId: 'paymentStatement',
        data: {
          student,
          payments: studentPayments,
          summary,
          schoolHeader,
          academicYear: ledgerData?.academicYear || student?.enrollment?.academicYear,
        },
        options: { copyLabel: 'Official Statement' },
      });
    } catch (err) {
      console.error('Failed to print payment statement:', err);
      toast.error('Unable to print payment statement. Please try again.');
    } finally {
      setIsPrintingStatement(false);
    }
  };

  const handleDownloadPaymentStatement = async () => {
    if (!studentPayments || studentPayments.length === 0) {
      toast.error('No payment records to download.');
      return;
    }
    setIsDownloadingStatement(true);
    try {
      const filename = `Payment_Statement_${student.admissionNo || student.name || 'Student'}.pdf`;
      await downloadPdfDocument({
        templateId: 'paymentStatement',
        data: {
          student,
          payments: studentPayments,
          summary,
          schoolHeader,
          academicYear: ledgerData?.academicYear || student?.enrollment?.academicYear,
        },
        filename,
        options: { copyLabel: 'Official Statement' },
      });
      toast.success(`Downloaded ${filename}`);
    } catch (err) {
      console.error('Failed to download payment statement:', err);
      toast.error('Unable to download payment statement. Please try again.');
    } finally {
      setIsDownloadingStatement(false);
    }
  };

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
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" icon={ArrowLeft} onClick={() => navigate('/app/students')}>
              <span className="hidden sm:inline">Back to List</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/app/fees/collect')}>
              <span className="hidden sm:inline">Collect Fee</span>
              <span className="sm:hidden">Collect</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetchLedger()} title="Refresh Ledger" className="p-2 sm:px-2.5">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      {/* Student Profile & Outstanding Summary Header with Print Statement Action */}
      <StudentSummaryCard
        student={student}
        outstandingSummary={summary}
        onPrintStatement={studentPayments.length > 0 ? handlePrintPaymentStatement : undefined}
        onDownloadStatement={studentPayments.length > 0 ? handleDownloadPaymentStatement : undefined}
        isPrintingStatement={isPrintingStatement || isDownloadingStatement}
        showLedgerButton={false}
      />

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
        <ReceiptTable
          payments={studentPayments}
          isLoading={isLoadingPayments}
          student={student}
          summary={summary}
          schoolHeader={schoolHeader}
          academicYear={ledgerData?.academicYear || student?.enrollment?.academicYear}
        />
      )}
    </div>
  );
};

export default StudentLedgerPage;
