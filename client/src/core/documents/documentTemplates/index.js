import { buildReceiptData } from './receipt/receiptBuilder.js';
import { buildReceiptTemplate } from './receipt/receiptTemplate.js';
import { buildSalaryReceiptData, buildSalaryReceiptTemplate } from './salaryReceipt.js';
import { buildSalarySlipData, buildSalarySlipTemplate } from './salarySlip.js';
import { buildFinancialLedgerData, buildFinancialLedgerTemplate } from './financialLedger.js';
import { buildExpenseReportData, buildExpenseReportTemplate } from './expenseReport.js';
import { buildFundReportData, buildFundReportTemplate } from './fundReport.js';

import { buildGenericReportData, buildGenericReportTemplate } from './reportTemplates.js';

/**
 * Universal Document Template Registry.
 * Registers document templates and data builders dynamically.
 * Future documents (Ledger, Collection Report, Salary Slip, etc.) are registered here without changing the engine.
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
    name: 'Salary Receipt Voucher',
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
};


/**
 * Retrieves a registered template object by template ID.
 */
export const getDocumentTemplate = (templateId = 'receipt') => {
  const target = TEMPLATE_REGISTRY[templateId];
  if (!target) {
    throw new Error(`Document template '${templateId}' is not registered in Universal Template Registry.`);
  }
  return target;
};

/**
 * Register a new document template at runtime.
 */
export const registerDocumentTemplate = (templateId, templateConfig) => {
  if (!templateConfig.template || !templateConfig.builder) {
    throw new Error(`Cannot register template '${templateId}': missing required 'template' or 'builder' function.`);
  }
  TEMPLATE_REGISTRY[templateId] = templateConfig;
};

export default TEMPLATE_REGISTRY;
