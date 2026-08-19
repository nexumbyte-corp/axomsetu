import { createPDFHeader } from '../../common/header.js';
import { createPDFTable } from '../../common/table.js';
import { createPDFSignatureBlock } from '../../common/signature.js';

/**
 * Receipt Document Template.
 * Pure PDF layout definition for Fee Receipts using common PDF components.
 */
export const buildReceiptTemplate = (data = {}, options = {}) => {
  const copyLabel = options.copyLabel || 'Original Student Copy';
  const isVoid = data.status === 'VOID';

  // 1. School Header
  const headerContent = createPDFHeader({
    school: data.school,
    documentTitle: 'Fee Receipt',
    documentNumber: data.receiptNumber,
    status: data.status,
    copyLabel,
    options,
  });

  // 2. Student & Transaction Details Grid (Box)
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
                borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
                margin: [6, 4, 6, 4],
                stack: [
                  { text: 'STUDENT PARTICULARS', style: 'boxHeader' },
                  { text: data.student.name, style: 'value' },
                  { text: `Admission No: ${data.student.admissionNo}`, style: 'valueMono' },
                  { text: `Class: ${data.student.classSection}`, style: 'value' },
                  { text: `Guardian: ${data.student.guardianName}`, style: 'label' },
                ],
              },
            ],
          ],
        },
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
                borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
                margin: [6, 4, 6, 4],
                stack: [
                  { text: 'TRANSACTION DETAILS', style: 'boxHeader' },
                  { text: `Payment Date: ${data.paymentDate}`, style: 'value' },
                  { text: `Payment Mode: ${data.paymentMode}`, style: 'value' },
                  { text: `Ref / UTR No: ${data.referenceNumber}`, style: 'valueMono' },
                  { text: `Cashier: ${data.cashierName}`, style: 'label' },
                ],
              },
            ],
          ],
        },
      },
    ],
  };

  // 3. Allocations Table
  const tableColumns = [
    { header: 'Fee Head / Particulars', key: 'title', width: '*' },
    { header: 'Month', key: 'month', width: 70 },
    { header: 'Fee Amount', key: 'chargeAmount', width: 80, align: 'right' },
    { header: 'Allocated', key: 'allocatedAmount', width: 80, align: 'right' },
    { header: 'Status', key: 'status', width: 65, align: 'center' },
  ];

  const allocationsTable = createPDFTable({
    columns: tableColumns,
    data: data.allocations,
  });

  // 4. Amount in Words & Totals Box
  const summaryBox = {
    margin: [0, 4, 0, 8],
    table: {
      widths: ['*', 160],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [6, 4, 6, 4],
            stack: [
              { text: 'AMOUNT IN WORDS', style: 'amountWordsLabel' },
              { text: data.amountInWords, style: 'amountWordsValue' },
              data.remarks ? { text: `Note: "${data.remarks}"`, fontSize: 7, color: '#475569', margin: [0, 2, 0, 0] } : null,
            ].filter(Boolean),
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [8, 4, 8, 4],
            alignment: 'right',
            stack: [
              { text: 'TOTAL RECEIVED', style: 'totalBoxLabel', alignment: 'right' },
              { text: data.receivedAmountFormatted, style: 'totalBoxValue', alignment: 'right' },
            ],
          },
        ],
      ],
    },
  };

  // 5. Signatures Block
  const signatureBlock = createPDFSignatureBlock(options);

  // Assemble Complete Layout Definition
  const docContent = [
    headerContent,
    detailsGrid,
    allocationsTable,
    summaryBox,
    signatureBlock,
  ].filter(Boolean);

  const docDefinition = {
    content: docContent,
    watermark: isVoid
      ? { text: 'VOIDED', color: '#rose-600', opacity: 0.15, bold: true, angle: -30 }
      : null,
  };

  return docDefinition;
};

export default buildReceiptTemplate;
