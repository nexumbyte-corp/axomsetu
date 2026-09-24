import { createPDFHeader } from '../common/header.js';
import { formatDocDate } from '../common/formatters.js';

/**
 * Financial Ledger Data Builder
 */
export const buildFinancialLedgerData = (rawData = {}) => {
  const school = rawData.schoolHeader || rawData.school || {};
  const transactions = rawData.transactions || rawData.data || [];
  const overview = rawData.overview || {};

  // Compute totals directly from the transactions array
  const calculatedCredit = transactions.reduce(
    (sum, t) => (t.type === 'CREDIT' ? sum + Math.abs(Number(t.amount || 0)) : sum),
    0
  );
  const calculatedDebit = transactions.reduce(
    (sum, t) => (t.type === 'DEBIT' ? sum + Math.abs(Number(t.amount || 0)) : sum),
    0
  );
  const calculatedBalance = calculatedCredit - calculatedDebit;

  const rawCredit = overview.totalCredit != null ? overview.totalCredit : rawData.totalCredit;
  const rawDebit = overview.totalDebit != null ? overview.totalDebit : rawData.totalDebit;
  const rawBalance = overview.currentBalance != null ? overview.currentBalance : rawData.currentBalance;

  const hasExplicitTotals =
    (rawCredit != null && Number(rawCredit) !== 0) ||
    (rawDebit != null && Number(rawDebit) !== 0);

  const totalCredit = hasExplicitTotals
    ? Number(rawCredit || 0)
    : (calculatedCredit !== 0 ? calculatedCredit : Number(rawCredit || 0));

  const totalDebit = hasExplicitTotals
    ? Number(rawDebit || 0)
    : (calculatedDebit !== 0 ? calculatedDebit : Number(rawDebit || 0));

  const currentBalance = hasExplicitTotals && rawBalance != null
    ? Number(rawBalance)
    : (totalCredit - totalDebit);

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
    reportDate: formatDocDate(new Date()),
    totalCredit,
    totalDebit,
    currentBalance,
    tableCredit: calculatedCredit,
    tableDebit: calculatedDebit,
    tableBalance: calculatedBalance,
    transactions: transactions.map((t) => ({
      date: formatDocDate(t.transactionDate),
      description: t.description || t.sourceType || 'Transaction',
      sourceType: t.sourceType ? t.sourceType.replace(/_/g, ' ') : 'N/A',
      type: t.type || 'CREDIT',
      paymentMode: t.paymentMode || 'CASH',
      referenceNumber: t.referenceNumber || '-',
      amount: Math.abs(Number(t.amount || 0)),
      isReversal: Boolean(t.isReversal),
    })),
  };
};

/**
 * pdfMake Template Builder for Financial Ledger Statement
 */
export const buildFinancialLedgerTemplate = (data, _settings = {}) => {
  const formatCurrency = (val) => {
    const num = Number(val || 0);
    const isNegative = num < 0;
    return `${isNegative ? '-' : ''}₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const headerStack = createPDFHeader({
    school: data.school,
    documentTitle: 'FINANCIAL LEDGER STATEMENT',
  });

  const content = [...headerStack];

  // 2. Financial Summary Cards Grid
  const netBalancePrefix = data.currentBalance > 0 ? '+' : '';
  const netBalanceText = `${netBalancePrefix}${formatCurrency(data.currentBalance)}`;
  const netBalanceColor = data.currentBalance >= 0 ? '#4f46e5' : '#dc2626';

  content.push({
    table: {
      widths: ['33.33%', '33.33%', '33.34%'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
            margin: [6, 6, 6, 6],
            stack: [
              { text: 'TOTAL CREDIT INFLOW', fontSize: 8.5, bold: true, color: '#059669' },
              { text: formatCurrency(data.totalCredit), fontSize: 13, bold: true, color: '#059669', margin: [0, 2, 0, 0] },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
            margin: [6, 6, 6, 6],
            stack: [
              { text: 'TOTAL DEBIT OUTFLOW', fontSize: 8.5, bold: true, color: '#dc2626' },
              { text: formatCurrency(data.totalDebit), fontSize: 13, bold: true, color: '#dc2626', margin: [0, 2, 0, 0] },
            ],
          },
          {
            fillColor: '#f1f5f9',
            borderColor: ['#e2e8f0', '#e2e8f0', '#e2e8f0', '#e2e8f0'],
            margin: [6, 6, 6, 6],
            stack: [
              { text: 'CURRENT NET BALANCE', fontSize: 8.5, bold: true, color: netBalanceColor },
              { text: netBalanceText, fontSize: 13, bold: true, color: netBalanceColor, margin: [0, 2, 0, 0] },
            ],
          },
        ],
      ],
    },
    margin: [0, 0, 0, 15],
  });

  // 3. Transactions Table
  const tableRows = [
    [
      { text: 'Date', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Description', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Source', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Type', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Mode', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
      { text: 'Amount (₹)', alignment: 'right', bold: true, fillColor: '#f1f5f9', fontSize: 9.5, color: '#1e293b' },
    ],
  ];

  if (!data.transactions || data.transactions.length === 0) {
    tableRows.push([
      {
        text: 'No financial transactions recorded for this statement period.',
        colSpan: 6,
        fontSize: 9,
        italics: true,
        alignment: 'center',
        color: '#64748b',
        margin: [0, 8, 0, 8],
      },
      {}, {}, {}, {}, {},
    ]);
  } else {
    data.transactions.forEach((t) => {
      tableRows.push([
        { text: t.date, fontSize: 9, color: '#334155' },
        { text: t.description, fontSize: 9, color: '#0f172a' },
        { text: t.sourceType, fontSize: 9, color: '#475569' },
        { text: t.isReversal ? `${t.type} (REV)` : t.type, fontSize: 9, bold: true, color: t.type === 'CREDIT' ? '#059669' : '#dc2626' },
        { text: t.paymentMode, fontSize: 9, color: '#475569' },
        { text: `${t.type === 'CREDIT' ? '+' : '-'}${formatCurrency(t.amount)}`, fontSize: 9, alignment: 'right', bold: true, color: t.type === 'CREDIT' ? '#059669' : '#dc2626' },
      ]);
    });

    // Summary Rows at the bottom of the table
    const isSubset = data.tableCredit !== data.totalCredit || data.tableDebit !== data.totalDebit;
    const creditLabel = isSubset ? 'TRANSACTIONS TOTAL CREDIT' : 'TOTAL CREDIT INFLOW';
    const debitLabel = isSubset ? 'TRANSACTIONS TOTAL DEBIT' : 'TOTAL DEBIT OUTFLOW';
    const balanceLabel = isSubset ? 'TRANSACTIONS NET TOTAL' : 'NET STATEMENT BALANCE';
    const footerCredit = isSubset ? data.tableCredit : data.totalCredit;
    const footerDebit = isSubset ? data.tableDebit : data.totalDebit;
    const footerBalance = isSubset ? data.tableBalance : data.currentBalance;

    const footerBalanceText = `${footerBalance > 0 ? '+' : ''}${formatCurrency(footerBalance)}`;
    const footerBalanceColor = footerBalance >= 0 ? '#4f46e5' : '#dc2626';

    tableRows.push([
      { text: creditLabel, colSpan: 5, fontSize: 9, bold: true, color: '#059669', fillColor: '#f8fafc', alignment: 'right', margin: [3, 4, 3, 4] },
      {}, {}, {}, {},
      { text: footerCredit > 0 ? `+${formatCurrency(footerCredit)}` : formatCurrency(footerCredit), fontSize: 9.5, bold: true, alignment: 'right', color: '#059669', fillColor: '#f8fafc', margin: [3, 4, 3, 4] },
    ]);
    tableRows.push([
      { text: debitLabel, colSpan: 5, fontSize: 9, bold: true, color: '#dc2626', fillColor: '#f8fafc', alignment: 'right', margin: [3, 4, 3, 4] },
      {}, {}, {}, {},
      { text: footerDebit > 0 ? `-${formatCurrency(footerDebit)}` : formatCurrency(footerDebit), fontSize: 9.5, bold: true, alignment: 'right', color: '#dc2626', fillColor: '#f8fafc', margin: [3, 4, 3, 4] },
    ]);
    tableRows.push([
      { text: balanceLabel, colSpan: 5, fontSize: 9.5, bold: true, color: '#0f172a', fillColor: '#f1f5f9', alignment: 'right', margin: [3, 5, 3, 5] },
      {}, {}, {}, {},
      {
        text: footerBalanceText,
        fontSize: 10,
        bold: true,
        alignment: 'right',
        color: footerBalanceColor,
        fillColor: '#f1f5f9',
        margin: [3, 5, 3, 5],
      },
    ]);
  }

  content.push({
    table: {
      headerRows: 1,
      widths: ['12%', '33%', '18%', '12%', '12%', '13%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 20],
  });

  return {
    content,
  };
};
