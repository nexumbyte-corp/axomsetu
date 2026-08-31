import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { DatePicker } from '../ui/DatePicker.jsx';
import { Alert } from '../ui/Alert.jsx';
import { Badge } from '../ui/Badge.jsx';
import { studentService } from '../../services/student.service.js';
import { toast } from '../ui/Toast.jsx';
import {
  ArrowRight,
  AlertCircle,
  ArrowRightLeft,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  FileText,
  Info,
  ChevronRight,
  Sparkles,
  Layers,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

export const StudentTransferModal = ({
  isOpen,
  onClose,
  student,
  currentEnrollment,
  mediums = [],
  streams = [],
  onSuccess,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [transferDate, setTransferDate] = useState(todayStr);
  const [targetMediumId, setTargetMediumId] = useState('');
  const [targetStreamId, setTargetStreamId] = useState('');
  const [reason, setReason] = useState('');

  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);

  const [confirmStep, setConfirmStep] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Initialize fields from current enrollment
  useEffect(() => {
    if (isOpen && currentEnrollment) {
      setTransferDate(todayStr);
      setTargetMediumId(currentEnrollment.medium?.id || currentEnrollment.mediumId || '');
      setTargetStreamId(currentEnrollment.stream?.id || currentEnrollment.streamId || '');
      setReason('');
      setPreviewData(null);
      setPreviewError(null);
      setConfirmStep(false);
    }
  }, [isOpen, currentEnrollment, todayStr]);

  const cls = currentEnrollment?.class;
  const hasStream = Boolean(cls?.hasStream);

  // Live Transfer Preview Fetcher
  const fetchPreview = useCallback(async () => {
    if (!student || !targetMediumId || !transferDate) return;

    // Check if configuration changed
    const isMediumSame = targetMediumId === (currentEnrollment?.medium?.id || currentEnrollment?.mediumId);
    const isStreamSame = hasStream ? targetStreamId === (currentEnrollment?.stream?.id || currentEnrollment?.streamId) : true;

    if (isMediumSame && isStreamSame) {
      setPreviewData(null);
      setPreviewError('Target Medium and Stream configuration must be different from current enrollment');
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const res = await studentService.getTransferPreview(student.id, {
        targetMediumId,
        targetStreamId: hasStream ? targetStreamId : undefined,
        transferDate,
      });
      if (res.success && res.data) {
        setPreviewData(res.data);
      } else {
        setPreviewError(res.message || 'Failed calculating transfer preview');
      }
    } catch (err) {
      setPreviewError(err.message || 'Failed calculating transfer preview');
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  }, [student, targetMediumId, targetStreamId, transferDate, currentEnrollment, hasStream]);

  useEffect(() => {
    if (isOpen && targetMediumId && transferDate) {
      const timer = setTimeout(() => {
        fetchPreview();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, targetMediumId, targetStreamId, transferDate, fetchPreview]);

  if (!student || !currentEnrollment) return null;

  const handleExecuteTransfer = async () => {
    setSubmitting(true);
    try {
      const res = await studentService.transferStudent(student.id, {
        targetMediumId,
        targetStreamId: hasStream ? targetStreamId : undefined,
        transferDate,
        reason,
      });

      toast.success(res.message || 'Student transfer completed successfully');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed executing student transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const isMediumSame = targetMediumId === (currentEnrollment?.medium?.id || currentEnrollment?.mediumId);
  const isStreamSame = hasStream ? targetStreamId === (currentEnrollment?.stream?.id || currentEnrollment?.streamId) : true;
  const isConfigSame = isMediumSame && isStreamSame;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {confirmStep ? 'Confirm Transfer' : 'Mid-Session Transfer'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Student: <span className="text-slate-800 font-semibold">{student.name}</span> ({student.admissionNo})
            </p>
          </div>
        </div>
      }
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full pt-0.5">
          {confirmStep ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmStep(false)}
                disabled={submitting}
                className="border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
              >
                ← Back
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteTransfer}
                loading={submitting}
                loadingText="Executing..."
                icon={ArrowRightLeft}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-xs"
              >
                Confirm & Complete
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={submitting}
                className="border-slate-300 hover:bg-slate-50 text-slate-700 font-medium"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setConfirmStep(true)}
                disabled={!previewData || Boolean(previewError) || isConfigSame || previewLoading}
                icon={ArrowRight}
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Review Impact
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* STEP PROGRESS INDICATOR */}
        <div className="flex items-center justify-center gap-2 bg-slate-50 border border-slate-200/80 p-1.5 rounded-xl text-xs">
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
            !confirmStep ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 bg-white border border-slate-200'
          }`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              !confirmStep ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            }`}>1</span>
            Configuration
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all ${
            confirmStep ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 bg-transparent'
          }`}>
            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              confirmStep ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-400'
            }`}>2</span>
            Confirmation
          </div>
        </div>

        {!confirmStep ? (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* CURRENT ENROLLMENT SUMMARY CARD */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-3 shadow-md border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Current Active Enrollment
                </span>
                <Badge variant="indigo" className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-[9px] uppercase tracking-wider py-0 px-1.5">
                  {currentEnrollment.academicYear?.name || 'Current Year'}
                </Badge>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-white/5 backdrop-blur-xs p-2 rounded-lg border border-white/10">
                  <span className="text-[9px] text-slate-300 block uppercase tracking-wider">Class</span>
                  <span className="font-bold text-xs text-white">{currentEnrollment.class?.name || '—'}</span>
                </div>
                <div className="bg-white/5 backdrop-blur-xs p-2 rounded-lg border border-white/10">
                  <span className="text-[9px] text-slate-300 block uppercase tracking-wider">Medium</span>
                  <span className="font-bold text-xs text-indigo-200">{currentEnrollment.medium?.name || '—'}</span>
                </div>
                <div className="bg-white/5 backdrop-blur-xs p-2 rounded-lg border border-white/10">
                  <span className="text-[9px] text-slate-300 block uppercase tracking-wider">Stream</span>
                  <span className="font-bold text-xs text-white">
                    {currentEnrollment.stream?.name || (hasStream ? 'Not Billed' : 'N/A')}
                  </span>
                </div>
              </div>
            </div>

            {/* TARGET SELECTION FORM */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs space-y-3">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                Target Transfer Configuration
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Effective Transfer Date */}
                <div>
                  <DatePicker
                    label="Effective Transfer Date"
                    required
                    value={transferDate}
                    minDate={todayStr}
                    onChange={(val) => {
                      if (val && val < todayStr) {
                        toast.error('Transfer date cannot be a backdate prior to today');
                        setTransferDate(todayStr);
                        return;
                      }
                      setTransferDate(val || todayStr);
                    }}
                  />
                </div>

                {/* Target Medium */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-indigo-600" />
                    Target Medium <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={targetMediumId}
                    onChange={(e) => setTargetMediumId(e.target.value)}
                    className="w-full text-xs font-medium bg-slate-50/50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                  >
                    <option value="">Select Medium</option>
                    {mediums.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {!m.isActive ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Stream */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3 text-indigo-600" />
                    Target Stream {hasStream && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={targetStreamId}
                    onChange={(e) => setTargetStreamId(e.target.value)}
                    disabled={!hasStream}
                    className="w-full text-xs font-medium bg-slate-50/50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <option value="">{hasStream ? 'Select Stream' : 'N/A'}</option>
                    {streams.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {!s.isActive ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Optional Reason */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  Reason / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Parental request for Medium change"
                  className="w-full text-xs font-medium bg-slate-50/50 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
            </div>

            {/* CONFIGURATION SAME WARNING */}
            {isConfigSame && (
              <Alert variant="info" icon={Info} title="Select a New Configuration">
                Choose a different Medium or Stream to preview transfer impact.
              </Alert>
            )}

            {/* ERROR BANNER */}
            {previewError && (
              <Alert variant="danger" icon={ShieldAlert} title="Transfer Validation Error">
                {previewError}
              </Alert>
            )}

            {/* FEE IMPACT PREVIEW BREAKDOWN */}
            {previewLoading && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin mx-auto" />
                <span className="text-xs font-semibold text-slate-600 block">Calculating live fee structure impact...</span>
              </div>
            )}

            {!previewLoading && previewData && (
              <div className="bg-gradient-to-b from-slate-50/90 to-indigo-50/30 rounded-xl border border-indigo-100 p-3.5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-indigo-100/80 pb-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Financial Impact (From {formatDate(previewData.transferDate)})
                  </h4>
                  <Badge variant="indigo" size="sm" className="text-[10px]">
                    {previewData.affectedChargesCount} Charges Recalculated
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white border border-slate-200/80 rounded-lg p-2 shadow-2xs">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Current Fee</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {formatCurrency(previewData.feeSummary.currentMonthlyFee)}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200/80 rounded-lg p-2 shadow-2xs">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Target Fee</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {formatCurrency(previewData.feeSummary.targetMonthlyFee)}
                    </span>
                  </div>

                  <div className="bg-white border border-indigo-200/80 rounded-lg p-2 shadow-2xs">
                    <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider block mb-0.5 flex items-center justify-center gap-0.5">
                      {previewData.feeSummary.monthlyDifference > 0 ? (
                        <TrendingUp className="w-3 h-3 text-indigo-600" />
                      ) : previewData.feeSummary.monthlyDifference < 0 ? (
                        <TrendingDown className="w-3 h-3 text-emerald-600" />
                      ) : null}
                      Difference
                    </span>
                    <span className={`text-xs font-extrabold ${previewData.feeSummary.monthlyDifference > 0 ? 'text-indigo-700' : 'text-slate-800'}`}>
                      {previewData.feeSummary.monthlyDifference > 0 ? '+' : ''}
                      {formatCurrency(previewData.feeSummary.monthlyDifference)}
                    </span>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-lg p-2 shadow-xs">
                    <span className="text-[9px] font-bold text-emerald-100 uppercase tracking-wider block mb-0.5">
                      Add'l Payable
                    </span>
                    <span className="text-sm font-black text-white">
                      {formatCurrency(previewData.feeSummary.additionalAmountPayable)}
                    </span>
                  </div>
                </div>

                {/* POLICY ALERT BANNER */}
                {previewData.feeSummary.isTargetLower ? (
                  <Alert variant="info" icon={Info} title="Lower Target Fee Notice">
                    No refund or credit balance issued for lower target fee structure.
                  </Alert>
                ) : previewData.feeSummary.additionalAmountPayable > 0 ? (
                  <Alert variant="warning" icon={AlertCircle} title="Higher Fee Adjustment">
                    Charges on/after {formatDate(previewData.transferDate)} will include additional payable amount of {formatCurrency(previewData.feeSummary.additionalAmountPayable)}.
                  </Alert>
                ) : (
                  <Alert variant="success" icon={CheckCircle2} title="Identical Fee Tier">
                    No additional fee adjustment required.
                  </Alert>
                )}
              </div>
            )}
          </div>
        ) : (
          /* STEP 2: CONFIRMATION STEP */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* COMPARISON SIDE-BY-SIDE CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* FROM CONFIGURATION */}
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">From Current</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Medium:</span>
                    <span className="font-bold text-slate-800">{currentEnrollment.medium?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stream:</span>
                    <span className="font-bold text-slate-800">{currentEnrollment.stream?.name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1">
                    <span className="text-slate-500">Rate:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(previewData?.feeSummary?.currentMonthlyFee || 0)}</span>
                  </div>
                </div>
              </div>

              {/* TO CONFIGURATION */}
              <div className="bg-indigo-50/70 rounded-xl border border-indigo-200 p-3 space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 block">To Target</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Target Medium:</span>
                    <span className="font-extrabold text-indigo-900">{previewData?.targetEnrollment?.mediumName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Target Stream:</span>
                    <span className="font-extrabold text-indigo-900">{previewData?.targetEnrollment?.streamName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between border-t border-indigo-200/80 pt-1">
                    <span className="text-slate-600">Target Rate:</span>
                    <span className="font-extrabold text-indigo-950">{formatCurrency(previewData?.feeSummary?.targetMonthlyFee || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* FINAL SUMMARY HIGHLIGHT */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-4 shadow-md space-y-2">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  Transfer Summary
                </span>
                <Badge variant="indigo" className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[9px] py-0 px-1.5">
                  Effective: {formatDate(transferDate)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs pt-0.5">
                <div>
                  <span className="text-slate-400 block text-[9px]">Transfer Date</span>
                  <span className="font-bold text-white text-[11px]">{formatDate(transferDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">Add'l Payable</span>
                  <span className="font-extrabold text-emerald-400 text-[11px]">{formatCurrency(previewData?.feeSummary?.additionalAmountPayable || 0)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px]">Reason</span>
                  <span className="font-medium text-slate-200 truncate block text-[11px]">{reason || 'Not specified'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
