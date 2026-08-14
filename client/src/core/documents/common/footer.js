/**
 * Reusable PDF Footer Component for pdfmake.
 * Renders page numbering, generation timestamp, and system disclaimer.
 */
export const createPDFFooter = (currentPage, pageCount, options = {}) => {
  if (options.footerEnabled === false) return null;

  const timestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    margin: [30, 0, 30, 0],
    stack: [
      {
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 535,
            y2: 0,
            lineWidth: 0.5,
            lineColor: '#e2e8f0',
          },
        ],
        margin: [0, 0, 0, 4],
      },
      {
        columns: [
          {
            text: `Generated: ${timestamp} | Powered by NEXUMBYTE`,
            fontSize: 7,
            color: '#94a3b8',
          },
          {
            text: 'Official Computer-Generated Document',
            fontSize: 7,
            color: '#94a3b8',
            alignment: 'center',
            italics: true,
          },
          {
            text: `Page ${currentPage} of ${pageCount}`,
            fontSize: 7,
            bold: true,
            color: '#64748b',
            alignment: 'right',
          },
        ],
      },
    ],
  };
};

export default createPDFFooter;
