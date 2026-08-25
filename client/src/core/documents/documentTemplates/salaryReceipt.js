import { createPDFHeader } from '../common/header.js';
import { formatDocDate } from '../common/formatters.js';

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
    voucherNo: rawData.paymentNumber || 'SDV-VOUCHER',
    paymentDate: formatDocDate(rawData.paymentDate),
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
    allocations: allocations.map((a) => {
      const s = a.settlement || {};
      const mp = a.monthlyPayroll || {};
      const salaryDue = s.salaryDue !== undefined ? s.salaryDue : Number(mp.netSalary || 0);
      const currentDisbursement = s.currentDisbursement !== undefined ? s.currentDisbursement : Number(a.allocatedAmount || 0);
      const previouslyPaid = s.previouslyPaid !== undefined ? s.previouslyPaid : Math.max(0, Number(mp.paidAmount || 0) - currentDisbursement);
      const totalPaid = s.totalPaid !== undefined ? s.totalPaid : (previouslyPaid + currentDisbursement);
      const remainingUnpaid = s.remainingUnpaid !== undefined ? s.remainingUnpaid : Math.max(0, salaryDue - totalPaid);
      const status = s.status || (remainingUnpaid <= 0.01 ? 'PAID' : (totalPaid > 0 ? 'PARTIALLY PAID' : 'UNPAID'));

      return {
        month: mp.month || '',
        year: mp.year || rawData.year,
        salaryDue,
        previouslyPaid,
        currentDisbursement,
        totalPaid,
        remainingUnpaid,
        status,
      };
    }),
  };
};

/**
 * pdfMake Template Builder for Salary Disbursement Voucher
 */
export const buildSalaryReceiptTemplate = (data, _settings = {}) => {
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
            borderColor: ['#475569', '#475569', '#475569', '#475569'],
            margin: [8, 8, 8, 8],
            stack: [
              { text: 'STAFF DETAILS', fontSize: 9, bold: true, color: '#475569', margin: [0, 0, 0, 4] },
              { text: data.staffName, fontSize: 11, bold: true, color: '#0f172a' },
              { text: `Employee Code: ${data.employeeId}`, fontSize: 9, color: '#334155' },
              { text: `Department: ${data.department}`, fontSize: 9, color: '#334155' },
              { text: `Designation: ${data.designation}`, fontSize: 9, color: '#334155' },
              { text: `Base Salary (Original): ${formatCurrency(data.baseSalary)} / mo`, fontSize: 9, bold: true, color: '#4f46e5', margin: [0, 2, 0, 0] },
              data.bankAccountNo ? { text: `Bank: ${data.bankName} (${data.bankAccountNo})`, fontSize: 8, color: '#64748b', margin: [0, 2, 0, 0] } : {},
            ],
          },
          {
            fillColor: '#f8fafc',
            borderColor: ['#475569', '#475569', '#475569', '#475569'],
            margin: [8, 8, 8, 8],
            stack: [
              { text: 'SALARY DISBURSEMENT INFO', fontSize: 9, bold: true, color: '#475569', margin: [0, 0, 0, 4] },
              { text: `Salary Period: ${data.monthsText} ${data.year}`, fontSize: 10, bold: true, color: '#4f46e5' },
              { text: `Payment Date: ${data.paymentDate}`, fontSize: 9, color: '#334155' },
              { text: `Payment Method: ${data.paymentMode}`, fontSize: 9, color: '#334155' },
              { text: `Reference No: ${data.referenceNo}`, fontSize: 9, color: '#334155' },
            ],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: () => 1,
      vLineWidth: () => 1,
      hLineColor: () => '#475569',
      vLineColor: () => '#475569',
    },
    margin: [0, 0, 0, 15],
  });

  // 3. Payment Settlement Summary Table (Core Partial Payment Voucher Breakdown)
  const allocItems = data.allocations.length > 0 ? data.allocations : [{
    month: data.monthsText,
    year: data.year,
    salaryDue: data.baseSalary + data.allowances - data.deductions - data.advanceDeducted,
    previouslyPaid: 0,
    currentDisbursement: data.netSalary,
    totalPaid: data.netSalary,
    remainingUnpaid: 0,
    status: 'PAID',
  }];

  for (const item of allocItems) {
    const summaryRows = [
      [
        { text: 'SALARY SETTLEMENT SUMMARY', style: 'tableHeader', bold: true, fillColor: '#f1f5f9', color: '#0f172a', colSpan: 2 },
        {},
      ],
      [
        { text: `Original Salary Due (${item.month} ${item.year})`, fontSize: 9, color: '#334155', bold: true },
        { text: formatCurrency(item.salaryDue), fontSize: 9, alignment: 'right', color: '#0f172a', bold: true },
      ],
    ];

    if (data.advanceDeducted > 0) {
      summaryRows.push([
        { text: '(-) Advance Payment Adjustment / Recovery', fontSize: 9, bold: true, color: '#b45309', fillColor: '#fffbeb' },
        { text: `- ${formatCurrency(data.advanceDeducted)}`, fontSize: 9, bold: true, alignment: 'right', color: '#b45309', fillColor: '#fffbeb' },
      ]);
    }

    summaryRows.push(
      [
        { text: '(-) Previously Paid', fontSize: 9, color: '#475569' },
        { text: formatCurrency(item.previouslyPaid), fontSize: 9, alignment: 'right', color: '#475569' },
      ],
      [
        { text: '(+) Current Disbursement / Payment', fontSize: 9.5, bold: true, color: '#15803d', fillColor: '#f0fdf4' },
        { text: formatCurrency(item.currentDisbursement), fontSize: 10, bold: true, alignment: 'right', color: '#15803d', fillColor: '#f0fdf4' },
      ],
      [
        { text: '(=) Total Paid to Date', fontSize: 9, bold: true, color: '#0f172a', fillColor: '#f8fafc' },
        { text: formatCurrency(item.totalPaid), fontSize: 9, bold: true, alignment: 'right', color: '#0f172a', fillColor: '#f8fafc' },
      ],
      [
        { text: '(=) Remaining Unpaid Salary', fontSize: 9.5, bold: true, color: item.remainingUnpaid > 0 ? '#b91c1c' : '#15803d', fillColor: item.remainingUnpaid > 0 ? '#fef2f2' : '#f0fdf4' },
        { text: formatCurrency(item.remainingUnpaid), fontSize: 10, bold: true, alignment: 'right', color: item.remainingUnpaid > 0 ? '#b91c1c' : '#15803d', fillColor: item.remainingUnpaid > 0 ? '#fef2f2' : '#f0fdf4' },
      ],
      [
        { text: 'Payment Status', fontSize: 9, bold: true, color: '#334155' },
        { text: item.status, fontSize: 9.5, bold: true, alignment: 'right', color: item.status === 'PAID' ? '#15803d' : '#b45309' },
      ]
    );

    content.push({
      table: {
        widths: ['65%', '35%'],
        body: summaryRows,
      },
      margin: [0, 0, 0, 15],
    });
  }

  if (data.remarks) {
    content.push({
      text: `Remarks: ${data.remarks}`,
      fontSize: 8,
      italic: true,
      color: '#64748b',
      margin: [0, 0, 0, 15],
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
        { text: 'Staff Signature', alignment: 'right', fontSize: 9, bold: true, color: '#334155', margin: [0, 2, 0, 0] },
        { text: 'Payment Received Acknowledgement', alignment: 'right', fontSize: 8, color: '#94a3b8' },
      ],
    ],
    margin: [0, 25, 0, 0],
  });

  return {
    content,
    styles: {
      header: { fontSize: 16, bold: true },
      tableHeader: { fontSize: 9, bold: true, padding: 5 },
    },
  };
};
