import { asyncHandler } from '../../utils/asyncHandler.js';
import { staffService } from './staff.service.js';
import {
  createStaffSchema,
  disburseAdvanceSchema,
  recordSalaryPaymentSchema,
  updateStaffSchema,
} from './staff.validation.js';

export const createStaff = asyncHandler(async (req, res) => {
  const validatedBody = createStaffSchema.parse(req.body);
  const result = await staffService.createStaff(req.schoolId, validatedBody, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Staff member created successfully',
    data: result,
  });
});

export const listStaff = asyncHandler(async (req, res) => {
  const result = await staffService.listStaff(req.schoolId, req.query);

  res.status(200).json({
    success: true,
    message: 'Staff list retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

export const getStaffDetails = asyncHandler(async (req, res) => {
  const result = await staffService.getStaffById(req.schoolId, req.params.staffId);

  res.status(200).json({
    success: true,
    message: 'Staff details retrieved successfully',
    data: result,
  });
});

export const updateStaff = asyncHandler(async (req, res) => {
  const validatedBody = updateStaffSchema.parse(req.body);
  const result = await staffService.updateStaff(req.schoolId, req.params.staffId, validatedBody, req.user?.id);

  res.status(200).json({
    success: true,
    message: 'Staff member updated successfully',
    data: result,
  });
});

export const deleteStaff = asyncHandler(async (req, res) => {
  const result = await staffService.deleteStaff(req.schoolId, req.params.staffId, req.user?.id);

  res.status(200).json({
    success: true,
    message: result.message,
    data: result.staff || null,
  });
});

export const disburseAdvance = asyncHandler(async (req, res) => {
  const validatedBody = disburseAdvanceSchema.parse(req.body);
  const result = await staffService.disburseAdvance(req.schoolId, req.params.staffId, validatedBody, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Advance payment disbursed successfully',
    data: result,
  });
});

export const recordSalaryPayment = asyncHandler(async (req, res) => {
  const validatedBody = recordSalaryPaymentSchema.parse(req.body);
  const result = await staffService.recordSalaryPayment(req.schoolId, validatedBody, req.user?.id);

  res.status(201).json({
    success: true,
    message: 'Salary payment recorded successfully',
    data: result,
  });
});

export const listSalaryPayments = asyncHandler(async (req, res) => {
  const result = await staffService.listSalaryPayments(req.schoolId, req.query);

  res.status(200).json({
    success: true,
    message: 'Salary payments retrieved successfully',
    data: result.data,
    pagination: result.pagination,
  });
});

export const getSalaryPaymentDetails = asyncHandler(async (req, res) => {
  const result = await staffService.getSalaryPaymentById(req.schoolId, req.params.paymentId);

  res.status(200).json({
    success: true,
    message: 'Salary payment details retrieved successfully',
    data: result,
  });
});

export const getPayrollOverview = asyncHandler(async (req, res) => {
  const result = await staffService.getPayrollOverview(req.schoolId);

  res.status(200).json({
    success: true,
    message: 'Payroll overview retrieved successfully',
    data: result,
  });
});

export const getStaffPaidMonths = asyncHandler(async (req, res) => {
  const result = await staffService.getStaffPaidMonths(req.schoolId, req.params.staffId, req.query.year);

  res.status(200).json({
    success: true,
    message: 'Paid months retrieved successfully',
    data: result,
  });
});
