import { createPDFHeader } from '../common/header.js';

/**
 * Data builder for dynamic tabular reports
 */
export const buildGenericReportData = (rawData = {}) => {
  const school = rawData.schoolHeader || rawData.school || {};
  const reportMeta = rawData.reportMeta || {};
  const rows = rawData.data || rawData.rows || [];
  const columns = rawData.columns || [];
  const summary = rawData.summary || {};
  const filtersApplied = rawData.filtersApplied || {};

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
    reportTitle: reportMeta.title || 'School Official Report',
    generatedDate: new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    columns,
    rows,
    summary,
    filtersApplied,
  };
};

/**
 * pdfMake Template Builder for Generic Business Reports
 */
export const buildGenericReportTemplate = (data, _settings = {}) => {
  const formatCurrency = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const headerStack = createPDFHeader({
    school: data.school,
    documentTitle: data.reportTitle || 'SCHOOL OFFICIAL REPORT',
  });

  const content = [...headerStack];

  // Filters summary block if filters were applied
  const filterEntries = Object.entries(data.filtersApplied || {}).filter(([_, v]) => Boolean(v));
  if (filterEntries.length > 0) {
    const filterPills = filterEntries.map(([k, v]) => `${k}: ${v}`).join(' | ');
    content.push({
      text: `Filters Applied: ${filterPills}`,
      fontSize: 8,
      color: '#475569',
      italics: true,
      margin: [0, 0, 0, 10],
    });
  }

  // Summary Metrics Block if summary values exist
  const summaryKeys = Object.keys(data.summary || {});
  if (summaryKeys.length > 0) {
    const summaryCells = summaryKeys.slice(0, 4).map((key) => {
      const label = key.replace(/([A-Z])/g, ' $1').toUpperCase();
      const val = data.summary[key];
      const displayVal = typeof val === 'number' && key.toLowerCase().includes('amount') || key.toLowerCase().includes('collection') || key.toLowerCase().includes('expense') || key.toLowerCase().includes('total') || key.toLowerCase().includes('outstanding') || key.toLowerCase().includes('balance')
        ? formatCurrency(val)
        : String(val);

      return {
        fillColor: '#f8fafc',
        margin: [4, 4, 4, 4],
        stack: [
          { text: label, fontSize: 7, bold: true, color: '#64748b' },
          { text: displayVal, fontSize: 10, bold: true, color: '#0f172a', margin: [0, 1, 0, 0] },
        ],
      };
    });

    content.push({
      table: {
        widths: Array(summaryCells.length).fill(`${100 / summaryCells.length}%`),
        body: [summaryCells],
      },
      margin: [0, 0, 0, 12],
    });
  }

  // Main Data Table
  const cols = data.columns || [];
  if (cols.length > 0) {
    const tableHeader = cols.map((c) => ({
      text: c.label,
      bold: true,
      fillColor: '#f1f5f9',
      fontSize: 8,
      color: '#1e293b',
      alignment: c.align || 'left',
    }));

    const tableRows = [tableHeader];

    data.rows.forEach((row) => {
      const rowCells = cols.map((col) => {
        let val = row[col.key];
        let color = col.highlight ? '#dc2626' : '#0f172a';
        let bold = Boolean(col.bold);

        if (col.type === 'currency') {
          val = formatCurrency(val);
        } else if (col.type === 'date' && val) {
          val = new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        } else if (val === null || val === undefined) {
          val = '-';
        }

        return {
          text: String(val),
          fontSize: 8,
          color,
          bold,
          alignment: col.align || 'left',
        };
      });
      tableRows.push(rowCells);
    });

    // Auto calculate column width percents
    const colWidths = cols.map((c) => (c.key.includes('Name') || c.key.includes('description') || c.key.includes('title') ? '*' : 'auto'));

    content.push({
      table: {
        headerRows: 1,
        widths: colWidths,
        body: tableRows,
      },
      margin: [0, 0, 0, 15],
    });
  }

  return { content };
};
