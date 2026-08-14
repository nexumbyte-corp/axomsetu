import { createPDFHeader } from '../common/header.js';

/**
 * Converts a numeric amount to Indian Rupee Words representation.
 */
function numberToIndianWords(num) {
  if (num === null || num === undefined || isNaN(num)) return 'Zero Rupees';
  const val = Math.floor(Math.abs(num));
  if (val === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n) {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertChunk(n % 100) : '');
    return '';
  }

  let result = '';
  const crore = Math.floor(val / 10000000);
  let remainder = val % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) result += convertChunk(crore) + ' Crore ';
  if (lakh > 0) result += convertChunk(lakh) + ' Lakh ';
  if (thousand > 0) result += convertChunk(thousand) + ' Thousand ';
  if (remainder > 0) result += convertChunk(remainder);

  return 'Rupees ' + result.trim() + ' Only';
}

export const buildSalarySlipData = (rawData = {}) => {
  const dataObj = rawData?.data || rawData || {};
  const staff = dataObj.staff || rawData?.staff || {};
  const school = dataObj.schoolHeader || dataObj.school || rawData?.school || {};
  const payrolls = Array.isArray(dataObj.payrolls)
    ? dataObj.payrolls
    : Array.isArray(rawData?.payrolls)
    ? rawData.payrolls
    : [dataObj];

  const totalBase = payrolls.reduce((sum, p) => sum + Number(p.baseSalary || 0), 0);
  const totalAttendanceDeduction = payrolls.reduce((sum, p) => sum + Number(p.attendanceDeduction || 0), 0);
  const totalBonus = payrolls.reduce((sum, p) => sum + Number(p.bonus || 0), 0);
  const totalAdvanceDeduction = payrolls.reduce((sum, p) => sum + Number(p.advanceDeduction || 0), 0);
  const totalOtherDeduction = payrolls.reduce((sum, p) => sum + Number(p.otherDeduction || 0), 0);
  const totalNet = payrolls.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);
  const totalPaid = payrolls.reduce((sum, p) => sum + Number(p.paidAmount || 0), 0);

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

    title: dataObj.title || rawData?.title || `SALARY SLIP FOR ${payrolls[0]?.month || ''} ${payrolls[0]?.year || ''}`,
    periodText: dataObj.periodText || `${payrolls[0]?.month || ''} ${payrolls[0]?.year || ''}`,

    staffName: staff.name || 'N/A',
    employeeId: staff.employeeId || 'N/A',
    department: staff.department || 'N/A',
    designation: staff.designation || 'N/A',
    bankName: staff.bankName || 'N/A',
    bankAccountNo: staff.bankAccountNo || 'N/A',
    ifscCode: staff.ifscCode || 'N/A',

    staff,
    payrolls,
    totalBase,
    totalAttendanceDeduction,
    totalBonus,
    totalAdvanceDeduction,
    totalOtherDeduction,
    totalNet,
    totalPaid,
    netInWords: numberToIndianWords(totalNet),
    generatedDate: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  };
};

export const buildSalarySlipTemplate = (data) => {
  const rows = (data.payrolls || []).map((p) => [
    { text: `${p.month || ''} ${p.year || ''}`, style: 'tableCell', alignment: 'left' },
    { text: `₹${Number(p.baseSalary || 0).toLocaleString('en-IN')}`, style: 'tableCell', alignment: 'right' },
    { text: `${p.workedDays} / ${p.workingDays}`, style: 'tableCell', alignment: 'center' },
    { text: Number(p.attendanceDeduction || 0) > 0 ? `-₹${Number(p.attendanceDeduction).toLocaleString('en-IN')}` : '₹0', style: 'tableCell', alignment: 'right' },
    { text: Number(p.bonus || 0) > 0 ? `+₹${Number(p.bonus).toLocaleString('en-IN')}` : '₹0', style: 'tableCell', alignment: 'right' },
    { text: Number(p.advanceDeduction || 0) > 0 ? `-₹${Number(p.advanceDeduction).toLocaleString('en-IN')}` : '₹0', style: 'tableCell', alignment: 'right' },
    { text: Number(p.otherDeduction || 0) > 0 ? `-₹${Number(p.otherDeduction).toLocaleString('en-IN')}` : '₹0', style: 'tableCell', alignment: 'right' },
    { text: `₹${Number(p.netSalary || 0).toLocaleString('en-IN')}`, style: 'tableCellBold', alignment: 'right' },
  ]);

  const headerStack = createPDFHeader({
    school: data.school,
    documentTitle: 'EMPLOYEE SALARY SLIP',
    academicYear: data.periodText,
  });

  return {
    content: [
      ...headerStack,

      // Slip Title & Period Banner
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#4f46e5',
                margin: [8, 6],
                text: data.title.toUpperCase(),
                style: 'bannerTitle',
                alignment: 'center',
              },
            ],
          ],
        },
        layout: 'noBorders',
      },

      { text: '', margin: [0, 6] },

      // Staff Details Table
      {
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            [
              { text: 'Employee Name:', style: 'labelCell' },
              { text: data.staffName, style: 'valueCellBold' },
              { text: 'Employee Code:', style: 'labelCell' },
              { text: data.employeeId, style: 'valueCellBold' },
            ],
            [
              { text: 'Designation:', style: 'labelCell' },
              { text: data.designation, style: 'valueCell' },
              { text: 'Department:', style: 'labelCell' },
              { text: data.department, style: 'valueCell' },
            ],
            [
              { text: 'Bank Name:', style: 'labelCell' },
              { text: data.bankName, style: 'valueCell' },
              { text: 'Account Number:', style: 'labelCell' },
              { text: data.bankAccountNo, style: 'valueCell' },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#e2e8f0',
          vLineColor: () => '#e2e8f0',
        },
      },

      { text: '', margin: [0, 10] },

      // Breakdown Table
      {
        table: {
          headerRows: 1,
          widths: ['16%', '13%', '12%', '12%', '11%', '12%', '11%', '13%'],
          body: [
            [
              { text: 'Period', style: 'tableHeader', alignment: 'left' },
              { text: 'Base (₹)', style: 'tableHeader', alignment: 'right' },
              { text: 'Worked', style: 'tableHeader', alignment: 'center' },
              { text: 'Attn. Ded.', style: 'tableHeader', alignment: 'right' },
              { text: 'Bonus', style: 'tableHeader', alignment: 'right' },
              { text: 'Adv. Ded.', style: 'tableHeader', alignment: 'right' },
              { text: 'Oth. Ded.', style: 'tableHeader', alignment: 'right' },
              { text: 'Net Salary', style: 'tableHeader', alignment: 'right' },
            ],
            ...rows,
            // Total Summary Row
            [
              { text: 'TOTAL', style: 'tableFooter', alignment: 'left' },
              { text: `₹${data.totalBase.toLocaleString('en-IN')}`, style: 'tableFooter', alignment: 'right' },
              { text: '-', style: 'tableFooter', alignment: 'center' },
              { text: data.totalAttendanceDeduction > 0 ? `-₹${data.totalAttendanceDeduction.toLocaleString('en-IN')}` : '₹0', style: 'tableFooter', alignment: 'right' },
              { text: data.totalBonus > 0 ? `+₹${data.totalBonus.toLocaleString('en-IN')}` : '₹0', style: 'tableFooter', alignment: 'right' },
              { text: data.totalAdvanceDeduction > 0 ? `-₹${data.totalAdvanceDeduction.toLocaleString('en-IN')}` : '₹0', style: 'tableFooter', alignment: 'right' },
              { text: data.totalOtherDeduction > 0 ? `-₹${data.totalOtherDeduction.toLocaleString('en-IN')}` : '₹0', style: 'tableFooter', alignment: 'right' },
              { text: `₹${data.totalNet.toLocaleString('en-IN')}`, style: 'tableFooterBold', alignment: 'right' },
            ],
          ],
        },
        layout: {
          fillColor: (rowIndex) => (rowIndex === 0 ? '#1e293b' : rowIndex % 2 === 0 ? '#f8fafc' : null),
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => '#cbd5e1',
          vLineColor: () => '#cbd5e1',
        },
      },

      { text: '', margin: [0, 8] },

      // Net Amount in Words Box
      {
        table: {
          widths: ['*'],
          body: [
            [
              {
                fillColor: '#f0fdf4',
                margin: [8, 6],
                stack: [
                  { text: 'NET SALARY PAYABLE:', style: 'amountWordsLabel' },
                  { text: `${data.netInWords} (₹${data.totalNet.toLocaleString('en-IN')})`, style: 'amountWordsText' },
                ],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          hLineColor: () => '#bbf7d0',
          vLineColor: () => '#bbf7d0',
        },
      },

      { text: '', margin: [0, 25] },

      // Signatures
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: '___________________________', style: 'sigLine' },
              { text: 'Employee Signature', style: 'sigLabel' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: '___________________________', style: 'sigLine' },
              { text: 'Authorized Signatory / Principal', style: 'sigLabel' },
            ],
            alignment: 'right',
          },
        ],
      },
    ],
    styles: {
      schoolHeader: { fontSize: 16, bold: true, color: '#0f172a' },
      schoolSubHeader: { fontSize: 9, color: '#64748b' },
      docBadge: { fontSize: 10, bold: true, color: '#4f46e5' },
      metaText: { fontSize: 9, color: '#475569' },
      bannerTitle: { fontSize: 12, bold: true, color: '#ffffff' },
      labelCell: { fontSize: 9, bold: true, color: '#475569', fillColor: '#f8fafc' },
      valueCell: { fontSize: 9, color: '#0f172a' },
      valueCellBold: { fontSize: 9, bold: true, color: '#0f172a' },
      tableHeader: { fontSize: 8, bold: true, color: '#ffffff', margin: [2, 4] },
      tableCell: { fontSize: 8, color: '#1e293b', margin: [2, 3] },
      tableCellBold: { fontSize: 8, bold: true, color: '#4f46e5', margin: [2, 3] },
      tableFooter: { fontSize: 8, bold: true, color: '#0f172a', fillColor: '#e2e8f0', margin: [2, 4] },
      tableFooterBold: { fontSize: 9, bold: true, color: '#15803d', fillColor: '#e2e8f0', margin: [2, 4] },
      amountWordsLabel: { fontSize: 9, bold: true, color: '#166534' },
      amountWordsText: { fontSize: 11, bold: true, color: '#15803d', margin: [0, 2, 0, 0] },
      sigLine: { fontSize: 10, color: '#94a3b8' },
      sigLabel: { fontSize: 9, bold: true, color: '#334155', margin: [0, 2, 0, 0] },
    },
  };
};
