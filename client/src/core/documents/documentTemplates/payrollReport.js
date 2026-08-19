import { createPDFHeader } from '../common/header.js';
import { formatDocCurrency, sanitizeDocText, getSchoolBranding } from '../common/formatters.js';

/**
 * Payroll Report Data Builder
 */
export const buildPayrollReportData = (rawData = {}) => {
  const school = getSchoolBranding(rawData.schoolHeader || rawData.school);
  const rows = rawData.data || rawData.items || rawData.payrolls || rawData.reportData || [];
  const summary = rawData.summary || {};

  let totalNetSalary = Number(summary.totalNetSalary || summary.totalNetPayable || 0);
  let totalPaid = Number(summary.totalPaid || summary.totalDisbursed || 0);
  let totalPending = Number(summary.totalPending || summary.totalUnpaid || 0);

  if (!totalNetSalary && !totalPaid && rows.length > 0) {
    rows.forEach((r) => {
      const net = Number(r.netSalary || r.salaryDue || 0);
      const paid = Number(r.paidAmount || r.disbursedAmount || 0);
      totalNetSalary += net;
      totalPaid += paid;
      totalPending += Math.max(0, net - paid);
    });
  }

  const items = rows.map((r) => {
    const netSalary = Number(r.netSalary || r.salaryDue || 0);
    const paidAmount = Number(r.paidAmount || r.disbursedAmount || 0);
    const pendingAmount = Number(r.pendingAmount || r.remainingUnpaid || Math.max(0, netSalary - paidAmount));

    return {
      staffName: sanitizeDocText(r.staffName || r.staff?.name || r.name, 'Employee'),
      employeeId: sanitizeDocText(r.employeeId || r.staff?.employeeId, 'N/A'),
      department: sanitizeDocText(r.department || r.staff?.department, 'General'),
      designation: sanitizeDocText(r.designation || r.staff?.designation, 'Staff'),
      month: sanitizeDocText(r.month || r.salaryMonth, '—'),
      baseSalary: Number(r.baseSalary || 0),
      allowances: Number(r.allowances || 0),
      deductions: Number(r.deductions || r.advanceDeducted || 0),
      netSalary,
      paidAmount,
      pendingAmount,
      status: sanitizeDocText(r.status, pendingAmount <= 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID')),
    };
  });

  return {
    school,
    reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'MONTHLY PAYROLL STATEMENT'),
    period: sanitizeDocText(rawData.period || rawData.filtersApplied?.month, 'All Months'),
    totalNetSalary,
    totalPaid,
    totalPending,
    totalNetSalaryFormatted: formatDocCurrency(totalNetSalary),
    totalPaidFormatted: formatDocCurrency(totalPaid),
    totalPendingFormatted: formatDocCurrency(totalPending),
    items,
  };
};

/**
 * pdfMake Template Builder for Payroll Report
 */
export const buildPayrollReportTemplate = (data = {}, _settings = {}) => {
  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: data.reportTitle,
    academicYear: data.period,
  });

  const content = [...headerContent];

  // Summary Header Grid
  content.push({
    table: {
      widths: ['33%', '33%', '34%'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'TOTAL NET PAYABLE', fontSize: 8.5, bold: true, color: '#475569' },
              { text: data.totalNetSalaryFormatted, fontSize: 13, bold: true, color: '#0f172a' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'TOTAL DISBURSED / PAID', fontSize: 8.5, bold: true, color: '#475569' },
              { text: data.totalPaidFormatted, fontSize: 13, bold: true, color: '#15803d' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'TOTAL UNPAID / PENDING', fontSize: 8.5, bold: true, color: '#475569' },
              { text: data.totalPendingFormatted, fontSize: 13, bold: true, color: data.totalPending > 0 ? '#b91c1c' : '#15803d' },
            ],
          },
        ],
      ],
    },
    margin: [0, 0, 0, 10],
  });

  // Table Body
  const tableRows = [
    [
      { text: 'Staff Name', fontSize: 9.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Code', fontSize: 9.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Department', fontSize: 9.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Net Due (₹)', fontSize: 9.5, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Paid (₹)', fontSize: 9.5, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Pending (₹)', fontSize: 9.5, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Status', fontSize: 9.5, bold: true, alignment: 'center', fillColor: '#f1f5f9', color: '#0f172a' },
    ],
  ];

  if (data.items.length === 0) {
    tableRows.push([
      { text: 'No payroll records found for the selected period.', colSpan: 7, alignment: 'center', fontSize: 8.5, color: '#64748b' },
      {}, {}, {}, {}, {}, {},
    ]);
  } else {
    data.items.forEach((item) => {
      tableRows.push([
        { text: item.staffName, fontSize: 9, bold: true, color: '#0f172a' },
        { text: item.employeeId, fontSize: 9, color: '#475569' },
        { text: item.department, fontSize: 9, color: '#334155' },
        { text: formatDocCurrency(item.netSalary), fontSize: 9, alignment: 'right', bold: true, color: '#0f172a' },
        { text: formatDocCurrency(item.paidAmount), fontSize: 9, alignment: 'right', color: '#15803d' },
        { text: formatDocCurrency(item.pendingAmount), fontSize: 9, alignment: 'right', color: item.pendingAmount > 0 ? '#b91c1c' : '#475569' },
        { text: item.status, fontSize: 8.5, alignment: 'center', bold: true, color: item.status === 'PAID' ? '#15803d' : '#b45309' },
      ]);
    });
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['24%', '12%', '18%', '13%', '13%', '12%', '8%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 15],
  });

  return { content };
};

export default {
  buildPayrollReportData,
  buildPayrollReportTemplate,
};
