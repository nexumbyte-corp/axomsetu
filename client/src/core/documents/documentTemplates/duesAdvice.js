import { createPDFHeader } from '../common/header.js';
import { createPDFTable } from '../common/table.js';
import { createPDFSignatureBlock } from '../common/signature.js';
import { amountToWords } from '../../../utils/numberToWords.js';
import { formatFeeMonthYear, formatDocDate, getSchoolBranding } from '../common/formatters.js';

/**
 * Student Dues Advice Data Builder
 */
export const buildDuesAdviceData = (rawData = {}) => {
  const data = rawData.data || rawData;
  const student = data.student || rawData.student || data;
  const currentAcademic = data.currentAcademic || student.currentAcademic || student.enrollment || student.enrollments?.[0] || {};
  const school = getSchoolBranding(rawData.schoolHeader || data.schoolHeader || rawData.school || data.school);
  const academicYear = data.academicYear || currentAcademic.academicYear || {};
  const pendingFees = data.pendingFees || data.pendingDues || data.allocations || data.data || [];

  const rawClassName = currentAcademic?.class?.name || student?.class?.name || '';
  const cleanClassName = rawClassName.replace(/^Class\s+/i, '').trim();
  const classNameDisplay = cleanClassName ? cleanClassName : (rawClassName || 'N/A');
  const sectionName = currentAcademic?.section?.name || student?.section?.name || '';
  const sectionDisplay = sectionName ? ` (${sectionName})` : '';
  const classDisplay = `${classNameDisplay}${sectionDisplay}`;

  const streamName = currentAcademic?.stream?.name || student?.stream?.name || '';
  const mediumName = currentAcademic?.medium?.name || student?.medium?.name || '';
  const rollNo = (currentAcademic?.rollNumber ?? currentAcademic?.rollNo ?? student?.rollNo ?? student?.rollNumber) || null;
  const guardianName = student?.guardianName || student?.guardian_name || student?.fatherName || student?.guardian || 'N/A';

  const totalBalance = pendingFees.reduce((sum, f) => sum + Number(f.balance || f.dueAmount || f.amount || 0), 0);

  const formattedItems = pendingFees.map((fee, idx) => {
    const feeAmt = Number(fee.amount || fee.chargeAmount || fee.balance || 0);
    const paidAmt = Number(fee.paidAmount || 0);
    const balAmt = Number(fee.balance || fee.dueAmount || Math.max(0, feeAmt - paidAmt));

    const monthDisplay = formatFeeMonthYear(
      fee.month || fee.charge?.month,
      fee.year || fee.charge?.year,
      academicYear?.name || new Date().getFullYear()
    );

    return {
      index: idx + 1,
      title: fee.title || fee.chargeTitle || fee.name || 'Pending Fee Charge',
      month: monthDisplay,
      feeAmount: `₹${feeAmt.toFixed(2)}`,
      paidAmount: `₹${paidAmt.toFixed(2)}`,
      remainingAmount: `₹${balAmt.toFixed(2)}`,
      status: fee.status || (balAmt > 0 ? (paidAmt > 0 ? 'PARTIAL' : 'UNPAID') : 'PAID'),
    };
  });

  return {
    school,
    documentTitle: 'OUTSTANDING FEE DUES STATEMENT',
    academicYearName: academicYear?.name || `${new Date().getFullYear()}–${new Date().getFullYear() + 1}`,
    statementDate: formatDocDate(new Date()),

    student: {
      name: student.name || 'N/A',
      admissionNo: student.admissionNo || 'N/A',
      classDisplay,
      mediumName,
      streamName,
      rollNo,
      guardianName,
    },

    pendingFees: formattedItems,
    totalBalance,
    totalBalanceFormatted: `₹${totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    amountInWords: amountToWords(totalBalance),
  };
};

/**
 * pdfMake Template Builder for Student Dues Advice
 */
export const buildDuesAdviceTemplate = (data = {}, options = {}) => {
  const copyLabel = options.copyLabel || 'Official Student Copy';

  // 1. Header
  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: 'Pending Dues Statement',
    status: 'PENDING DUES',
    copyLabel,
    options,
  });

  const boxTableLayout = {
    hLineWidth: () => 1,
    vLineWidth: () => 1,
    hLineColor: () => '#475569',
    vLineColor: () => '#475569',
  };

  // 2. Details Grid (Student Particulars & Statement Metadata)
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
                borderColor: ['#475569', '#475569', '#475569', '#475569'],
                margin: [6, 4, 6, 4],
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
                borderColor: ['#475569', '#475569', '#475569', '#475569'],
                margin: [6, 4, 6, 4],
                stack: [
                  { text: 'STATEMENT METADATA', style: 'boxHeader' },
                  { text: `Statement Date: ${data.statementDate}`, style: 'value' },
                  { text: `Academic Year: ${data.academicYearName}`, style: 'value' },
                  { text: `Pending Head Items: ${data.pendingFees.length} Items`, style: 'valueMono' },
                ],
              },
            ],
          ],
        },
        layout: boxTableLayout,
      },
    ],
  };

  // 3. Pending Charges Breakdown Table
  const tableColumns = [
    { header: '#', key: 'index', width: 20, align: 'center' },
    { header: 'Fee Head / Particulars', key: 'title', width: '*' },
    { header: 'Month', key: 'month', width: 70 },
    { header: 'Fee Amount', key: 'feeAmount', width: 65, align: 'right' },
    { header: 'Paid Amount', key: 'paidAmount', width: 65, align: 'right' },
    { header: 'Pending Balance', key: 'remainingAmount', width: 75, align: 'right' },
    { header: 'Status', key: 'status', width: 50, align: 'center' },
  ];

  const pendingTable = createPDFTable({
    columns: tableColumns,
    data: data.pendingFees,
  });

  // 4. Amount in Words & Totals Box
  const summaryBox = {
    margin: [0, 4, 0, 8],
    table: {
      widths: ['*', 170],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#475569', '#475569', '#475569', '#475569'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'OUTSTANDING AMOUNT IN WORDS', style: 'amountWordsLabel' },
              { text: data.amountInWords, style: 'amountWordsValue' },
              { text: 'Payment Advice: Please clear outstanding dues at Accounts Counter or online.', fontSize: 7, color: '#475569', margin: [0, 2, 0, 0] },
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#475569', '#475569', '#475569', '#475569'],
            margin: [8, 4, 8, 4],
            alignment: 'right',
            stack: [
              { text: 'TOTAL PENDING DUES', style: 'totalBoxLabel', alignment: 'right' },
              { text: data.totalBalanceFormatted, style: 'totalBoxValue', color: '#b91c1c', alignment: 'right' },
            ],
          },
        ],
      ],
    },
    layout: boxTableLayout,
  };

  // 5. Signatures Block
  const signatureBlock = createPDFSignatureBlock(options);

  const docContent = [
    headerContent,
    detailsGrid,
    pendingTable,
    summaryBox,
    signatureBlock,
  ].filter(Boolean);

  return {
    content: docContent,
  };
};

export default {
  buildDuesAdviceData,
  buildDuesAdviceTemplate,
};
