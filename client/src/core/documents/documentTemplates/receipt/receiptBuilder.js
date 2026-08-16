import { amountToWords } from '../../../../utils/numberToWords.js';
import { formatFeeMonthYear } from '../../common/formatters.js';

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

  const formattedAllocations = (payment.allocations || []).map((alloc) => ({
    title: alloc.title || alloc.chargeTitle || 'Fee Head',
    feeType: alloc.feeType?.name || '',
    month: formatFeeMonthYear(
      alloc.month,
      alloc.year || alloc.charge?.year,
      payment.academicYear?.name || payment.academicYear || payment.paymentDate
    ),
    chargeAmount: `₹${Number(alloc.chargeAmount || alloc.amount || 0).toFixed(2)}`,
    allocatedAmount: `₹${Number(alloc.allocatedAmount || 0).toFixed(2)}`,
    status: alloc.chargeStatus || 'ALLOCATED',
  }));

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
    paymentDate: payment.paymentDate
      ? new Date(payment.paymentDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '—',
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
