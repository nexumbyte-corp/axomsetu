import { asyncHandler } from '../../utils/asyncHandler.js';
import paymentService from './payment.service.js';
import ledgerService from './ledger.service.js';
import {
  createPaymentSchema,
  paymentParamsSchema,
  voidPaymentSchema,
  ledgerQuerySchema,
  queryPaymentSchema,
  receiptSearchSchema,
} from './payment.validation.js';

export const createPayment = asyncHandler(async (req, res) => {
  const body = createPaymentSchema.parse(req.body);
  const data = await paymentService.collectPayment(req.schoolId, body, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Fee payment collected successfully',
    receiptNumber: data.receiptNumber,
    paymentId: data.paymentId,
    receivedAmount: data.receivedAmount,
    allocatedAmount: data.allocatedAmount,
    chargesPaid: data.chargesPaid,
    data,
  });
});

export const listPayments = asyncHandler(async (req, res) => {
  const query = queryPaymentSchema.parse(req.query);
  const data = await paymentService.getPayments(req.schoolId, query);

  res.status(200).json({
    success: true,
    message: 'Payments retrieved successfully',
    data: data.payments,
    pagination: data.pagination,
  });
});

export const searchReceipts = asyncHandler(async (req, res) => {
  const query = receiptSearchSchema.parse(req.query);
  const data = await paymentService.searchReceipts(req.schoolId, query);

  res.status(200).json({
    success: true,
    message: 'Receipt search results retrieved',
    data: data.data,
    pagination: data.pagination,
  });
});

export const getPaymentDetails = asyncHandler(async (req, res) => {
  const { id } = paymentParamsSchema.parse(req.params);
  const data = await paymentService.getReceipt(req.schoolId, id);

  res.status(200).json({
    success: true,
    message: 'Payment receipt details retrieved successfully',
    data,
  });
});

export const getReceiptReprint = asyncHandler(async (req, res) => {
  const { id } = paymentParamsSchema.parse(req.params);
  const data = await paymentService.getReceiptReprint(req.schoolId, id, req.user?.id);

  res.status(200).json({
    success: true,
    message: 'Receipt reprint data generated successfully',
    data,
  });
});

export const voidPayment = asyncHandler(async (req, res) => {
  const { id } = paymentParamsSchema.parse(req.params);
  const { reason } = voidPaymentSchema.parse(req.body);
  const data = await paymentService.voidPayment(req.schoolId, id, { reason }, req.user?.id);

  res.status(200).json({
    success: true,
    message: data.message || 'Receipt voided successfully',
    data,
  });
});

export const getDashboardSummary = asyncHandler(async (req, res) => {
  const query = queryPaymentSchema.parse(req.query);
  const data = await paymentService.getDashboardSummary(req.schoolId, query);

  res.status(200).json({
    success: true,
    message: 'Financial dashboard summary retrieved successfully',
    data,
  });
});

export const getStudentPayments = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const data = await paymentService.getStudentPayments(req.schoolId, studentId);

  res.status(200).json({
    success: true,
    message: 'Student payment history retrieved successfully',
    data,
  });
});

export const getStudentOutstanding = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const data = await paymentService.getStudentOutstanding(req.schoolId, studentId);

  res.status(200).json({
    success: true,
    message: 'Student outstanding dues retrieved successfully',
    data,
  });
});

export const getStudentLedger = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const query = ledgerQuerySchema.parse(req.query);
  const data = await ledgerService.getStudentLedger(req.schoolId, studentId, query);

  res.status(200).json({
    success: true,
    message: 'Student ledger retrieved successfully',
    data,
  });
});

export const deleteUnpaidFeeCharge = asyncHandler(async (req, res) => {
  const { chargeId } = req.params;
  const data = await paymentService.deleteUnpaidFeeCharge(req.schoolId, chargeId, req.user?.id);

  res.status(200).json({
    success: true,
    message: data.message || 'Unpaid fee charge deleted successfully',
    data,
  });
});
