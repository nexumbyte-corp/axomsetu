import { createPDFHeader } from '../common/header.js';

/**
 * Salary Receipt / Voucher Data Builder
 */
export const buildSalaryReceiptData = (rawData = {}) => {
  const staff = rawData.staff || {};
  const school = rawData.schoolHeader || rawData.school || {};
  const academicYear = rawData.academicYear || {};
  const allocations = rawData.allocations || [];

  const monthsText = Array.isArray(rawData.months)
    ? rawData.months.join(', ')
    : rawData.months || 'Salary Month';

  return {
    voucherNo: rawData.paymentNumber || 'SAL-VOUCHER',
    paymentDate: rawData.paymentDate
      ? new Date(rawData.paymentDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'N/A',
    paymentMode: rawData.paymentMode || 'CASH',
    referenceNo: rawData.referenceNo || 'N/A',
    remarks: rawData.remarks || '',
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
    staffName: staff.name || 'Employee',
    employeeId: staff.employeeId || '',
    department: staff.department || 'N/A',
    designation: staff.designation || 'N/A',
    bankName: staff.bankName || '',
    bankAccountNo: staff.bankAccountNo || '',
    academicYearName: academicYear.name || `${rawData.year || ''}`,
    monthsText,
    year: rawData.year,
    baseSalary: Number(rawData.baseSalary || 0),
    allowances: Number(rawData.allowances || 0),
    deductions: Number(rawData.deductions || 0),
    advanceDeducted: Number(rawData.advanceDeducted || 0),
    netSalary: Number(rawData.netSalary || 0),
    allocations: allocations.map((a) => ({
      month: a.monthlyPayroll?.month || '',
      year: a.monthlyPayroll?.year || rawData.year,
      allocatedAmount: Number(a.allocatedAmount || 0),
      netSalary: Number(a.monthlyPayroll?.netSalary || 0),
    })),
  };
};

/**
 * pdfMake Template Builder for Salary Receipt
 */
export const buildSalaryReceiptTemplate = (data, settings = {}) => {
  const formatCurrency = (val) =>
    `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  const headerStack = createPDFHeader({
    school: data.school,
    documentTitle: 'SALARY DISBURSEMENT VOUCHER',
    documentNumber: data.voucherNo,
    academicYear: data.academicYearName,
  });

  const content = [...headerStack];

  // 2. Info Grid Box (Employee & Payment Metadata)
  content.push({
    table: {
      widths: ['50%', '50%'],
      body: [
        [
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [8, 8, 8, 8],
            stack: [
              { text: 'EMPLOYEE DETAILS', fontSize: 9, bold: true, color: '#475569', margin: [0, 0, 0, 4] },
              { text: data.staffName, fontSize: 11, bold: true, color: '#0f172a' },
              { text: `Employee ID: ${data.employeeId}`, fontSize: 9, color: '#334155' },
              { text: `Department: ${data.department}`, fontSize: 9, color: '#334155' },
              { text: `Designation: ${data.designation}`, fontSize: 9, color: '#334155' },
              data.bankAccountNo ? { text: `Bank: ${data.bankName} (${data.bankAccountNo})`, fontSize: 8, color: '#64748b', margin: [0, 2, 0, 0] } : {},
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#cbd5e1', '#cbd5e1', '#cbd5e1', '#cbd5e1'],
            margin: [8, 8, 8, 8],
            stack: [
              { text: 'PAYMENT DISBURSEMENT INFO', fontSize: 9, bold: true, color: '#475569', margin: [0, 0, 0, 4] },
              { text: `Period Paid: ${data.monthsText} (${data.year})`, fontSize: 10, bold: true, color: '#4f46e5' },
              { text: `Payment Mode: ${data.paymentMode}`, fontSize: 9, color: '#334155' },
              { text: `Txn / Ref No: ${data.referenceNo}`, fontSize: 9, color: '#334155' },
              { text: `Academic Year: ${data.academicYearName}`, fontSize: 9, color: '#334155' },
            ],
          },
        ],
      ],
    },
    margin: [0, 0, 0, 15],
  });

  // 3. Payment Settlement Breakdown Table
  const tableRows = [
    [
      { text: 'Component Description / Settled Period', style: 'tableHeader', bold: true, fillColor: '#f1f5f9', color: '#1e293b' },
      { text: 'Amount (₹)', style: 'tableHeader', alignment: 'right', bold: true, fillColor: '#f1f5f9', color: '#1e293b' },
    ],
    [
      { text: `Gross Monthly Salary (${data.monthsText})`, fontSize: 9, color: '#334155' },
      { text: formatCurrency(data.baseSalary), fontSize: 9, alignment: 'right', color: '#334155' },
    ],
  ];

  if (data.allowances > 0) {
    tableRows.push([
      { text: '+ Bonus / Allowances Added', fontSize: 9, color: '#15803d', bold: true },
      { text: `+ ${formatCurrency(data.allowances)}`, fontSize: 9, alignment: 'right', color: '#15803d', bold: true },
    ]);
  }

  if (data.deductions > 0) {
    tableRows.push([
      { text: '- Attendance & Other Deductions', fontSize: 9, color: '#b91c1c' },
      { text: `- ${formatCurrency(data.deductions)}`, fontSize: 9, alignment: 'right', color: '#b91c1c' },
    ]);
  }

  if (data.advanceDeducted > 0) {
    tableRows.push([
      { text: '- Staff Advance Recovery Deducted', fontSize: 9, color: '#b45309' },
      { text: `- ${formatCurrency(data.advanceDeducted)}`, fontSize: 9, alignment: 'right', color: '#b45309' },
    ]);
  }

  tableRows.push([
    { text: 'TOTAL NET SALARY DISBURSED', fontSize: 10, bold: true, color: '#0f172a', fillColor: '#f8fafc' },
    { text: formatCurrency(data.netSalary), fontSize: 11, bold: true, alignment: 'right', color: '#15803d', fillColor: '#f8fafc' },
  ]);

  content.push({
    table: {
      widths: ['70%', '30%'],
      body: tableRows,
    },
    margin: [0, 0, 0, 15],
  });

  if (data.remarks) {
    content.push({
      text: `Remarks: ${data.remarks}`,
      fontSize: 8,
      italic: true,
      color: '#64748b',
      margin: [0, 0, 0, 20],
    });
  }

  // 4. Signatures Box
  content.push({
    columns: [
      [
        { text: '________________________', fontSize: 10, color: '#94a3b8' },
        { text: 'Authorized Signatory', fontSize: 9, bold: true, color: '#334155', margin: [0, 2, 0, 0] },
        { text: 'School Administration Office', fontSize: 8, color: '#94a3b8' },
      ],
      [
        { text: '________________________', alignment: 'right', fontSize: 10, color: '#94a3b8' },
        { text: 'Employee Acknowledgement', alignment: 'right', fontSize: 9, bold: true, color: '#334155', margin: [0, 2, 0, 0] },
        { text: 'Payment Received Signature', alignment: 'right', fontSize: 8, color: '#94a3b8' },
      ],
    ],
    margin: [0, 30, 0, 0],
  });

  return {
    content,
    styles: {
      header: { fontSize: 16, bold: true },
      tableHeader: { fontSize: 9, bold: true, padding: 5 },
    },
  };
};
