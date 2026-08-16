import { createPDFHeader } from '../common/header.js';
import { createPDFSignatureBlock } from '../common/signature.js';
import { formatDocCurrency, formatDocDate, sanitizeDocText, getSchoolBranding } from '../common/formatters.js';

/**
 * Staff Advance Document Data Builder
 */
export const buildStaffAdvanceData = (rawData = {}) => {
  const staff = rawData.staff || rawData.data?.staff || {};
  const school = getSchoolBranding(rawData.schoolHeader || rawData.school || staff.school);
  const advances = rawData.advances || rawData.data?.advances || rawData.data || [];
  const summary = rawData.summary || rawData.data?.summary || {};

  const totalAdvanceGiven = Number(summary.totalAdvanceGiven || summary.totalGiven || 0);
  const totalRecovered = Number(summary.totalRecovered || summary.recovered || 0);
  const pendingRecovery = Number(summary.pendingRecovery || summary.outstanding || Math.max(0, totalAdvanceGiven - totalRecovered));

  const items = (Array.isArray(advances) ? advances : []).map((a) => ({
    date: formatDocDate(a.date || a.createdAt || a.disbursedAt),
    type: sanitizeDocText(a.type, 'ADVANCE_GIVEN'),
    description: sanitizeDocText(a.description || a.remarks || a.reason, 'Staff Advance'),
    amount: Number(a.amount || 0),
    recoveredAmount: Number(a.recoveredAmount || a.recovered || 0),
    pendingAmount: Number(a.pendingAmount || a.balance || 0),
    status: sanitizeDocText(a.status, 'PENDING'),
  }));

  return {
    school,
    staffName: sanitizeDocText(staff.name, 'Staff Member'),
    employeeId: sanitizeDocText(staff.employeeId, 'N/A'),
    department: sanitizeDocText(staff.department, 'N/A'),
    designation: sanitizeDocText(staff.designation, 'N/A'),
    totalAdvanceGiven,
    totalRecovered,
    pendingRecovery,
    totalAdvanceGivenFormatted: formatDocCurrency(totalAdvanceGiven),
    totalRecoveredFormatted: formatDocCurrency(totalRecovered),
    pendingRecoveryFormatted: formatDocCurrency(pendingRecovery),
    items,
  };
};

/**
 * pdfMake Template Builder for Staff Advance Document
 */
export const buildStaffAdvanceTemplate = (data = {}, settings = {}) => {
  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: 'STAFF ADVANCE STATEMENT',
  });

  const content = [...headerContent];

  // Staff Info Grid Box
  content.push({
    table: {
      widths: ['50%', '50%'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [8, 6, 8, 6],
            stack: [
              { text: 'EMPLOYEE DETAILS', fontSize: 8.5, bold: true, color: '#475569', margin: [0, 0, 0, 3] },
              { text: data.staffName, fontSize: 10.5, bold: true, color: '#0f172a' },
              { text: `Employee Code: ${data.employeeId}`, fontSize: 8.5, color: '#334155' },
              { text: `Designation: ${data.designation} (${data.department})`, fontSize: 8.5, color: '#334155' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [8, 6, 8, 6],
            stack: [
              { text: 'ADVANCE ACCOUNT SUMMARY', fontSize: 8.5, bold: true, color: '#475569', margin: [0, 0, 0, 3] },
              { text: `Total Advance Issued: ${data.totalAdvanceGivenFormatted}`, fontSize: 8.5, color: '#0f172a' },
              { text: `Total Recovered to Date: ${data.totalRecoveredFormatted}`, fontSize: 8.5, color: '#15803d' },
              { text: `Outstanding Balance: ${data.pendingRecoveryFormatted}`, fontSize: 9.5, bold: true, color: data.pendingRecovery > 0 ? '#b91c1c' : '#15803d' },
            ],
          },
        ],
      ],
    },
    margin: [0, 0, 0, 12],
  });

  // Table Rows
  const tableRows = [
    [
      { text: 'Date', fontSize: 8, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Type / Purpose', fontSize: 8, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Issued (₹)', fontSize: 8, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Recovered (₹)', fontSize: 8, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Balance (₹)', fontSize: 8, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Status', fontSize: 8, bold: true, alignment: 'center', fillColor: '#f1f5f9', color: '#0f172a' },
    ],
  ];

  if (data.items.length === 0) {
    tableRows.push([
      { text: 'No advance transactions recorded.', colSpan: 6, alignment: 'center', fontSize: 8, color: '#64748b' },
      {}, {}, {}, {}, {},
    ]);
  } else {
    data.items.forEach((item) => {
      tableRows.push([
        { text: item.date, fontSize: 8, color: '#334155' },
        { text: `${item.type.replace(/_/g, ' ')}: ${item.description}`, fontSize: 8, bold: true, color: '#0f172a' },
        { text: formatDocCurrency(item.amount), fontSize: 8, alignment: 'right', color: '#b91c1c' },
        { text: formatDocCurrency(item.recoveredAmount), fontSize: 8, alignment: 'right', color: '#15803d' },
        { text: formatDocCurrency(item.pendingAmount), fontSize: 8, alignment: 'right', bold: true, color: item.pendingAmount > 0 ? '#b91c1c' : '#15803d' },
        { text: item.status, fontSize: 7.5, alignment: 'center', bold: true, color: item.status === 'SETTLED' ? '#15803d' : '#b45309' },
      ]);
    });
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['14%', '36%', '13%', '13%', '14%', '10%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 15],
  });

  // Signatures Block
  content.push(createPDFSignatureBlock(settings));

  return { content };
};

export default {
  buildStaffAdvanceData,
  buildStaffAdvanceTemplate,
};
