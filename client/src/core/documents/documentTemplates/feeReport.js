import { createPDFHeader } from '../common/header.js';
import { formatDocCurrency, formatDocDate, sanitizeDocText, getSchoolBranding } from '../common/formatters.js';

/**
 * Fee Report Data Builder
 */
export const buildFeeReportData = (rawData = {}) => {
  const school = getSchoolBranding(rawData.schoolHeader || rawData.school);
  const rows = rawData.data || rawData.items || rawData.reportData || [];
  const summary = rawData.summary || {};
  const columns = rawData.columns || [];

  let totalCollected = Number(summary.totalCollected || summary.totalCollection || 0);
  let totalDues = Number(summary.totalDues || summary.totalOutstanding || 0);
  let totalDiscount = Number(summary.totalDiscount || 0);

  // If summary totals not pre-aggregated or partial, calculate from rows
  if (rows.length > 0) {
    let calcCollected = 0;
    let calcDues = 0;

    rows.forEach((r) => {
      calcCollected += Number(r.amount || r.paidAmount || r.allocatedAmount || 0);
      calcDues += Number(r.dueAmount || r.pendingAmount || r.balance || 0);
    });

    if (!totalCollected && calcCollected > 0) totalCollected = calcCollected;
    if (!totalDues && calcDues > 0) totalDues = calcDues;
  }

  const items = rows.map((r) => {
    let classSec = r.classSection || r.student?.classSection || r.className || 'N/A';
    if (r.className && typeof r.className === 'string') {
      classSec = r.className;
      if (r.sectionName && r.sectionName !== '-' && !classSec.includes(r.sectionName)) {
        classSec += ` - ${r.sectionName}`;
      }
      const extras = [r.mediumName, r.streamName].filter((x) => x && x !== '-').join(' / ');
      if (extras && !classSec.includes(extras)) {
        classSec += ` (${extras})`;
      }
    }

    return {
      receiptNo: sanitizeDocText(r.receiptNumber || r.receiptNo || r.transactionNo || r.id, '-'),
      date: formatDocDate(r.paymentDate || r.date || r.createdAt),
      studentName: sanitizeDocText(r.studentName || r.student?.name, 'N/A'),
      admissionNo: sanitizeDocText(r.admissionNo || r.student?.admissionNo, 'N/A'),
      classSection: sanitizeDocText(classSec, 'N/A'),
      feeHead: sanitizeDocText(r.feeHead || r.feeType || r.title, 'General Fee'),
      paidAmount: Number(r.amount || r.paidAmount || r.allocatedAmount || 0),
      dueAmount: Number(r.dueAmount || r.pendingAmount || r.balance || 0),
      totalCharged: Number(r.totalCharged || 0),
      paymentMode: sanitizeDocText(r.paymentMode || r.paymentMethod, 'CASH'),
      status: sanitizeDocText(r.status || r.chargeStatus, 'PAID'),
      phone: sanitizeDocText(r.phone, '-'),
    };
  });

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
    columns,
    rows,
    items,
  };
};

/**
 * pdfMake Template Builder for Fee Collection & Dues Report
 */
export const buildFeeReportTemplate = (data = {}, _settings = {}) => {
  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: data.reportTitle,
  });

  const content = [...headerContent];

  // Summary Metrics Card
  const summaryBody = [];
  if (data.totalCollected > 0 && data.totalDues > 0) {
    summaryBody.push([
      {
        fillColor: '#f8fafc',
        borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
        margin: [6, 5, 6, 5],
        stack: [
          { text: 'TOTAL COLLECTION', fontSize: 8, bold: true, color: '#475569' },
          { text: data.totalCollectedFormatted, fontSize: 13, bold: true, color: '#15803d', margin: [0, 2, 0, 0] },
        ],
      },
      {
        fillColor: '#f8fafc',
        borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
        margin: [6, 5, 6, 5],
        stack: [
          { text: 'TOTAL OUTSTANDING DUES', fontSize: 8, bold: true, color: '#475569' },
          { text: data.totalDuesFormatted, fontSize: 13, bold: true, color: '#b91c1c', margin: [0, 2, 0, 0] },
        ],
      },
    ]);
  } else if (data.totalDues > 0) {
    summaryBody.push([
      {
        fillColor: '#f8fafc',
        borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
        margin: [6, 5, 6, 5],
        colSpan: 2,
        stack: [
          { text: 'TOTAL OUTSTANDING DUES', fontSize: 8, bold: true, color: '#475569' },
          { text: data.totalDuesFormatted, fontSize: 13, bold: true, color: '#b91c1c', margin: [0, 2, 0, 0] },
        ],
      },
      {},
    ]);
  } else {
    summaryBody.push([
      {
        fillColor: '#f8fafc',
        borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
        margin: [6, 5, 6, 5],
        colSpan: 2,
        stack: [
          { text: 'TOTAL FEE COLLECTION', fontSize: 8, bold: true, color: '#475569' },
          { text: data.totalCollectedFormatted, fontSize: 13, bold: true, color: '#15803d', margin: [0, 2, 0, 0] },
        ],
      },
      {},
    ]);
  }

  content.push({
    table: {
      widths: ['50%', '50%'],
      body: summaryBody,
    },
    margin: [0, 0, 0, 10],
  });

  const cols = data.columns || [];

  if (cols.length > 0) {
    // Render dynamic tabular report if column definitions exist
    const tableHeader = cols.map((c) => ({
      text: c.label,
      fontSize: 9,
      bold: true,
      fillColor: '#f1f5f9',
      color: '#0f172a',
      alignment: c.align || 'left',
      margin: [3, 4, 3, 4],
    }));

    const tableRows = [tableHeader];

    if (!data.rows || data.rows.length === 0) {
      tableRows.push([
        { text: 'No fee records found for the applied report parameters.', colSpan: cols.length, alignment: 'center', fontSize: 8.5, color: '#64748b', margin: [4, 8, 4, 8] },
        ...Array(cols.length - 1).fill({}),
      ]);
    } else {
      data.rows.forEach((row) => {
        const rowCells = cols.map((col) => {
          let val = row[col.key];
          let color = col.highlight ? '#b91c1c' : '#0f172a';
          let bold = Boolean(col.bold);

          if (col.key === 'className' && typeof val === 'string') {
            if (row.sectionName && row.sectionName !== '-' && !val.includes(row.sectionName)) {
              val = `${val} - ${row.sectionName}`;
            }
            const extras = [row.mediumName, row.streamName].filter((x) => x && x !== '-').join(' / ');
            if (extras && !val.includes(extras)) {
              val = `${val} (${extras})`;
            }
          }

          if (col.type === 'currency') {
            val = formatDocCurrency(val);
            if (col.key === 'paidAmount') color = '#15803d';
            if (col.key === 'balance' || col.key === 'dueAmount' || col.key === 'outstanding') {
              color = Number(row[col.key] || 0) > 0 ? '#b91c1c' : '#15803d';
              bold = true;
            }
          } else if (col.type === 'date' && val) {
            val = formatDocDate(val);
          } else if (col.type === 'badge') {
            val = sanitizeDocText(val, '-');
            color = val === 'PAID' || val === 'SUCCESS' ? '#15803d' : val === 'UNPAID' || val === 'PARTIAL' ? '#b91c1c' : '#b45309';
            bold = true;
          } else if (val === null || val === undefined) {
            val = '-';
          } else {
            val = String(val);
          }

          return {
            text: val,
            fontSize: 8.5,
            color,
            bold,
            alignment: col.align || 'left',
            margin: [3, 3, 3, 3],
          };
        });
        tableRows.push(rowCells);
      });
    }

    const colWidths = cols.map((c) => {
      if (c.key.toLowerCase().includes('name') || c.key.toLowerCase().includes('description') || c.key.toLowerCase().includes('fee')) {
        return '*';
      }
      return 'auto';
    });

    content.push({
      table: {
        headerRows: 1,
        widths: colWidths,
        body: tableRows,
      },
      margin: [0, 0, 0, 15],
    });
  } else {
    // Fallback static table format using items
    const tableRows = [
      [
        { text: 'Receipt #', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
        { text: 'Date', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
        { text: 'Student Name', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
        { text: 'Adm No', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
        { text: 'Class', fontSize: 9, bold: true, fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
        { text: 'Paid (₹)', fontSize: 9, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
        { text: 'Due (₹)', fontSize: 9, bold: true, alignment: 'right', fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
        { text: 'Status', fontSize: 9, bold: true, alignment: 'center', fillColor: '#f1f5f9', color: '#0f172a', margin: [3, 4, 3, 4] },
      ],
    ];

    if (!data.items || data.items.length === 0) {
      tableRows.push([
        { text: 'No fee records found for the applied report parameters.', colSpan: 8, alignment: 'center', fontSize: 8.5, color: '#64748b', margin: [4, 8, 4, 8] },
        {}, {}, {}, {}, {}, {}, {},
      ]);
    } else {
      data.items.forEach((item) => {
        tableRows.push([
          { text: item.receiptNo, fontSize: 8.5, bold: true, color: '#0f172a', margin: [3, 3, 3, 3] },
          { text: item.date, fontSize: 8.5, color: '#334155', margin: [3, 3, 3, 3] },
          { text: item.studentName, fontSize: 8.5, bold: true, color: '#0f172a', margin: [3, 3, 3, 3] },
          { text: item.admissionNo, fontSize: 8.5, color: '#475569', margin: [3, 3, 3, 3] },
          { text: item.classSection, fontSize: 8.5, color: '#334155', margin: [3, 3, 3, 3] },
          { text: formatDocCurrency(item.paidAmount), fontSize: 8.5, alignment: 'right', bold: true, color: '#15803d', margin: [3, 3, 3, 3] },
          { text: formatDocCurrency(item.dueAmount), fontSize: 8.5, alignment: 'right', color: item.dueAmount > 0 ? '#b91c1c' : '#475569', margin: [3, 3, 3, 3] },
          { text: item.status, fontSize: 8, alignment: 'center', bold: true, color: item.status === 'PAID' ? '#15803d' : '#b45309', margin: [3, 3, 3, 3] },
        ]);
      });
    }

    content.push({
      table: {
        headerRows: 1,
        widths: ['14%', '11%', '22%', '10%', '12%', '11%', '11%', '9%'],
        body: tableRows,
      },
      margin: [0, 0, 0, 15],
    });
  }

  return { content };
};

export default {
  buildFeeReportData,
  buildFeeReportTemplate,
};
