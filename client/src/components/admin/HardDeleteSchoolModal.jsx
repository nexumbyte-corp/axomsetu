import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ShieldAlert, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Spinner } from '../ui/Spinner.jsx';
import { adminService } from '../../services/adminService.js';

export const HardDeleteSchoolModal = ({ isOpen, onClose, school, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Identity Confirmation, 2: Captcha & Phrase

  // Step 1 Form Data
  const [inputName, setInputName] = useState('');
  const [inputCode, setInputCode] = useState('');

  // Step 2 Captcha & Phrase Data
  const [captchaData, setCaptchaData] = useState(null);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Reset state when modal opens/closes or school changes
  useEffect(() => {
    if (isOpen && school) {
      setStep(1);
      setInputName('');
      setInputCode('');
      setCaptchaData(null);
      setCaptchaAnswer('');
      setConfirmPhrase('');
      setErrorMessage(null);
    }
  }, [isOpen, school]);

  const fetchCaptcha = async () => {
    if (!school?.id) return;
    setLoadingCaptcha(true);
    setErrorMessage(null);
    try {
      const res = await adminService.getHardDeleteCaptcha(school.id);
      if (res.success && res.data) {
        setCaptchaData(res.data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch CAPTCHA verification challenge');
    } finally {
      setLoadingCaptcha(false);
    }
  };

  const handleGoToStep2 = () => {
    if (inputName.trim() !== school?.name) {
      setErrorMessage('School name does not match target school name.');
      return;
    }
    if (inputCode.trim() !== school?.code) {
      setErrorMessage('School code does not match target school code.');
      return;
    }

    setErrorMessage(null);
    setStep(2);
    fetchCaptcha();
  };

  const handleHardDeleteSubmit = async (e) => {
    e.preventDefault();
    if (!school?.id || !captchaData?.captchaToken) return;

    if (confirmPhrase.trim() !== 'PERMANENTLY DELETE') {
      setErrorMessage('Confirmation phrase must be PERMANENTLY DELETE.');
      return;
    }

    if (!captchaAnswer.trim()) {
      setErrorMessage('Please enter the CAPTCHA verification answer.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        confirmSchoolName: inputName.trim(),
        confirmSchoolCode: inputCode.trim(),
        confirmPhrase: confirmPhrase.trim(),
        captchaToken: captchaData.captchaToken,
        captchaAnswer: captchaAnswer.trim(),
      };

      const res = await adminService.hardDeleteSchool(school.id, payload);
      if (res.success) {
        if (onSuccess) onSuccess(res.message || `School ${school.name} deleted permanently.`);
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Hard deletion failed. Check your verification answers.');
      // Refresh CAPTCHA on failure
      fetchCaptcha();
      setCaptchaAnswer('');
    } finally {
      setSubmitting(false);
    }
  };

  const isStep1Valid = inputName.trim() === school?.name && inputCode.trim() === school?.code;

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => {} : onClose}
      title={
        <div className="flex items-center gap-2 text-rose-700 font-extrabold text-base">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>PERMANENT HARD DELETE — {school?.name}</span>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Warning Banner */}
        <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3.5 rounded-xl text-xs leading-relaxed space-y-1">
          <div className="font-extrabold flex items-center gap-1.5 text-rose-700 uppercase tracking-wider text-[11px]">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>EXTREME CAUTION: PERMANENT DATA PURGE</span>
          </div>
          <p>
            This operation will <strong>permanently purge all data</strong> associated with{' '}
            <strong className="underline decoration-rose-400">{school?.name}</strong> from the database.
          </p>
          <ul className="list-disc list-inside text-[11px] text-rose-800 pt-1 space-y-0.5 font-medium">
            <li>All Student & Staff Enrollment Records</li>
            <li>All Fee Types, Structures, Charges & Payment Receipts</li>
            <li>All Financial Ledgers, Expenses & Fund Transactions</li>
            <li>All Hostel Facilities, Rooms & Bed Allocations</li>
            <li>All Active Subscriptions & Admin User Accounts</li>
          </ul>
        </div>

        {errorMessage && (
          <div className="bg-rose-100 border border-rose-300 text-rose-800 px-3.5 py-2.5 rounded-lg text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Step Indicator */}
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">
          <span className={step === 1 ? 'text-rose-600 font-extrabold' : 'text-slate-400'}>
            Step 1: School Identity Confirmation
          </span>
          <span className={step === 2 ? 'text-rose-600 font-extrabold' : 'text-slate-400'}>
            Step 2: CAPTCHA & Security Phrase
          </span>
        </div>

        {/* STEP 1: Identity Confirmation */}
        {step === 1 && (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-slate-600 leading-relaxed">
              To verify that you intend to delete this specific school tenant, please enter the exact{' '}
              <strong>School Name</strong> and <strong>School Code</strong> below.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 font-mono">
              <div>
                <span className="text-slate-400 font-sans uppercase text-[10px] block">Target School Name</span>
                <span className="font-bold text-slate-900">{school?.name}</span>
              </div>
              <div className="pt-1">
                <span className="text-slate-400 font-sans uppercase text-[10px] block">Target School Code</span>
                <span className="font-bold text-slate-900">{school?.code}</span>
              </div>
            </div>

            <Input
              label={`Type Exact School Name: "${school?.name}" *`}
              placeholder="Type school name"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              autoComplete="off"
            />

            <Input
              label={`Type Exact School Code: "${school?.code}" *`}
              placeholder="Type school code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              autoComplete="off"
            />

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={ArrowRight}
                disabled={!isStep1Valid}
                onClick={handleGoToStep2}
              >
                Proceed to CAPTCHA Verification
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: CAPTCHA & Confirmation Phrase */}
        {step === 2 && (
          <form onSubmit={handleHardDeleteSubmit} autoComplete="off" className="space-y-4 pt-1">
            <p className="text-xs text-slate-600 leading-relaxed">
              Please solve the dynamic CAPTCHA security challenge and enter the mandatory confirmation phrase.
            </p>

            {/* CAPTCHA Display Card */}
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  Dynamic Security CAPTCHA
                </span>
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  disabled={loadingCaptcha}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingCaptcha ? 'animate-spin' : ''}`} />
                  <span>Refresh Challenge</span>
                </button>
              </div>

              {loadingCaptcha ? (
                <div className="py-4 flex justify-center">
                  <Spinner size="sm" label="Generating fresh CAPTCHA..." />
                </div>
              ) : captchaData ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Math Puzzle</span>
                    <span className="text-lg font-mono font-extrabold text-amber-400 tracking-wider">
                      {captchaData.mathQuestion} = ?
                    </span>
                  </div>
                  <div className="p-3 bg-slate-800 rounded-lg border border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Security Code</span>
                    <span className="text-lg font-mono font-extrabold text-emerald-400 tracking-widest select-all">
                      {captchaData.securityCode}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-rose-400">Failed to load CAPTCHA challenge.</p>
              )}
            </div>

            <Input
              label="Enter CAPTCHA Answer (Math Result or Security Code) *"
              placeholder="e.g. 47 or HD892K"
              required
              value={captchaAnswer}
              onChange={(e) => setCaptchaAnswer(e.target.value)}
              autoComplete="off"
            />

            <div className="space-y-1">
              <Input
                label='Type Mandatory Phrase: "PERMANENTLY DELETE" *'
                placeholder="PERMANENTLY DELETE"
                required
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                autoComplete="off"
              />
              <span className="text-[10px] text-slate-400 block font-mono">
                Must match exact uppercase string: PERMANENTLY DELETE
              </span>
            </div>

            <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={ArrowLeft}
                onClick={() => setStep(1)}
                disabled={submitting}
              >
                Back to Step 1
              </Button>

              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  loading={submitting}
                  loadingText="Hard Deleting..."
                  disabled={
                    confirmPhrase.trim() !== 'PERMANENTLY DELETE' ||
                    !captchaAnswer.trim() ||
                    !captchaData ||
                    submitting
                  }
                >
                  Confirm & Hard Delete School Permanently
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
