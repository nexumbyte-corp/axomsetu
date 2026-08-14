/**
 * Reusable PDF Table Renderer Component for pdfmake.
 * Builds formatted data tables with automatic column alignment, zebra striping, and summary totals.
 */
export const createPDFTable = ({
  columns = [],
  data = [],
  showTotals = false,
  totals = {},
}) => {
  // 1. Build Header Row
  const headerRow = columns.map((col) => {
    const align = col.align || 'left';
    const styleName = align === 'right' ? 'tableHeaderRight' : align === 'center' ? 'tableHeaderCenter' : 'tableHeader';
    return {
      text: col.header.toUpperCase(),
      style: styleName,
    };
  });

  // 2. Build Data Rows
  const bodyRows = data.map((row, rowIndex) => {
    const isEven = rowIndex % 2 === 0;
    const bg = isEven ? '#ffffff' : '#f8fafc';

    return columns.map((col) => {
      const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '—';
      const align = col.align || 'left';
      const styleName = align === 'right' ? 'tableCellRight' : align === 'center' ? 'tableCellCenter' : 'tableCell';

      let cellContent = { text: String(val), style: styleName, fillColor: bg };

      // Support custom cell formatting callback
      if (col.render) {
        const custom = col.render(row, rowIndex);
        if (typeof custom === 'object') {
          cellContent = { ...custom, fillColor: bg };
        } else {
          cellContent = { text: String(custom), style: styleName, fillColor: bg };
        }
      }

      return cellContent;
    });
  });

  // 3. Optional Totals Row
  if (showTotals) {
    const totalRow = columns.map((col, idx) => {
      if (idx === 0) {
        return { text: 'TOTAL', style: 'tableCellBold', fillColor: '#f1f5f9' };
      }
      if (totals[col.key] !== undefined) {
        const align = col.align || 'right';
        const styleName = align === 'right' ? 'tableCellBoldRight' : 'tableCellBold';
        return { text: String(totals[col.key]), style: styleName, fillColor: '#f1f5f9' };
      }
      return { text: '', style: 'tableCell', fillColor: '#f1f5f9' };
    });
    bodyRows.push(totalRow);
  }

  // 4. Column Widths
  const widths = columns.map((col) => col.width || '*');

  return {
    table: {
      headerRows: 1,
      widths,
      body: [headerRow, ...bodyRows],
    },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1 : 0.5),
      vLineWidth: () => 0,
      hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? '#cbd5e1' : '#f1f5f9'),
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
    margin: [0, 4, 0, 8],
  };
};

export default createPDFTable;
