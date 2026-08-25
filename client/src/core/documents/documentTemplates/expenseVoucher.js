import { createPDFHeader } from '../common/header.js';
import { createPDFSignatureBlock } from '../common/signature.js';
import { formatDocCurrency, formatDocDate, sanitizeDocText, getSchoolBranding } from '../common/formatters.js';
import { amountToWords } from '../../../utils/numberToWords.js';

/**
 * Expense Voucher Data Builder
 */
export const buildExpenseVoucherData = (rawData = {}) => {
  const expense = rawData.expense || rawData.data || rawData;
  const school = getSchoolBranding(expense.schoolHeader || rawData.schoolHeader || expense.school || rawData.school);
  const amount = Number(expense.amount || 0);

  return {
    voucherNo: sanitizeDocText(expense.expenseNo || expense.id, 'EXP-VOUCHER'),
    expenseDate: formatDocDate(expense.expenseDate || expense.createdAt),
    category: sanitizeDocText(expense.category?.name || expense.category, 'Uncategorized'),
    description: sanitizeDocText(expense.description || expense.title, 'General Expense'),
    paymentMode: sanitizeDocText(expense.paymentMode || expense.paymentMethod, 'CASH'),
    referenceNo: sanitizeDocText(expense.referenceNo || expense.refNo, 'N/A'),
    approvedBy: sanitizeDocText(expense.createdBy?.name || expense.approvedBy || expense.creatorName, 'Authorized Signatory'),
    remarks: sanitizeDocText(expense.remarks, ''),
    status: expense.status || 'ACTIVE',
    amount,
    amountFormatted: formatDocCurrency(amount),
    amountInWords: amountToWords(amount),
    school,
  };
};

/**
 * pdfMake Template Builder for Single Expense Voucher
 */
export const buildExpenseVoucherTemplate = (data = {}, settings = {}) => {
  const isCancelled = data.status === 'CANCELLED' || data.status === 'VOID';

  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: 'EXPENSE VOUCHER',
    documentNumber: data.voucherNo,
    status: data.status,
  });

  const content = [...headerContent];

  const boxTableLayout = {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => '#475569',
    vLineColor: () => '#475569',
  };

  // Expense Particulars Box Grid
  content.push({
    table: {
      widths: ['50%', '50%'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#475569', '#475569', '#475569', '#475569'],
            margin: [8, 8, 8, 8],
            stack: [
              { text: 'EXPENSE METADATA', fontSize: 9, bold: true, color: '#475569', margin: [0, 0, 0, 4] },
              { text: `Voucher No: ${data.voucherNo}`, fontSize: 10, bold: true, color: '#0f172a' },
              { text: `Category: ${data.category}`, fontSize: 9, bold: true, color: '#4f46e5' },
              { text: `Expense Date: ${data.expenseDate}`, fontSize: 9, color: '#334155' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#475569', '#475569', '#475569', '#475569'],
            margin: [8, 8, 8, 8],
            stack: [
              { text: 'PAYMENT DISBURSEMENT INFO', fontSize: 9, bold: true, color: '#475569', margin: [0, 0, 0, 4] },
              { text: `Payment Mode: ${data.paymentMode}`, fontSize: 9, bold: true, color: '#334155' },
              { text: `Ref / Cheque No: ${data.referenceNo}`, fontSize: 9, color: '#334155' },
              { text: `Approved By: ${data.approvedBy}`, fontSize: 9, color: '#334155' },
            ],
          },
        ],
      ],
    },
    layout: boxTableLayout,
    margin: [0, 0, 0, 12],
  });

  // Description & Details Table
  content.push({
    table: {
      headerRows: 1,
      widths: ['*', '130'],
      body: [
        [
          { text: 'Particulars / Description', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
          { text: 'Amount (₹)', fontSize: 9, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
        ],
        [
          {
            stack: [
              { text: data.description, fontSize: 9.5, bold: true, color: '#0f172a' },
              data.remarks ? { text: `Note: ${data.remarks}`, fontSize: 8, color: '#64748b', margin: [0, 2, 0, 0] } : {},
            ].filter(Boolean),
            margin: [0, 4, 0, 4],
          },
          { text: data.amountFormatted, fontSize: 10, bold: true, alignment: 'right', color: '#b91c1c', margin: [0, 4, 0, 4] },
        ],
      ],
    },
    layout: boxTableLayout,
    margin: [0, 0, 0, 12],
  });

  // Amount in Words & Total Box
  content.push({
    table: {
      widths: ['*', '170'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#475569', '#475569', '#475569', '#475569'],
            margin: [8, 6, 8, 6],
            stack: [
              { text: 'AMOUNT IN WORDS', fontSize: 9, bold: true, color: '#64748b' },
              { text: data.amountInWords, fontSize: 10, bold: true, italics: true, color: '#0f172a' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#475569', '#475569', '#475569', '#475569'],
            margin: [8, 6, 8, 6],
            alignment: 'right',
            stack: [
              { text: 'TOTAL VOUCHER AMOUNT', fontSize: 9, bold: true, color: '#475569', alignment: 'right' },
              { text: data.amountFormatted, fontSize: 14, bold: true, color: '#b91c1c', alignment: 'right' },
            ],
          },
        ],
      ],
    },
    layout: boxTableLayout,
    margin: [0, 0, 0, 20],
  });

  // Signatures
  content.push(createPDFSignatureBlock(settings));

  return {
    content,
    watermark: isCancelled
      ? { text: 'CANCELLED', color: '#dc2626', opacity: 0.15, bold: true, angle: -30 }
      : null,
  };
};

export default {
  buildExpenseVoucherData,
  buildExpenseVoucherTemplate,
};
