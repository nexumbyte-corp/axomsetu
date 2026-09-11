import * as XLSX from 'xlsx';
import { formatDate } from './formatters.js';

/**
 * Universal Data Export Utilities
 * Supports native Excel Spreadsheet (.xlsx), CSV (.csv), and JSON (.json) exports.
 * Auto-formats dates to global DD-MM-YYYY standard across all export types.
 */

/**
 * Extracts and formats cell value based on column definition, custom formatters, or date detection.
 *
 * @param {Object} row
 * @param {Object} col
 * @returns {any}
 */
function getFormattedValue(row, col) {
  if (!row || !col) return '';
  const rawVal = row[col.key];

  if (typeof col.format === 'function') {
    return col.format(rawVal, row);
  }
  if (typeof col.formatter === 'function') {
    return col.formatter(rawVal, row);
  }

  if (rawVal === null || rawVal === undefined) {
    return '';
  }

  if (rawVal instanceof Date) {
    return formatDate(rawVal);
  }

  // Auto-format ISO date strings or Date strings for date-related keys or labels
  if (typeof rawVal === 'string') {
    const keyLower = String(col.key || '').toLowerCase();
    const labelLower = String(col.label || '').toLowerCase();
    const isDateColumn =
      keyLower.includes('date') ||
      keyLower.includes('dob') ||
      keyLower.includes('createdat') ||
      keyLower.includes('updatedat') ||
      labelLower.includes('date') ||
      labelLower.includes('dob');

    if (isDateColumn && /^\d{4}[-/]\d{2}[-/]\d{2}/.test(rawVal.trim())) {
      return formatDate(rawVal);
    }
  }

  return rawVal;
}

/**
 * Converts array of data objects to UTF-8 CSV string and triggers browser download.
 *
 * @param {Array<Object>} data
 * @param {Array<Object>} columns
 * @param {string} filename
 */
export const exportToCSV = (data = [], columns = [], filename = 'Report_Export.csv') => {
  if (!Array.isArray(data) || data.length === 0) {
    return;
  }

  const headerLabels = columns.map((col) => col.label);

  const csvRows = [];

  // Header row
  csvRows.push(headerLabels.map(escapeCSVField).join(','));

  // Data rows
  data.forEach((row) => {
    const values = columns.map((col) => {
      const val = getFormattedValue(row, col);
      if (val === null || val === undefined || val === '') return '""';
      if (typeof val === 'number') return val.toString();
      if (typeof val === 'boolean') return val ? '"TRUE"' : '"FALSE"';
      return escapeCSVField(String(val));
    });
    csvRows.push(values.join(','));
  });

  const csvString = csvRows.join('\r\n');
  // UTF-8 BOM (\uFEFF) ensures Excel opens special characters (e.g. ₹, accents) without distortion
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  const cleanFilename = filename.replace(/\.(xlsx|xls|csv|json)$/i, '') + '.csv';
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export dataset to native Excel Spreadsheet (.xlsx) using SheetJS (XLSX)
 * Generates true binary OpenXML .xlsx files natively supported by MS Excel, Office 365, Google Sheets & LibreOffice.
 *
 * @param {Array<Object>} data
 * @param {Array<Object>} columns
 * @param {string} filename
 */
export const exportToExcel = (data = [], columns = [], filename = 'Report_Export.xlsx') => {
  if (!Array.isArray(data) || data.length === 0) {
    return;
  }

  // Format array objects into label-keyed rows with formatted values
  const formattedRows = data.map((row) => {
    const rowObj = {};
    columns.forEach((col) => {
      rowObj[col.label] = getFormattedValue(row, col) ?? '';
    });
    return rowObj;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Data');

  // Auto-fit column widths based on longest string content
  const colWidths = columns.map((col) => {
    let maxLen = col.label ? col.label.length : 10;
    data.forEach((row) => {
      const val = getFormattedValue(row, col);
      if (val !== null && val !== undefined) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 60) };
  });
  worksheet['!cols'] = colWidths;

  const cleanFilename = filename.replace(/\.(xlsx|xls|csv|json)$/i, '') + '.xlsx';
  XLSX.writeFile(workbook, cleanFilename);
};

/**
 * Export dataset to JSON (.json)
 *
 * @param {Array<Object>} data
 * @param {Array<Object>} [columns]
 * @param {string} [filename='Report_Export.json']
 */
export const exportToJSON = (data = [], columns = [], filename = 'Report_Export.json') => {
  if (!Array.isArray(data) || data.length === 0) return;

  let exportData = data;
  if (Array.isArray(columns) && columns.length > 0 && typeof filename === 'string') {
    exportData = data.map((row) => {
      const rowObj = {};
      columns.forEach((col) => {
        rowObj[col.label || col.key] = getFormattedValue(row, col);
      });
      return rowObj;
    });
  } else if (typeof columns === 'string') {
    filename = columns;
  }

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanFilename = filename.replace(/\.(xlsx|xls|csv|json)$/i, '') + '.json';
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

function escapeCSVField(field) {
  const clean = String(field).replace(/"/g, '""');
  return `"${clean}"`;
}
