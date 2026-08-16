/**
 * Reusable PDF Header Component for pdfmake.
 * Builds official school branding header with centered logo, title, metadata, and copy label.
 */
export const createPDFHeader = ({
  school = {},
  documentTitle = 'FEE MONEY RECEIPT',
  documentNumber = '',
  status = 'SUCCESS',
  copyLabel = 'Original Copy',
  academicYear = '',
  options = {},
}) => {
  const logoCandidate = school.logoBase64 || (school.logoUrl?.startsWith('data:image/') ? school.logoUrl : null);
  const isSupportedPdfImage =
    logoCandidate &&
    typeof logoCandidate === 'string' &&
    (logoCandidate.startsWith('data:image/png') ||
      logoCandidate.startsWith('data:image/jpeg') ||
      logoCandidate.startsWith('data:image/jpg'));

  const showLogo = options.headerLogoEnabled !== false && Boolean(isSupportedPdfImage);

  const addressParts = [school.address, school.district, school.state].filter(
    (p) => p && String(p).trim() !== ''
  );
  const addressLine = addressParts.join(', ');

  const contactParts = [
    school.phone ? `Phone: ${school.phone}` : null,
    school.email ? `Email: ${school.email}` : null,
    school.website ? `Website: ${school.website}` : null,
  ].filter(Boolean);
  const contactLine = contactParts.join('  |  ');

  const codeParts = [
    school.udiseCode ? `UDISE Code: ${school.udiseCode}` : null,
    school.affiliationNo ? `Affiliation/Recognition No.: ${school.affiliationNo}` : null,
  ].filter(Boolean);
  const codeLine = codeParts.join('        ');

  const stack = [];

  // Top Platform Branding & Document No Row
  stack.push({
    columns: [
      { text: documentNumber ? `Receipt No: ${documentNumber}` : 'AxomSetu Platform', fontSize: 8, bold: true, color: '#334155' },
      { text: `AxomSetu | ${copyLabel.toUpperCase()}`, fontSize: 8, bold: true, color: '#4f46e5', alignment: 'right' },
    ],
    margin: [0, 0, 0, 4],
  });

  // Centered Logo
  if (showLogo && logoCandidate) {
    stack.push({
      image: logoCandidate,
      fit: [50, 50],
      alignment: 'center',
      margin: [0, 2, 0, 4],
    });
  }

  // School Name
  stack.push({
    text: (school.name || 'SCHOOL NAME').toUpperCase(),
    fontSize: 14,
    bold: true,
    alignment: 'center',
    color: '#0f172a',
    margin: [0, 0, 0, 2],
  });

  // Address
  if (addressLine) {
    stack.push({
      text: addressLine,
      fontSize: 9,
      alignment: 'center',
      color: '#334155',
      margin: [0, 0, 0, 1],
    });
  }

  // PIN
  if (school.pincode) {
    stack.push({
      text: `PIN: ${school.pincode}`,
      fontSize: 9,
      bold: true,
      alignment: 'center',
      color: '#475569',
      margin: [0, 0, 0, 1],
    });
  }

  // Phone | Email | Website
  if (contactLine) {
    stack.push({
      text: contactLine,
      fontSize: 8,
      alignment: 'center',
      color: '#475569',
      margin: [0, 0, 0, 2],
    });
  }

  // UDISE Code & Affiliation/Recognition No.
  if (codeLine) {
    stack.push({
      text: codeLine,
      fontSize: 8,
      bold: true,
      alignment: 'center',
      color: '#1e293b',
      margin: [0, 2, 0, 4],
    });
  }

  // Document Title & Academic Year
  if (documentTitle) {
    stack.push({
      text: documentTitle.toUpperCase(),
      fontSize: 11,
      bold: true,
      alignment: 'center',
      color: status === 'VOID' || status === 'CANCELLED' ? '#dc2626' : '#4338ca',
      margin: [0, 4, 0, 1],
    });

    if (status === 'VOID' || status === 'CANCELLED') {
      stack.push({
        text: '*** VOID / CANCELLED DOCUMENT ***',
        fontSize: 9,
        bold: true,
        alignment: 'center',
        color: '#dc2626',
        margin: [0, 1, 0, 2],
      });
    }

    if (academicYear) {
      stack.push({
        text: `Academic Year: ${academicYear}`,
        fontSize: 9,
        bold: true,
        alignment: 'center',
        color: '#475569',
        margin: [0, 0, 0, 4],
      });
    }
  }

  // Separator Line
  stack.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 535,
        y2: 0,
        lineWidth: 1,
        lineColor: status === 'VOID' || status === 'CANCELLED' ? '#fca5a5' : '#cbd5e1',
      },
    ],
    margin: [0, 4, 0, 8],
  });

  return stack;
};

export default createPDFHeader;
