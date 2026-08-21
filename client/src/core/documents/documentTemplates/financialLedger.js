import { createPDFHeader } from '../common/header.js';
import { formatDocDate } from '../common/formatters.js';

/**
 * Financial Ledger Data Builder
 */
export const buildFinancialLedgerData = (rawData = {}) => {
  const school = rawData.schoolHeader || rawData.school || {};
  const transactions = rawData.transactions || rawData.data || [];
  const overview = rawData.overview || {};

  return {
    school: {
      name: school.name || 'School Workspace',
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
      district: school.district || '',
      state: school.state || '',
      pincode: school.pincode || '',
      udiseCode: school.udiseCode || '',
      affiliationNo: school.affiliationNo || '',
      website: school.website || '',
      logoUrl: school.logoUrl || null,
      logoBase64: school.logoBase64 || null,
    },
    reportDate: formatDocDate(new Date()),
    totalCredit: Number(overview.totalCredit || rawData.totalCredit || 0),
    totalDebit: Number(overview.totalDebit || rawData.totalDebit || 0),
    currentBalance: Number(overview.currentBalance || rawData.currentBalance || 0),
    transactions: transactions.map((t) => ({
      date: formatDocDate(t.transactionDate),
      description: t.description || t.sourceType || 'Transaction',
      sourceType: t.sourceType ? t.sourceType.replace(/_/g, ' ') : 'N/A',
      type: t.type || 'CREDIT',
      paymentMode: t.paymentMode || 'CASH',
      referenceNumber: t.referenceNumber || '-',
      amount: Number(t.amount || 0),
      isReversal: Boolean(t.isReversal),
    })),
  };
};

/**
 * pdfMake Template Builder for Financial Ledger Statement
 */
export const buildFinancialLedgerTemplate = (data, _settings = {}) => {
  const formatCurrency = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const headerStack = createPDFHeader({
    school: data.school,
    documentTitle: 'FINANCIAL LEDGER STATEMENT',
  });

  const content = [...headerStack];

  // 2. Financial Summary Cards Grid
  content.push({
    table: {
      widths: ['33.33%', '33.33%', '33.34%'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
            margin: [6, 6, 6, 6],
            stack: [
              { text: 'TOTAL CREDIT INFLOW', fontSize: 8.5, bold: true, color: '#059669' },
              { text: formatCurrency(data.totalCredit), fontSize: 13, bold: true, color: '#059669', margin: [0, 2, 0, 0] },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
            margin: [6, 6, 6, 6],
            stack: [
              { text: 'TOTAL DEBIT OUTFLOW', fontSize: 8.5, bold: true, color: '#dc2626' },
              { text: formatCurrency(data.totalDebit), fontSize: 13, bold: true, color: '#dc2626', margin: [0, 2, 0, 0] },
            ],
          },
          {
            fillColor: '#f1f5f9',
            borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
            margin: [6, 6, 6, 6],
            stack: [
              { text: 'CURRENT NET BALANCE', fontSize: 8.5, bold: true, color: '#4f46e5' },
              { text: formatCurrency(data.currentBalance), fontSize: 13, bold: true, color: '#4f46e5', margin: [0, 2, 0, 0] },
            ],
          },
        ],
      ],
    },
    margin: [0, 0, 0, 15],
  });

  // 3. Transactions Table
  const tableRows = [
    [
      { text: 'Date', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Description', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Source', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Type', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Mode', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Amount (₹)', alignment: 'right', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
    ],
  ];

  data.transactions.forEach((t) => {
    tableRows.push([
      { text: t.date, fontSize: 9, color: '#334155' },
      { text: t.description, fontSize: 9, color: '#0f172a' },
      { text: t.sourceType, fontSize: 9, color: '#475569' },
      { text: t.isReversal ? `${t.type} (REV)` : t.type, fontSize: 9, bold: true, color: t.type === 'CREDIT' ? '#059669' : '#dc2626' },
      { text: t.paymentMode, fontSize: 9, color: '#475569' },
      { text: `${t.type === 'CREDIT' ? '+' : '-'}${formatCurrency(t.amount)}`, fontSize: 9, alignment: 'right', bold: true, color: t.type === 'CREDIT' ? '#059669' : '#dc2626' },
    ]);
  });

  content.push({
    table: {
      headerRows: 1,
      widths: ['12%', '33%', '18%', '12%', '12%', '13%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 20],
  });

  return {
    content,
  };
};
