/**
 * Centralized Document Style Dictionary for pdfmake engine.
 * Defines typography, brand colors, spacing, borders, and badges.
 */
export const createDocumentStyles = (customSettings = {}) => {
  const primaryColor = customSettings.primaryColor || '#1e1b4b'; // Indigo 950
  const secondaryColor = customSettings.secondaryColor || '#4f46e5'; // Indigo 600
  const neutralColor = customSettings.neutralColor || '#64748b'; // Slate 500
  const darkColor = '#0f172a'; // Slate 900
  const _lightBg = '#f8fafc'; // Slate 50
  const _borderColor = '#e2e8f0'; // Slate 200

  return {
    // School Header Styles
    schoolTitle: {
      fontSize: 16,
      bold: true,
      color: primaryColor,
      margin: [0, 0, 0, 2],
    },
    schoolSubtitle: {
      fontSize: 8.5,
      color: neutralColor,
      margin: [0, 0, 0, 2],
    },
    schoolContact: {
      fontSize: 8,
      color: neutralColor,
    },
    docNumberLabel: {
      fontSize: 7.5,
      bold: true,
      color: neutralColor,
    },
    docNumberValue: {
      fontSize: 11,
      bold: true,
      color: secondaryColor,
      margin: [0, 1, 0, 2],
    },
    copyBadge: {
      fontSize: 7,
      bold: true,
      color: '#ffffff',
      fillColor: secondaryColor,
      padding: [4, 2, 4, 2],
      alignment: 'center',
    },

    // Card & Section Box Styles
    boxHeader: {
      fontSize: 8.5,
      bold: true,
      color: secondaryColor,
      margin: [0, 0, 0, 4],
    },
    label: {
      fontSize: 8,
      color: neutralColor,
    },
    value: {
      fontSize: 8.5,
      bold: true,
      color: darkColor,
    },
    valueMono: {
      fontSize: 8.5,
      bold: true,
      color: darkColor,
    },

    // Table Styles
    tableHeader: {
      fontSize: 8,
      bold: true,
      color: darkColor,
      fillColor: '#f1f5f9',
      margin: [0, 2, 0, 2],
    },
    tableHeaderRight: {
      fontSize: 8,
      bold: true,
      color: darkColor,
      fillColor: '#f1f5f9',
      alignment: 'right',
      margin: [0, 2, 0, 2],
    },
    tableHeaderCenter: {
      fontSize: 8,
      bold: true,
      color: darkColor,
      fillColor: '#f1f5f9',
      alignment: 'center',
      margin: [0, 2, 0, 2],
    },
    tableCell: {
      fontSize: 8,
      color: darkColor,
      margin: [0, 2, 0, 2],
    },
    tableCellBold: {
      fontSize: 8,
      bold: true,
      color: darkColor,
      margin: [0, 2, 0, 2],
    },
    tableCellSub: {
      fontSize: 7,
      color: neutralColor,
      margin: [0, 0, 0, 1],
    },
    tableCellRight: {
      fontSize: 8,
      color: darkColor,
      alignment: 'right',
      margin: [0, 2, 0, 2],
    },
    tableCellBoldRight: {
      fontSize: 8,
      bold: true,
      color: darkColor,
      alignment: 'right',
      margin: [0, 2, 0, 2],
    },
    tableCellCenter: {
      fontSize: 8,
      color: darkColor,
      alignment: 'center',
      margin: [0, 2, 0, 2],
    },

    // Badges inside table
    badgeSuccess: {
      fontSize: 7,
      bold: true,
      color: '#15803d',
      fillColor: '#dcfce7',
      alignment: 'center',
    },
    badgeWarning: {
      fontSize: 7,
      bold: true,
      color: '#b45309',
      fillColor: '#fef3c7',
      alignment: 'center',
    },
    badgeDanger: {
      fontSize: 7,
      bold: true,
      color: '#b91c1c',
      fillColor: '#fee2e2',
      alignment: 'center',
    },

    // Totals & Amount in Words
    totalBoxLabel: {
      fontSize: 7.5,
      bold: true,
      color: '#94a3b8',
    },
    totalBoxValue: {
      fontSize: 13,
      bold: true,
      color: '#34d399',
    },
    amountWordsLabel: {
      fontSize: 7.5,
      bold: true,
      color: neutralColor,
    },
    amountWordsValue: {
      fontSize: 8.5,
      bold: true,
      italics: true,
      color: darkColor,
    },

    // Signatures & Disclaimer
    signatureLine: {
      fontSize: 8,
      bold: true,
      color: neutralColor,
      alignment: 'center',
    },
    footerDisclaimer: {
      fontSize: 7,
      color: '#94a3b8',
      alignment: 'center',
      italics: true,
    },
  };
};

export default createDocumentStyles;
