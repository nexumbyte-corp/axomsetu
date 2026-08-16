import { buildReceiptData } from './receipt/receiptBuilder.js';
import { buildReceiptTemplate } from './receipt/receiptTemplate.js';
import { buildSalaryReceiptData, buildSalaryReceiptTemplate } from './salaryReceipt.js';
import { buildSalarySlipData, buildSalarySlipTemplate } from './salarySlip.js';
import { buildFinancialLedgerData, buildFinancialLedgerTemplate } from './financialLedger.js';
import { buildExpenseReportData, buildExpenseReportTemplate } from './expenseReport.js';
import { buildExpenseVoucherData, buildExpenseVoucherTemplate } from './expenseVoucher.js';
import { buildStaffAdvanceData, buildStaffAdvanceTemplate } from './staffAdvance.js';
import { buildFeeReportData, buildFeeReportTemplate } from './feeReport.js';
import { buildPayrollReportData, buildPayrollReportTemplate } from './payrollReport.js';
import { buildHostelReportData, buildHostelReportTemplate } from './hostelReport.js';
import { buildStudentReportData, buildStudentReportTemplate } from './studentReport.js';
import { buildFundReportData, buildFundReportTemplate } from './fundReport.js';
import { buildGenericReportData, buildGenericReportTemplate } from './reportTemplates.js';

/**
 * Universal Document Template Registry.
 * Central registry for all frontend document components & PDF layout generators.
 */
const TEMPLATE_REGISTRY = {
  genericReport: {
    name: 'Standard Tabular Report',
    builder: buildGenericReportData,
    template: buildGenericReportTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  receipt: {
    name: 'Fee Receipt',
    builder: buildReceiptData,
    template: buildReceiptTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
      copyLabel: 'Original Student Copy',
    },
  },
  salary: {
    name: 'Salary Disbursement Voucher',
    builder: buildSalaryReceiptData,
    template: buildSalaryReceiptTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  salaryReceipt: {
    name: 'Salary Disbursement Voucher',
    builder: buildSalaryReceiptData,
    template: buildSalaryReceiptTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  salarySlip: {
    name: 'Employee Salary Slip',
    builder: buildSalarySlipData,
    template: buildSalarySlipTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  expenseVoucher: {
    name: 'Expense Disbursement Voucher',
    builder: buildExpenseVoucherData,
    template: buildExpenseVoucherTemplate,
    defaultOptions: {
      pageSize: 'A5',
      pageOrientation: 'portrait',
      pageMargins: [25, 20, 25, 25],
    },
  },
  expenseReport: {
    name: 'School Expense Report',
    builder: buildExpenseReportData,
    template: buildExpenseReportTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  staffAdvance: {
    name: 'Staff Advance Statement',
    builder: buildStaffAdvanceData,
    template: buildStaffAdvanceTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  feeReport: {
    name: 'Fee Collection & Dues Report',
    builder: buildFeeReportData,
    template: buildFeeReportTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  payrollReport: {
    name: 'Monthly Payroll Statement',
    builder: buildPayrollReportData,
    template: buildPayrollReportTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  financialLedger: {
    name: 'Financial Ledger Statement',
    builder: buildFinancialLedgerData,
    template: buildFinancialLedgerTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  hostelReport: {
    name: 'Hostel Residents & Fee Statement',
    builder: buildHostelReportData,
    template: buildHostelReportTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  studentReport: {
    name: 'Student Directory & Status Report',
    builder: buildStudentReportData,
    template: buildStudentReportTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
  fundReport: {
    name: 'School Fund Addition Report',
    builder: buildFundReportData,
    template: buildFundReportTemplate,
    defaultOptions: {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [30, 25, 30, 30],
    },
  },
};

/**
 * Retrieves a registered template object by template ID.
 */
export const getDocumentTemplate = (templateId = 'receipt') => {
  const target = TEMPLATE_REGISTRY[templateId];
  if (!target) {
    // Graceful fallback to genericReport if exact template ID is missing
    console.warn(`Document template '${templateId}' not explicitly found. Falling back to genericReport.`);
    return TEMPLATE_REGISTRY.genericReport;
  }
  return target;
};

export default TEMPLATE_REGISTRY;
