import { createPDFHeader } from '../common/header.js';
import { formatDocCurrency, sanitizeDocText, getSchoolBranding } from '../common/formatters.js';

/**
 * Hostel Report Data Builder
 */
export const buildHostelReportData = (rawData = {}) => {
  const school = getSchoolBranding(rawData.schoolHeader || rawData.school);
  const rows = rawData.data || rawData.items || rawData.residents || rawData.reportData || [];
  const summary = rawData.summary || {};

  let totalCollected = Number(summary.totalCollected || summary.totalPaid || 0);
  let totalDues = Number(summary.totalDues || summary.totalPending || 0);

  if (!totalCollected && !totalDues && rows.length > 0) {
    rows.forEach((r) => {
      totalCollected += Number(r.paidAmount || r.paid || 0);
      totalDues += Number(r.dueAmount || r.pendingAmount || r.due || 0);
    });
  }

  const items = rows.map((r) => ({
    roomNo: sanitizeDocText(r.roomNumber || r.roomNo || r.room?.roomNumber, 'N/A'),
    bedNo: sanitizeDocText(r.bedNumber || r.bedNo || r.bedCode, '—'),
    studentName: sanitizeDocText(r.studentName || r.student?.name || r.name, 'Student'),
    admissionNo: sanitizeDocText(r.admissionNo || r.student?.admissionNo, 'N/A'),
    classSection: sanitizeDocText(r.className || r.classSection || r.student?.classSection, 'N/A'),
    phone: sanitizeDocText(r.phone || r.guardianPhone || r.student?.phone, '—'),
    monthlyFee: Number(r.monthlyFee || r.fee || 0),
    paidAmount: Number(r.paidAmount || r.paid || 0),
    dueAmount: Number(r.dueAmount || r.pendingAmount || r.due || 0),
    status: sanitizeDocText(r.status || r.occupancyStatus, 'OCCUPIED'),
  }));

  return {
    school,
    reportTitle: sanitizeDocText(rawData.reportMeta?.title, 'HOSTEL RESIDENTS & FEE STATEMENT'),
    hostelName: sanitizeDocText(rawData.hostelName || rawData.filtersApplied?.hostelName, 'All Hostels'),
    totalResidents: items.length,
    totalCollected,
    totalDues,
    totalCollectedFormatted: formatDocCurrency(totalCollected),
    totalDuesFormatted: formatDocCurrency(totalDues),
    items,
  };
};

/**
 * pdfMake Template Builder for Hostel Report
 */
export const buildHostelReportTemplate = (data = {}, _settings = {}) => {
  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: data.reportTitle,
    academicYear: `Hostel: ${data.hostelName}`,
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
              { text: 'TOTAL RESIDENTS', fontSize: 8.5, bold: true, color: '#475569' },
              { text: String(data.totalResidents), fontSize: 13, bold: true, color: '#0f172a' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'TOTAL HOSTEL FEES COLLECTED', fontSize: 8.5, bold: true, color: '#475569' },
              { text: data.totalCollectedFormatted, fontSize: 13, bold: true, color: '#15803d' },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'TOTAL HOSTEL DUES', fontSize: 8.5, bold: true, color: '#475569' },
              { text: data.totalDuesFormatted, fontSize: 13, bold: true, color: data.totalDues > 0 ? '#b91c1c' : '#15803d' },
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
      { text: 'Room/Bed', fontSize: 9.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Student Name', fontSize: 9.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Adm No', fontSize: 9.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Class', fontSize: 9.5, bold: true, fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Monthly Fee (₹)', fontSize: 9.5, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Paid (₹)', fontSize: 9.5, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Due (₹)', fontSize: 9.5, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a' },
      { text: 'Status', fontSize: 9.5, bold: true, alignment: 'center', fillColor: '#f1f5f9', color: '#0f172a' },
    ],
  ];

  if (data.items.length === 0) {
    tableRows.push([
      { text: 'No hostel residents found for the selected parameters.', colSpan: 8, alignment: 'center', fontSize: 8.5, color: '#64748b' },
      {}, {}, {}, {}, {}, {}, {},
    ]);
  } else {
    data.items.forEach((item) => {
      tableRows.push([
        { text: `${item.roomNo} / ${item.bedNo}`, fontSize: 9, bold: true, color: '#0f172a' },
        { text: item.studentName, fontSize: 9, bold: true, color: '#0f172a' },
        { text: item.admissionNo, fontSize: 9, color: '#475569' },
        { text: item.classSection, fontSize: 9, color: '#334155' },
        { text: formatDocCurrency(item.monthlyFee), fontSize: 9, alignment: 'right', color: '#0f172a' },
        { text: formatDocCurrency(item.paidAmount), fontSize: 9, alignment: 'right', color: '#15803d' },
        { text: formatDocCurrency(item.dueAmount), fontSize: 9, alignment: 'right', color: item.dueAmount > 0 ? '#b91c1c' : '#475569' },
        { text: item.status, fontSize: 8.5, alignment: 'center', bold: true, color: item.dueAmount <= 0 ? '#15803d' : '#b45309' },
      ]);
    });
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['14%', '24%', '11%', '13%', '13%', '11%', '8%', '6%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 15],
  });

  return { content };
};

export default {
  buildHostelReportData,
  buildHostelReportTemplate,
};
