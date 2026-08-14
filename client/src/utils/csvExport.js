/**
 * Converts array of data objects to CSV text string and triggers browser download.
 *
 * @param {Array<Object>} data
 * @param {Array<Object>} columns
 * @param {string} filename
 */
export const exportToCSV = (data = [], columns = [], filename = 'Report_Export.csv') => {
  if (!Array.isArray(data) || data.length === 0) {
    alert('No data available to export.');
    return;
  }

  // 1. Determine Headers
  const headerLabels = columns.map((col) => col.label);
  const keys = columns.map((col) => col.key);

  const csvRows = [];

  // Header row
  csvRows.push(headerLabels.map(escapeCSVField).join(','));

  // Data rows
  data.forEach((row) => {
    const values = keys.map((key) => {
      const val = row[key];
      if (val === null || val === undefined) return '""';
      if (typeof val === 'number') return val.toString();
      if (typeof val === 'boolean') return val ? '"TRUE"' : '"FALSE"';
      return escapeCSVField(String(val));
    });
    csvRows.push(values.join(','));
  });

  const csvString = csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function escapeCSVField(field) {
  const clean = field.replace(/"/g, '""');
  return `"${clean}"`;
}
