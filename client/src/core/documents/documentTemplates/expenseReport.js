import { createPDFHeader } from '../common/header.js';
import { formatDocDate } from '../common/formatters.js';

/**
 * Expense Report Data Builder
 */
export const buildExpenseReportData = (rawData = {}) => {
  const school = rawData.schoolHeader || rawData.school || {};
  const expenses = rawData.expenses || rawData.data || [];

  const totalAmount = expenses.reduce(
    (sum, e) => (e.status !== 'CANCELLED' ? sum + Number(e.amount || 0) : sum),
    0
  );

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
    totalAmount,
    totalCount: expenses.length,
    expenses: expenses.map((e) => ({
      category: e.category?.name || 'Uncategorized',
      date: formatDocDate(e.expenseDate),
      description: e.description || '-',
      paymentMode: e.paymentMode || 'CASH',
      referenceNo: e.referenceNo || '-',
      amount: Number(e.amount || 0),
      status: e.status || 'ACTIVE',
    })),
  };
};

/**
 * pdfMake Template Builder for School Expense Report
 */
export const buildExpenseReportTemplate = (data, _settings = {}) => {
  const formatCurrency = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const headerStack = createPDFHeader({
    school: data.school,
    documentTitle: 'SCHOOL EXPENDITURE REPORT',
  });

  const content = [...headerStack];

  // Expenses Table
  const tableRows = [
    [
      { text: 'Category', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Date', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Description / Purpose', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Mode', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Ref #', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Amount (₹)', alignment: 'right', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
    ],
  ];

  data.expenses.forEach((e) => {
    tableRows.push([
      { text: e.category, fontSize: 9, bold: true, color: '#0f172a' },
      { text: e.date, fontSize: 9, color: '#334155' },
      { text: e.status === 'CANCELLED' ? `${e.description} (CANCELLED)` : e.description, fontSize: 9, color: e.status === 'CANCELLED' ? '#94a3b8' : '#334155' },
      { text: e.paymentMode, fontSize: 9, color: '#475569' },
      { text: e.referenceNo, fontSize: 9, color: '#475569' },
      { text: formatCurrency(e.amount), fontSize: 9, alignment: 'right', bold: true, color: e.status === 'CANCELLED' ? '#94a3b8' : '#dc2626' },
    ]);
  });

  // Summary Row
  tableRows.push([
    { text: 'TOTAL EXPENDITURE', colSpan: 5, fontSize: 10, bold: true, color: '#0f172a', fillColor: '#f8fafc' },
    {}, {}, {}, {},
    { text: formatCurrency(data.totalAmount), fontSize: 12, bold: true, alignment: 'right', color: '#b91c1c', fillColor: '#f8fafc' },
  ]);

  content.push({
    table: {
      headerRows: 1,
      widths: ['20%', '12%', '36%', '11%', '10%', '11%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 20],
  });

  return { content };
};
