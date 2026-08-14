/**
 * Reusable PDF Signature Block Component for pdfmake.
 * Renders cashier signature line and school stamp/seal area.
 */
export const createPDFSignatureBlock = (options = {}) => {
  if (options.signatureBlockEnabled === false) return null;

  const cashierTitle = options.cashierTitle || 'Cashier / Received By';
  const signatoryTitle = options.signatoryTitle || 'Authorized Signatory & Stamp';

  return {
    margin: [0, 16, 0, 8],
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
                lineWidth: 0.5,
                lineColor: '#94a3b8',
                dash: { length: 3 },
              },
            ],
            margin: [0, 24, 0, 4],
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
                lineWidth: 0.5,
                lineColor: '#94a3b8',
                dash: { length: 3 },
              },
            ],
            margin: [0, 24, 0, 4],
          },
          { text: signatoryTitle, style: 'signatureLine' },
        ],
      },
    ],
  };
};

export default createPDFSignatureBlock;
