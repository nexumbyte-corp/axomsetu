/**
 * Reusable PDF Table Renderer Component for pdfmake.
 * Builds formatted data tables with automatic column alignment, zebra striping, and summary totals.
 */
export const createPDFTable = ({
  columns = [],
  data = [],
  showTotals = false,
  totals = {},
  totalLabel = 'TOTAL AMOUNT PAID:',
  layoutOptions = {},
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

  // 3. Optional Totals Row with Smart Colspan (never wraps label into a narrow column)
  if (showTotals) {
    const totalColIndex = columns.findIndex((col) => totals[col.key] !== undefined);

    if (totalColIndex > 0) {
      const totalRow = [];
      // Merged label cell spanning up to the first total value column
      totalRow.push({
        colSpan: totalColIndex,
        text: totalLabel,
        style: 'tableCellBoldRight',
        alignment: 'right',
        fillColor: '#f1f5f9',
      });

      // Dummy cells required by pdfMake for colSpan
      for (let i = 1; i < totalColIndex; i++) {
        totalRow.push({ text: '', fillColor: '#f1f5f9' });
      }

      // Value cells from totalColIndex onwards
      for (let i = totalColIndex; i < columns.length; i++) {
        const col = columns[i];
        if (totals[col.key] !== undefined) {
          const align = col.align || 'right';
          const styleName = align === 'right' ? 'tableCellBoldRight' : 'tableCellBold';
          totalRow.push({ text: String(totals[col.key]), style: styleName, fillColor: '#f1f5f9' });
        } else {
          totalRow.push({ text: '', style: 'tableCell', fillColor: '#f1f5f9' });
        }
      }
      bodyRows.push(totalRow);
    } else {
      const totalRow = columns.map((col, idx) => {
        if (idx === 0) {
          return { text: totalLabel || 'TOTAL', style: 'tableCellBold', fillColor: '#f1f5f9' };
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
      hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 1.5 : 1),
      vLineWidth: () => 1,
      hLineColor: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? '#475569' : '#cbd5e1'),
      vLineColor: () => '#e2e8f0',
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 5,
      paddingBottom: () => 5,
      ...layoutOptions,
    },
    margin: [0, 4, 0, 8],
  };
};

export default createPDFTable;
