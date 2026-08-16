import { createPDFHeader } from '../common/header.js';
import { formatDocCurrency, formatDocDate, sanitizeDocText, getSchoolBranding } from '../common/formatters.js';

/**
 * Fee Report Data Builder
 */
export const buildFeeReportData = (rawData = {}) => {
  const school = getSchoolBranding(rawData.schoolHeader || rawData.school);
  const rows = rawData.data || rawData.items || rawData.reportData || [];
  const summary = rawData.summary || {};

  let totalCollected = Number(summary.totalCollected || summary.totalReceived || 0);
  let totalDues = Number(summary.totalDues || summary.totalOutstanding || 0);
  let totalDiscount = Number(summary.totalDiscount || 0);

  // If summary totals not pre-aggregated, calculate from rows cleanly
  if (!totalCollected && !totalDues && rows.length > 0) {
    rows.forEach((r) => {
      totalCollected += Number(r.paidAmount || r.allocatedAmount || r.amount || 0);
      totalDues += Number(r.dueAmount || r.pendingAmount || 0);
      totalDiscount += Number(r.discountAmount || r.discount || 0);
    });
  }

  const items = rows.map((r) => ({
    receiptNo: sanitizeDocText(r.receiptNumber || r.receiptNo || r.transactionNo || r.id, '-'),
    date: formatDocDate(r.paymentDate || r.date || r.createdAt),
    studentName: sanitizeDocText(r.studentName || r.student?.name, 'N/A'),
    admissionNo: sanitizeDocText(r.admissionNo || r.student?.admissionNo, 'N/A'),
    classSection: sanitizeDocText(r.className || r.classSection || r.student?.classSection, 'N/A'),
    feeHead: sanitizeDocText(r.feeHead || r.feeType || r.title, 'Fee Item'),
    paidAmount: Number(r.paidAmount || r.allocatedAmount || r.amount || 0),
    dueAmount: Number(r.dueAmount || r.pendingAmount || 0),
    discount: Number(r.discountAmount || r.discount || 0),
    paymentMode: sanitizeDocText(r.paymentMode || r.paymentMethod, 'CASH'),
    status: sanitizeDocText(r.status || r.chargeStatus, 'PAID'),
  }));

  return {
    school,
    reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'FEE COLLECTION & DUES REPORT'),
    filters: rawData.filtersApplied || {},
    totalCollected,
    totalDues,
    totalDiscount,
    totalCollectedFormatted: formatDocCurrency(totalCollected),
    totalDuesFormatted: formatDocCurrency(totalDues),
    totalDiscountFormatted: formatDocCurrency(totalDiscount),
    items,
  };
};

/**
 * pdfMake Template Builder for Fee Collection & Dues Report
 */
export const buildFeeReportTemplate = (data = {}, settings = {}) => {
  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: data.reportTitle,
  });

  const content = [...headerContent];

  // Summary Metrics Box
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
              { text: 'TOTAL COLLECTION', fontSize: 7.5, bold: true, color: '#475569' },
              { text: data.totalCollectedFormatted, fontSize: 11, bold: true, color: '#15803d' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'TOTAL OUTSTANDING DUES', fontSize: 7.5, bold: true, color: '#475569' },
              { text: data.totalDuesFormatted, fontSize: 11, bold: true, color: '#b91c1c' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'TOTAL CONCESSION/DISCOUNT', fontSize: 7.5, bold: true, color: '#475569' },
              { text: data.totalDiscountFormatted, fontSize: 11, bold: true, color: '#b45309' },
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
      { text: 'Receipt / Ref #', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Date', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Student Name', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Adm No', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Class', fontSize: 7.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Paid (₹)', fontSize: 7.5, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Due (₹)', fontSize: 7.5, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Status', fontSize: 7.5, bold: true, alignment: 'center', fillColor: '#f1f5f9', color: '#0f172a' },
    ],
  ];

  if (data.items.length === 0) {
    tableRows.push([
      { text: 'No fee records found for the applied report parameters.', colSpan: 8, alignment: 'center', fontSize: 8, color: '#64748b' },
      {}, {}, {}, {}, {}, {}, {},
    ]);
  } else {
    data.items.forEach((item) => {
      tableRows.push([
        { text: item.receiptNo, fontSize: 7.5, bold: true, color: '#0f172a' },
        { text: item.date, fontSize: 7.5, color: '#334155' },
        { text: item.studentName, fontSize: 7.5, bold: true, color: '#0f172a' },
        { text: item.admissionNo, fontSize: 7.5, color: '#475569' },
        { text: item.classSection, fontSize: 7.5, color: '#334155' },
        { text: formatDocCurrency(item.paidAmount), fontSize: 7.5, alignment: 'right', bold: true, color: '#15803d' },
        { text: formatDocCurrency(item.dueAmount), fontSize: 7.5, alignment: 'right', color: item.dueAmount > 0 ? '#b91c1c' : '#475569' },
        { text: item.status, fontSize: 7, alignment: 'center', bold: true, color: item.status === 'PAID' ? '#15803d' : '#b45309' },
      ]);
    });
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['16%', '11%', '22%', '11%', '13%', '11%', '10%', '6%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 15],
  });

  return { content };
};

export default {
  buildFeeReportData,
  buildFeeReportTemplate,
};
