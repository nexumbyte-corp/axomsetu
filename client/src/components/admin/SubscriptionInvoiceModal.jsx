import React, { useRef } from 'react';
import { Printer, X, Check, ShieldCheck, Building2, Calendar, Users, Award, Receipt } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { formatDate } from '../../utils/formatters.js';
import { BRAND_CONFIG } from '../../config/brandConfig.js';

export const SubscriptionInvoiceModal = ({ isOpen, onClose, subscription, school }) => {
  const invoiceRef = useRef(null);

  if (!isOpen || !subscription) return null;

  const targetSchool = school || {
    name: subscription.schoolName || 'Partner School',
    code: subscription.schoolCode || '-',
    email: subscription.schoolEmail || subscription.email || '-',
    phone: subscription.phone || '-',
    address: subscription.address || '-',
  };

  const invoiceNo = `INV-SUB-${new Date(subscription.createdAt || subscription.startDate || Date.now()).getFullYear()}-${String(subscription.id || '').slice(-6).toUpperCase()}`;
  
  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

  const handlePrint = () => {
    window.print();
  };

  // Plan features fallback if not specified on custom plan
  const defaultFeatures = [
    'Student Admission & Comprehensive Profiles',
    'Fee Structures & Instant Digital Receipts',
    'Staff Payroll & Monthly Salary Disbursements',
    'Academic Year & Class/Section Setup',
    'Financial PDF & Excel Administrative Reports',
    'Expense Ledgers & Vendor Tracking',
    'Hostel Room & Mess Fee Allocation',
    'Role-Based Staff Access Control',
  ];

  const planFeatures = Array.isArray(subscription.plan?.features) && subscription.plan.features.length > 0
    ? subscription.plan.features.map((f) => (typeof f === 'string' ? f : f.name))
    : (Array.isArray(subscription.features) ? subscription.features : defaultFeatures);

  const basePrice = Number(subscription.basePriceSnapshot || subscription.basePrice || subscription.finalPriceSnapshot || subscription.finalPrice || 0);
  const discount = Number(subscription.discountSnapshot || subscription.discount || 0);
  const finalPrice = Number(subscription.finalPriceSnapshot || subscription.finalPrice || 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Subscription Business Invoice" maxWidth="max-w-4xl">
      <div className="space-y-4">
        {/* Printable Action Bar */}
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-600" />
            <div>
              <span className="text-xs font-bold text-slate-900 block">B2B Tax Subscription Invoice</span>
              <span className="text-[11px] text-slate-500">Official business invoice for institutional subscription billing.</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" size="sm" icon={Printer} onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              Print Invoice
            </Button>
          </div>
        </div>

        {/* INVOICE CARD CONTAINER (Print Target) */}
        <div
          ref={invoiceRef}
          id="printable-subscription-invoice"
          className="bg-white p-8 sm:p-10 rounded-2xl border border-slate-200 shadow-xs text-slate-900 font-sans space-y-8 print:border-none print:shadow-none print:p-0 print:m-0 print:w-full"
        >
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <img src="/app-icon.png" alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
                <div>
                  <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{BRAND_CONFIG.productName}</h1>
                  <span className="text-xs font-semibold text-slate-500 block">{BRAND_CONFIG.companyName}</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm">
                Next-Generation SaaS Institutional Operations Platform<br />
                Support: {BRAND_CONFIG.supportEmail} | GSTIN: 18AAACN9012K1Z9
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 font-mono font-extrabold text-xs rounded-lg border border-indigo-100 uppercase tracking-wider">
                BUSINESS INVOICE
              </span>
              <div className="text-xs font-mono font-bold text-slate-900 mt-2">
                Invoice No: <span className="text-indigo-600">{invoiceNo}</span>
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Date of Issue: {formatDate(subscription.createdAt || subscription.startDate || new Date())}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                Payment Status: <span className="font-bold text-emerald-600 uppercase">{subscription.paymentStatus || 'PAID'}</span>
              </div>
            </div>
          </div>

          {/* Customer & Billing Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 p-5 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                Billed To (Institution Client)
              </span>
              <h3 className="text-sm font-bold text-slate-900">{targetSchool.name}</h3>
              <span className="text-slate-500 font-mono text-[11px] block mt-0.5">School Code: {targetSchool.code}</span>
              {targetSchool.email && <p className="text-slate-600 mt-1">Email: {targetSchool.email}</p>}
              {targetSchool.phone && <p className="text-slate-600">Phone: {targetSchool.phone}</p>}
              {targetSchool.address && <p className="text-slate-600 mt-1 leading-relaxed">Address: {targetSchool.address}</p>}
            </div>

            <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-6">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                Subscription & Contract Details
              </span>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Plan Type:</span>
                <span className="font-bold text-slate-900">
                  {subscription.planNameSnapshot || subscription.planName || subscription.plan?.name}
                  {(subscription.isEnterpriseSnapshot || subscription.plan?.isEnterprise) && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                      ENTERPRISE
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Active Student Limit:</span>
                <span className="font-mono font-bold text-indigo-700">
                  {subscription.maxStudentLimitSnapshot || subscription.maxStudentLimit
                    ? `${subscription.maxStudentLimitSnapshot || subscription.maxStudentLimit} Active Students`
                    : 'Unlimited Capacity'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Validity Period:</span>
                <span className="font-mono font-semibold text-slate-900">
                  {formatDate(subscription.startDate)} to {formatDate(subscription.endDate, 'Unlimited')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payment Provider:</span>
                <span className="font-semibold text-slate-900 uppercase">{subscription.paymentProvider || subscription.paymentMethod || 'MANUAL'}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">
              Billing Line Items
            </span>
            <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Description / Plan Tier</th>
                  <th className="p-3 text-center">Billing Cycle</th>
                  <th className="p-3 text-center">Student Capacity</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                <tr>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">
                      {subscription.planNameSnapshot || subscription.planName || subscription.plan?.name}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Institutional Platform License Key & Module Access
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-600">
                    {subscription.durationSnapshot || subscription.duration || 'Standard Term'}
                  </td>
                  <td className="p-3 text-center font-mono font-semibold text-indigo-700">
                    {subscription.maxStudentLimitSnapshot || subscription.maxStudentLimit
                      ? `${subscription.maxStudentLimitSnapshot || subscription.maxStudentLimit} Active`
                      : 'Unlimited'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(basePrice > 0 ? basePrice : finalPrice)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="text-xs text-slate-500 space-y-1 max-w-sm">
              <span className="font-bold text-slate-900 block">Payment Notes & Remarks:</span>
              <p className="italic text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {subscription.remarks || 'Standard SaaS subscription fee payment. All core operational modules unlocked.'}
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-2 text-xs border-t sm:border-t-0 pt-3 sm:pt-0">
              <div className="flex items-center justify-between text-slate-600">
                <span>Base Subscription Fee:</span>
                <span className="font-mono">{formatCurrency(basePrice > 0 ? basePrice : finalPrice)}</span>
              </div>

              {discount > 0 && (
                <div className="flex items-center justify-between text-emerald-600">
                  <span>Applied Discount:</span>
                  <span className="font-mono">- {formatCurrency(discount)}</span>
                </div>
              )}

              <div className="flex items-center justify-between text-slate-600">
                <span>Taxes & GST (0%):</span>
                <span className="font-mono">₹0</span>
              </div>

              <div className="flex items-center justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2">
                <span>Total Paid Amount:</span>
                <span className="font-mono text-indigo-600 text-base">{formatCurrency(finalPrice)}</span>
              </div>
            </div>
          </div>

          {/* INCLUDED PLAN FEATURES LIST */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Award className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Active Included Plan Features & Modules
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {planFeatures.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-700">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span className="font-medium">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stamp & Authorized Signature Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-6 border-t border-slate-200 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Official Subscription Receipt</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                This is a computer-generated tax invoice issued by AxomSetu Platform.<br />
                No physical signature is required. Verified for institutional accounting.
              </p>
            </div>

            <div className="text-center sm:text-right space-y-2">
              <div className="w-40 border-b border-slate-300 ml-auto pb-1">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">AxomSetu Super Admin</span>
              </div>
              <span className="text-xs font-bold text-slate-800 block">Authorized Signatory</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
