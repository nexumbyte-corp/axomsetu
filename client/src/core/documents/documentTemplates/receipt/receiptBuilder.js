import { amountToWords } from '../../../../utils/numberToWords.js';
import { formatFeeMonthYear, formatDocDate } from '../../common/formatters.js';

/**
 * Receipt Builder Data Transformer.
 * Converts raw backend JSON into normalized template-ready data.
 * Pure data transformation — no rendering or business calculations here.
 */
export const buildReceiptData = (rawBackendData = {}) => {
  const payment = rawBackendData.data || rawBackendData.payment || rawBackendData;
  const school = payment.schoolHeader || rawBackendData.schoolHeader || {};

  const activeEnrollment =
    payment.student?.enrollments?.find((e) => e.status === 'ACTIVE') ||
    payment.student?.enrollments?.[0] ||
    payment.student?.enrollment;

  const rawClassName = activeEnrollment?.class?.name || '';
  const className = rawClassName
    ? rawClassName.startsWith('Class')
      ? rawClassName
      : `Class ${rawClassName}`
    : 'N/A';
  const sectionName = activeEnrollment?.section?.name ? `(${activeEnrollment.section.name})` : '';
  const streamName = activeEnrollment?.stream?.name ? `— ${activeEnrollment.stream.name}` : '';
  const mediumName = activeEnrollment?.medium?.name ? `[${activeEnrollment.medium.name} Medium]` : '';
  const rollNoDisplay = activeEnrollment?.rollNo ? ` | Roll No: ${activeEnrollment.rollNo}` : '';

  const fullClassDisplay = [
    className !== 'N/A' ? `${className} ${sectionName}`.trim() : 'N/A',
    streamName,
    mediumName,
    rollNoDisplay,
  ]
    .filter(Boolean)
    .join(' ');

  const receivedAmount = Number(payment.receivedAmount || 0);

  const formattedAllocations = (payment.allocations || []).map((alloc) => {
    const chargeAmt = Number(alloc.chargeAmount || alloc.originalAmount || alloc.amount || 0);
    const prevPaidAmt = Number(
      alloc.previouslyPaidAmount !== undefined
        ? alloc.previouslyPaidAmount
        : alloc.paidAmount !== undefined && alloc.allocatedAmount !== undefined
        ? Math.max(0, alloc.paidAmount - alloc.allocatedAmount)
        : 0
    );
    const paidAmt = Number(alloc.paidNowAmount !== undefined ? alloc.paidNowAmount : alloc.allocatedAmount !== undefined ? alloc.allocatedAmount : alloc.paidAmount || 0);
    const remainingAmt = alloc.remainingBalance !== undefined
      ? Number(alloc.remainingBalance)
      : alloc.remainingAmount !== undefined
      ? Number(alloc.remainingAmount)
      : Math.max(0, chargeAmt - (prevPaidAmt + paidAmt));

    return {
      title: alloc.title || alloc.chargeTitle || alloc.charge?.title || 'Fee Head',
      feeType: alloc.feeType?.name || alloc.charge?.feeType?.name || '',
      month: formatFeeMonthYear(
        alloc.month || alloc.charge?.month,
        alloc.year || alloc.charge?.year,
        payment.academicYear?.name || payment.academicYear || payment.paymentDate
      ),
      chargeAmount: `₹${chargeAmt.toFixed(2)}`,
      previouslyPaidAmount: `₹${prevPaidAmt.toFixed(2)}`,
      paidAmount: `₹${paidAmt.toFixed(2)}`,
      allocatedAmount: `₹${paidAmt.toFixed(2)}`,
      remainingAmount: `₹${remainingAmt.toFixed(2)}`,
      status: alloc.chargeStatus || alloc.charge?.status || 'PAID',
    };
  });

  return {
    school: {
      name: school.name || 'SCHOOL WORKSPACE',
      address: school.address || 'Official School Campus',
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
    receiptNumber: payment.receiptNumber || 'RCPT-000000',
    status: payment.status || 'SUCCESS',
    paymentDate: formatDocDate(payment.paymentDate, '—'),
    paymentMode: payment.paymentMode || 'CASH',
    referenceNumber: payment.referenceNumber || '—',
    cashierName: payment.receivedBy?.name || 'Authorized Cashier',
    remarks: payment.remarks || '',

    student: {
      name: payment.student?.name || 'N/A',
      admissionNo: payment.student?.admissionNo || 'N/A',
      classSection: fullClassDisplay,
      guardianName: payment.student?.guardianName || 'N/A',
      phone: payment.student?.phone || 'N/A',
    },

    allocations: formattedAllocations,
    receivedAmountNumber: receivedAmount,
    receivedAmountFormatted: `₹${receivedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    amountInWords: amountToWords(receivedAmount),
  };
};

export default buildReceiptData;
