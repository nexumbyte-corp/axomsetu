import { createPDFHeader } from '../common/header.js';
import { createPDFTable } from '../common/table.js';
import { createPDFSignatureBlock } from '../common/signature.js';
import { amountToWords } from '../../../utils/numberToWords.js';
import { formatDocDate, formatDocCurrency, getSchoolBranding } from '../common/formatters.js';

/**
 * Student Fee Payment Statement Data Builder.
 * Normalizes student details, payment history, fee allocations, and financial totals.
 */
export const buildPaymentStatementData = (rawData = {}) => {
  const data = rawData.data || rawData;
  const student = data.student || rawData.student || data.payments?.[0]?.student || {};
  const payments = data.payments || rawData.payments || data.items || [];
  const summary = data.summary || rawData.summary || {};
  const school = getSchoolBranding(rawData.schoolHeader || data.schoolHeader || rawData.school || data.school || student.school);
  const academicYear = data.academicYear || rawData.academicYear || student.enrollments?.[0]?.academicYear || {};

  // Extract Student Academic & Demographic Details
  const activeEnrollment =
    student.enrollments?.find((e) => e.status === 'ACTIVE') ||
    student.enrollments?.[0] ||
    student.enrollment ||
    {};

  const rawClassName = activeEnrollment?.class?.name || student.class?.name || '';
  const cleanClassName = rawClassName.replace(/^Class\s+/i, '').trim();
  const classNameDisplay = cleanClassName ? cleanClassName : (rawClassName || 'N/A');
  const sectionName = activeEnrollment?.section?.name || student.section?.name || '';
  const sectionDisplay = sectionName ? ` (${sectionName})` : '';
  const classDisplay = `${classNameDisplay}${sectionDisplay}`;

  const streamName = activeEnrollment?.stream?.name || student.stream?.name || '';
  const mediumName = activeEnrollment?.medium?.name || student.medium?.name || '';
  const rollNo = activeEnrollment?.rollNumber ?? activeEnrollment?.rollNo ?? student.rollNo ?? student.rollNumber ?? null;
  const guardianName = student.fatherName || student.guardianName || student.guardian_name || student.guardian || 'N/A';
  const phone = student.phone || student.mobile || student.guardianPhone || student.fatherPhone || 'N/A';
  const admissionNo = student.admissionNo || 'N/A';
  const studentName = student.name || 'N/A';

  // Format and Calculate Payment Items
  let totalPaid = 0;
  let totalVoid = 0;

  const formattedPayments = payments.map((p, idx) => {
    const isVoid = p.status === 'VOID';
    const amt = Number(p.receivedAmount !== undefined ? p.receivedAmount : p.amount || 0);

    if (isVoid) {
      totalVoid += amt;
    } else {
      totalPaid += amt;
    }

    // Format fee heads/allocations if available (bullet-separated per charge for clean vertical flow)
    const allocations = p.allocations || [];
    let feeHeadsDisplay = 'Fee Payment';
    if (allocations.length > 0) {
      feeHeadsDisplay = allocations
        .map((a) => {
          const title = a.charge?.title || a.title || 'Fee';
          const month = a.charge?.month || a.month;
          const allocAmt = Number(a.allocatedAmount || a.amount || 0);
          return `• ${title}${month ? ` (${month})` : ''}: ₹${allocAmt.toLocaleString('en-IN')}`;
        })
        .join('\n');
    }

    // Format receipt number across two lines for compact width adjustment
    let rawRcpt = String(p.receiptNumber || 'RCPT').trim();
    let line1 = rawRcpt;
    let line2 = '';
    const lastSlash = rawRcpt.lastIndexOf('/');
    if (lastSlash !== -1) {
      line1 = rawRcpt.substring(0, lastSlash + 1);
      line2 = rawRcpt.substring(lastSlash + 1);
    } else {
      const lastHyphen = rawRcpt.lastIndexOf('-');
      if (lastHyphen !== -1) {
        line1 = rawRcpt.substring(0, lastHyphen + 1);
        line2 = rawRcpt.substring(lastHyphen + 1);
      }
    }
    const cleanLine1 = line1.startsWith('#') ? line1 : `#${line1}`;
    const doubleLineReceiptNo = line2 ? `${cleanLine1}\n${line2}` : cleanLine1;

    // Directly display name without the word "Cashier:"
    const cashierName = (p.receivedByName || p.receivedBy?.name || p.collectedBy || '').trim();
    const refStr = p.referenceNumber ? `Ref: ${p.referenceNumber}` : null;
    const cashierRefDisplay = [refStr, cashierName].filter(Boolean).join('\n') || '—';

    return {
      index: idx + 1,
      receiptNumber: doubleLineReceiptNo,
      date: formatDocDate(p.paymentDate || p.createdAt),
      mode: (p.paymentMode || 'CASH').replace(/_/g, ' '),
      feeHeads: feeHeadsDisplay,
      cashierRef: cashierRefDisplay,
      amount: isVoid ? `(VOID) ₹${amt.toLocaleString('en-IN')}` : `₹${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      rawAmount: amt,
      status: p.status || 'SUCCESS',
      isVoid,
    };
  });

  const totalCharges = Number(summary.totalCharges || 0);
  const totalOutstanding = Number(summary.totalOutstanding ?? summary.outstanding ?? Math.max(0, totalCharges - totalPaid));
  const statementNumber = admissionNo !== 'N/A' ? `STMT/${admissionNo}` : 'STMT-ALL';

  return {
    school,
    documentTitle: 'STUDENT FEE PAYMENT STATEMENT',
    statementNumber,
    academicYearName: academicYear?.name || (payments[0]?.academicYear?.name) || `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`,
    statementDate: formatDocDate(new Date()),

    student: {
      name: studentName,
      admissionNo,
      classDisplay,
      mediumName,
      streamName,
      rollNo,
      guardianName,
      phone,
    },

    payments: formattedPayments,
    totalPayments: formattedPayments.length,
    totalPaid,
    totalPaidFormatted: `₹${totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    amountInWords: amountToWords(totalPaid),

    totalCharges,
    totalChargesFormatted: `₹${totalCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    totalOutstanding,
    totalOutstandingFormatted: `₹${totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  };
};

/**
 * pdfMake Template Layout Builder for Student Fee Payment Statement.
 */
export const buildPaymentStatementTemplate = (data = {}, options = {}) => {
  const copyLabel = options.copyLabel || 'Official Statement';

  // 1. School Header
  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: 'Fee Payment Statement',
    documentNumber: data.statementNumber,
    status: 'PAYMENT STATEMENT',
    copyLabel,
    academicYear: data.academicYearName,
    options,
  });

  const boxTableLayout = {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => '#94a3b8',
    vLineColor: () => '#94a3b8',
  };

  // 2. Details Grid (Student Particulars & Statement Summary)
  const detailsGrid = {
    margin: [0, 0, 0, 8],
    columns: [
      {
        width: '50%',
        margin: [0, 0, 4, 0],
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#f8fafc',
                borderColor: ['#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8'],
                margin: [7, 5, 7, 5],
                stack: [
                  { text: 'STUDENT PARTICULARS', style: 'boxHeader' },
                  { text: `Admission No: ${data.student.admissionNo}`, style: 'valueMono' },
                  { text: data.student.name, style: 'value' },
                  { text: `Guardian Name: ${data.student.guardianName || 'N/A'}`, style: 'label' },
                  {
                    text: [
                      { text: 'Class: ', style: 'label' },
                      { text: data.student.classDisplay || 'N/A', style: 'value' },
                      data.student.mediumName ? { text: '  Medium: ', style: 'label' } : null,
                      data.student.mediumName ? { text: data.student.mediumName, style: 'value' } : null,
                      data.student.rollNo ? { text: `  | Roll No: ${data.student.rollNo}`, style: 'label' } : null,
                    ].filter(Boolean),
                    margin: [0, 1, 0, 0],
                  },
                  data.student.streamName
                    ? {
                        text: [
                          { text: 'Stream: ', style: 'label' },
                          { text: data.student.streamName, style: 'value' },
                        ],
                        margin: [0, 1, 0, 0],
                      }
                    : null,
                  data.student.phone && data.student.phone !== 'N/A'
                    ? { text: `Contact: ${data.student.phone}`, style: 'label', margin: [0, 1, 0, 0] }
                    : null,
                ].filter(Boolean),
              },
            ],
          ],
        },
        layout: boxTableLayout,
      },
      {
        width: '50%',
        margin: [4, 0, 0, 0],
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#f8fafc',
                borderColor: ['#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8'],
                margin: [7, 5, 7, 5],
                stack: [
                  { text: 'STATEMENT & DUES SUMMARY', style: 'boxHeader' },
                  { text: `Statement Date: ${data.statementDate}   |   Session: ${data.academicYearName}`, style: 'value' },
                  { text: `Receipts Recorded: ${data.totalPayments} Verified Payments`, style: 'valueMono' },
                  data.totalCharges > 0
                    ? { text: `Total Fees Charged: ${data.totalChargesFormatted}`, style: 'label', margin: [0, 1, 0, 0] }
                    : null,
                  {
                    text: [
                      { text: 'Total Fees Paid: ', style: 'label' },
                      { text: data.totalPaidFormatted, style: 'value', color: '#15803d' },
                    ],
                    margin: [0, 1, 0, 0],
                  },
                  {
                    text: [
                      { text: 'Outstanding Balance: ', style: 'label' },
                      {
                        text: data.totalOutstandingFormatted,
                        style: 'value',
                        color: data.totalOutstanding > 0 ? '#dc2626' : '#15803d',
                      },
                    ],
                    margin: [0, 1, 0, 0],
                  },
                ].filter(Boolean),
              },
            ],
          ],
        },
        layout: boxTableLayout,
      },
    ],
  };

  // 3. Payments Table (Clean column widths, double-line receipt no, no status column)
  const tableColumns = [
    { header: '#', key: 'index', width: 20, align: 'center' },
    {
      header: 'Receipt No',
      key: 'receiptNumber',
      width: 78,
      render: (row) => ({
        text: row.receiptNumber,
        fontSize: 7.5,
        bold: true,
        color: '#1e1b4b',
        lineHeight: 1.15,
      }),
    },
    {
      header: 'Date',
      key: 'date',
      width: 55,
      align: 'center',
      render: (row) => ({
        text: row.date,
        fontSize: 8.5,
        alignment: 'center',
      }),
    },
    {
      header: 'Mode',
      key: 'mode',
      width: 45,
      align: 'center',
      render: (row) => ({
        text: row.mode,
        fontSize: 8,
        bold: true,
        alignment: 'center',
      }),
    },
    {
      header: 'Fee Particulars / Heads',
      key: 'feeHeads',
      width: '*',
      render: (row) => ({
        text: row.feeHeads,
        fontSize: 8.5,
        color: '#1e293b',
        lineHeight: 1.2,
      }),
    },
    {
      header: 'Ref / Cashier',
      key: 'cashierRef',
      width: 80,
      render: (row) => ({
        text: row.cashierRef,
        fontSize: 8,
        color: '#475569',
        lineHeight: 1.15,
      }),
    },
    {
      header: 'Amount Paid',
      key: 'amount',
      width: 75,
      align: 'right',
      render: (row) => ({
        text: row.amount,
        fontSize: 9,
        bold: true,
        color: row.isVoid ? '#dc2626' : '#0f172a',
        alignment: 'right',
        noWrap: true,
      }),
    },
  ];

  const paymentsTable = createPDFTable({
    columns: tableColumns,
    data: data.payments,
    showTotals: true,
    totals: { amount: data.totalPaidFormatted },
    totalLabel: 'TOTAL AMOUNT PAID:',
  });

  // 4. Amount in Words & Totals Box
  const summaryBox = {
    margin: [0, 4, 0, 8],
    table: {
      widths: ['*', 180],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8'],
            margin: [7, 5, 7, 5],
            stack: [
              { text: 'TOTAL PAID AMOUNT IN WORDS', style: 'amountWordsLabel' },
              { text: data.amountInWords, style: 'amountWordsValue', margin: [0, 2, 0, 2] },
              {
                text: 'Note: Official computer-generated statement of fee payments received. Valid for accounts clearance and fee reimbursement.',
                fontSize: 7,
                color: '#64748b',
                margin: [0, 2, 0, 0],
              },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#94a3b8', '#94a3b8', '#94a3b8', '#94a3b8'],
            margin: [8, 5, 8, 5],
            alignment: 'right',
            stack: [
              { text: 'TOTAL AMOUNT RECEIVED', style: 'totalBoxLabel', alignment: 'right' },
              { text: data.totalPaidFormatted, style: 'totalBoxValue', color: '#15803d', alignment: 'right', margin: [0, 2, 0, 0] },
            ],
          },
        ],
      ],
    },
    layout: boxTableLayout,
  };

  // 5. Signatures Block
  const signatureBlock = createPDFSignatureBlock({
    cashierTitle: options.cashierTitle || 'Accounts Officer / Cashier',
    signatoryTitle: options.signatoryTitle || 'Principal / Authorized Signatory & Stamp',
    topMargin: 24,
    lineTopMargin: 20,
    ...options,
  });

  const docContent = [
    headerContent,
    detailsGrid,
    paymentsTable,
    summaryBox,
    signatureBlock,
  ].filter(Boolean);

  return {
    content: docContent,
  };
};

export default {
  buildPaymentStatementData,
  buildPaymentStatementTemplate,
};
