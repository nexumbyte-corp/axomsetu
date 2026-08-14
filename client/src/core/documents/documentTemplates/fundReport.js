import { createPDFHeader } from '../common/header.js';

/**
 * Fund Report Data Builder
 */
export const buildFundReportData = (rawData = {}) => {
  const school = rawData.schoolHeader || rawData.school || {};
  const funds = rawData.funds || rawData.data || [];

  const totalAmount = funds.reduce(
    (sum, f) => (f.status !== 'CANCELLED' ? sum + Number(f.amount || 0) : sum),
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
    reportDate: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    totalAmount,
    totalCount: funds.length,
    funds: funds.map((f) => ({
      source: f.fundSource?.name || 'General Fund',
      date: f.transactionDate
        ? new Date(f.transactionDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'N/A',
      remarks: f.remarks || '-',
      paymentMode: f.paymentMode || 'BANK_TRANSFER',
      referenceNumber: f.referenceNumber || '-',
      amount: Number(f.amount || 0),
      status: f.status || 'ACTIVE',
    })),
  };
};

/**
 * pdfMake Template Builder for School Fund Report
 */
export const buildFundReportTemplate = (data, settings = {}) => {
  const formatCurrency = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const headerStack = createPDFHeader({
    school: data.school,
    documentTitle: 'CAPITAL FUND ADDITION REPORT',
  });

  const content = [...headerStack];

  // Funds Table
  const tableRows = [
    [
      { text: 'Fund Source', bold: true, fillColor: '#f1f5f9', fontSize: 8, color: '#1e293b' },
      { text: 'Date', bold: true, fillColor: '#f1f5f9', fontSize: 8, color: '#1e293b' },
      { text: 'Remarks / Purpose', bold: true, fillColor: '#f1f5f9', fontSize: 8, color: '#1e293b' },
      { text: 'Mode', bold: true, fillColor: '#f1f5f9', fontSize: 8, color: '#1e293b' },
      { text: 'Ref #', bold: true, fillColor: '#f1f5f9', fontSize: 8, color: '#1e293b' },
      { text: 'Amount (₹)', alignment: 'right', bold: true, fillColor: '#f1f5f9', fontSize: 8, color: '#1e293b' },
    ],
  ];

  data.funds.forEach((f) => {
    tableRows.push([
      { text: f.source, fontSize: 8, bold: true, color: '#0f172a' },
      { text: f.date, fontSize: 8, color: '#334155' },
      { text: f.status === 'CANCELLED' ? `${f.remarks} (CANCELLED)` : f.remarks, fontSize: 8, color: f.status === 'CANCELLED' ? '#94a3b8' : '#334155' },
      { text: f.paymentMode, fontSize: 8, color: '#475569' },
      { text: f.referenceNumber, fontSize: 8, color: '#475569' },
      { text: `+${formatCurrency(f.amount)}`, fontSize: 8, alignment: 'right', bold: true, color: f.status === 'CANCELLED' ? '#94a3b8' : '#059669' },
    ]);
  });

  // Summary Row
  tableRows.push([
    { text: 'TOTAL FUND INFUSION', colSpan: 5, fontSize: 9, bold: true, color: '#0f172a', fillColor: '#f8fafc' },
    {}, {}, {}, {},
    { text: formatCurrency(data.totalAmount), fontSize: 10, bold: true, alignment: 'right', color: '#047857', fillColor: '#f8fafc' },
  ]);

  content.push({
    table: {
      headerRows: 1,
      widths: ['22%', '12%', '34%', '11%', '10%', '11%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 20],
  });

  return { content };
};
