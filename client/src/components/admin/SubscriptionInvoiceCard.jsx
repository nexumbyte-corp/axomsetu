import React from 'react';
import { Badge } from '../ui/Badge.jsx';
import { formatDate } from '../../utils/formatters.js';
import { BRAND_CONFIG } from '../../config/brandConfig.js';
import { Check, ShieldCheck, Award } from 'lucide-react';

export const SubscriptionInvoiceCard = ({ subscription, school }) => {
  if (!subscription) return null;

  const targetSchool = school || subscription.school || {
    name: subscription.schoolName || 'Partner School',
    code: subscription.schoolCode || '-',
    email: subscription.schoolEmail || subscription.email || '-',
    phone: subscription.phone || '-',
    address: subscription.address || '-',
  };

  const invoiceNo = `INV-SUB-${new Date(subscription.createdAt || subscription.startDate || Date.now()).getFullYear()}-${String(subscription.id || '').slice(-6).toUpperCase()}`;
  
  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);

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
    <div
      id="printable-subscription-invoice"
      className="bg-white rounded-2xl border border-slate-300 shadow-sm p-6 sm:p-10 max-w-4xl mx-auto space-y-6 relative overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none"
    >
      {/* Top Banner Status Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Invoice No:</span>
          <span className="font-mono font-black text-indigo-700 text-xs">{invoiceNo}</span>
          <Badge variant={subscription.status === 'EXPIRED' ? 'danger' : 'success'} size="sm">
            {subscription.status || 'ACTIVE'}
          </Badge>
        </div>
        <span className="font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md text-[10px] uppercase border border-slate-200">
          OFFICIAL B2B INVOICE
        </span>
      </div>

      {/* Header Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <img src="/app-icon.png" alt="Logo" className="w-11 h-11 rounded-xl object-cover shadow-2xs" />
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{BRAND_CONFIG.productName}</h1>
              <span className="text-xs font-bold text-slate-500 block">{BRAND_CONFIG.companyName}</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm">
            Next-Generation SaaS Institutional Operations Platform<br />
            Support: {BRAND_CONFIG.supportEmail} | GSTIN: 18AAACN9012K1Z9
          </p>
        </div>

        <div className="text-left sm:text-right space-y-1 text-xs">
          <div className="font-mono font-bold text-slate-900">
            Issue Date: <span className="text-slate-700">{formatDate(subscription.createdAt || subscription.startDate || new Date())}</span>
          </div>
          <div className="font-mono text-slate-500">
            Payment Status: <span className="font-bold text-emerald-600 uppercase">{subscription.paymentStatus || 'PAID'}</span>
          </div>
          <div className="font-mono text-slate-500">
            Payment Provider: <span className="font-semibold text-slate-800 uppercase">{subscription.paymentProvider || subscription.paymentMethod || 'MANUAL'}</span>
          </div>
        </div>
      </div>

      {/* Client & Contract Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
          <h4 className="font-bold text-slate-900 uppercase text-[9px] tracking-wider text-indigo-600 border-b border-slate-200 pb-1">
            Billed To (Institution Client)
          </h4>
          <div className="space-y-1 text-slate-700">
            <h3 className="text-sm font-bold text-slate-900">{targetSchool.name}</h3>
            <p className="font-mono text-[11px] text-slate-500">School Code: {targetSchool.code}</p>
            {targetSchool.email && <p className="text-[11px]">Email: {targetSchool.email}</p>}
            {targetSchool.phone && <p className="text-[11px]">Phone: {targetSchool.phone}</p>}
            {targetSchool.address && <p className="text-[11px] text-slate-600 leading-relaxed">Address: {targetSchool.address}</p>}
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-1.5">
          <h4 className="font-bold text-slate-900 uppercase text-[9px] tracking-wider text-indigo-600 border-b border-slate-200 pb-1">
            Subscription Contract Terms
          </h4>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Plan Tier:</span>
              <span className="font-bold text-slate-900">
                {subscription.planNameSnapshot || subscription.planName || subscription.plan?.name}
                {(subscription.isEnterpriseSnapshot || subscription.plan?.isEnterprise) && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                    ENTERPRISE
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Student Capacity Limit:</span>
              <span className="font-mono font-bold text-indigo-700">
                {subscription.maxStudentLimitSnapshot || subscription.maxStudentLimit
                  ? `${subscription.maxStudentLimitSnapshot || subscription.maxStudentLimit} Active Students`
                  : 'Unlimited Capacity'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Validity Period:</span>
              <span className="font-mono font-semibold text-slate-900">
                {formatDate(subscription.startDate)} to {formatDate(subscription.endDate, 'Unlimited')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="space-y-2">
        <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Billing Line Items</h4>
        <div className="border border-slate-200 rounded-xl overflow-x-auto table-responsive-wrapper">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Description / Plan Tier</th>
                <th className="py-2.5 px-3 text-center">Billing Cycle</th>
                <th className="py-2.5 px-3 text-center">Student Capacity</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              <tr>
                <td className="py-3 px-3">
                  <span className="font-bold text-slate-900 block">
                    {subscription.planNameSnapshot || subscription.planName || subscription.plan?.name}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Institutional SaaS Operations Platform Access & License Key
                  </span>
                </td>
                <td className="py-3 px-3 text-center text-slate-600 font-medium">
                  {subscription.durationSnapshot || subscription.duration || 'Standard Term'}
                </td>
                <td className="py-3 px-3 text-center font-mono font-semibold text-indigo-700">
                  {subscription.maxStudentLimitSnapshot || subscription.maxStudentLimit
                    ? `${subscription.maxStudentLimitSnapshot || subscription.maxStudentLimit} Active`
                    : 'Unlimited'}
                </td>
                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                  {formatCurrency(basePrice > 0 ? basePrice : finalPrice)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount Calculation Summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="space-y-1 text-xs max-w-sm">
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">Remarks & Notes</span>
            <p className="italic text-slate-600 text-[11px]">
              "{subscription.remarks || 'Standard SaaS subscription fee payment. All core operational modules unlocked.'}"
            </p>
          </div>

          <div className="w-full sm:w-64 space-y-2 text-xs border-t sm:border-t-0 pt-2 sm:pt-0">
            <div className="flex justify-between text-slate-600">
              <span>Base Subscription Fee:</span>
              <span className="font-mono">{formatCurrency(basePrice > 0 ? basePrice : finalPrice)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Applied Discount:</span>
                <span className="font-mono">- {formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxes & GST (0%):</span>
              <span className="font-mono">₹0</span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-slate-900 border-t border-slate-200 pt-2">
              <span>Total Paid Amount:</span>
              <span className="font-mono text-indigo-600 text-base">{formatCurrency(finalPrice)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* INCLUDED PLAN FEATURES GRID */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Award className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Active Included Plan Features & Operational Modules
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

      {/* Official Signatory & Seal Section */}
      <div className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs font-semibold text-slate-700 border-t border-slate-200">
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

        <div className="text-right space-y-2">
          <div className="w-40 border-b border-slate-300 ml-auto pb-1">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">AxomSetu Super Admin</span>
          </div>
          <span className="text-xs font-bold text-slate-800 block">Authorized Signatory</span>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionInvoiceCard;
