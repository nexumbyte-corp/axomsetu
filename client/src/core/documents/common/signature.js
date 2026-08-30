/**
 * Reusable PDF Signature Block Component for pdfmake.
 * Renders cashier signature line and school stamp/seal area.
 */
export const createPDFSignatureBlock = (options = {}) => {
  if (options.signatureBlockEnabled === false) return null;

  const cashierTitle = options.cashierTitle || 'Cashier / Received By';
  const signatoryTitle = options.signatoryTitle || 'Authorized Signatory & Stamp';

  const topMargin = options.topMargin !== undefined ? options.topMargin : 36;
  const lineTopMargin = options.lineTopMargin !== undefined ? options.lineTopMargin : 32;

  return {
    margin: [0, topMargin, 0, 8],
    columns: [
      {
        width: '50%',
        stack: [
          {
            canvas: [
              {
                type: 'line',
                x1: 20,
                y1: 0,
                x2: 180,
                y2: 0,
                lineWidth: 1,
                lineColor: '#475569',
                dash: { length: 4 },
              },
            ],
            margin: [0, lineTopMargin, 0, 4],
          },
          { text: cashierTitle, style: 'signatureLine' },
        ],
      },
      {
        width: '50%',
        stack: [
          {
            canvas: [
              {
                type: 'line',
                x1: 20,
                y1: 0,
                x2: 180,
                y2: 0,
                lineWidth: 1,
                lineColor: '#475569',
                dash: { length: 4 },
              },
            ],
            margin: [0, lineTopMargin, 0, 4],
          },
          { text: signatoryTitle, style: 'signatureLine' },
        ],
      },
    ],
  };
};

export default createPDFSignatureBlock;
