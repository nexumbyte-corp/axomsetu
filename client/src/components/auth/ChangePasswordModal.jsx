import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { useToast } from '../ui/Toast.jsx';
import { authService } from '../../services/auth.service.js';
import { useAuth } from '../../hooks/useAuth.js';

export const ChangePasswordModal = ({ isOpen, onClose }) => {
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleReset = () => {
    setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(false);
  };

  const handleClose = () => {
    handleReset();
    if (onClose) onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formData.currentPassword) {
      setErrorMsg('Current password is required');
      return;
    }
    if (!formData.newPassword || formData.newPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters long');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setErrorMsg('New password and confirmation password do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await authService.changePassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      const message = res?.data?.message || 'Password changed successfully! Signing out...';
      setSuccessMsg(message);
      if (showToast) showToast('Password updated successfully. Please log in with your new password.', 'success');

      // Auto sign-out after 1.8s since backend revokes active user sessions
      setTimeout(async () => {
        handleClose();
        await logout();
      }, 1800);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to change password';
      setErrorMsg(msg);
      if (showToast) showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Your Password"
      description="Update your account login password. You will be prompted to log back in after changing."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1" autoComplete="off">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Current Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Current Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              placeholder="Enter your current password"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 pr-9 text-slate-900 font-mono"
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
            >
              {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            New Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="At least 8 characters"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 pr-9 text-slate-900 font-mono"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
            >
              {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">Must be at least 8 characters long.</p>
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Confirm New Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Re-enter new password"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50 pr-9 text-slate-900 font-mono"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1"
            >
              {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            icon={Lock}
            loading={loading}
            disabled={loading || Boolean(successMsg)}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
