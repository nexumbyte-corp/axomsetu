import { expenseService } from './expense.service.js';
import { expenseCategoryService } from './expenseCategory.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import {
  createExpenseSchema,
  cancelExpenseSchema,
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
} from './expense.validation.js';

// Expense Handlers
export const createExpense = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const userId = req.user?.id;
  const validatedBody = createExpenseSchema.parse(req.body);
  const result = await expenseService.createExpense(schoolId, validatedBody, userId);
  return ApiResponse.success(res, result, 'Expense recorded successfully', 201);
});

export const getExpenses = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const result = await expenseService.getExpenses(schoolId, req.query);
  return ApiResponse.success(res, result, 'Expenses retrieved successfully');
});

export const getExpenseById = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const expense = await expenseService.getExpenseById(schoolId, id);
  return ApiResponse.success(res, expense, 'Expense details retrieved successfully');
});

export const cancelExpense = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const userId = req.user?.id;
  const { reason } = cancelExpenseSchema.parse(req.body || {});
  const result = await expenseService.cancelExpense(schoolId, id, reason, userId);
  return ApiResponse.success(res, result, 'Expense cancelled successfully');
});

// Category Handlers
export const createExpenseCategory = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const validatedBody = createExpenseCategorySchema.parse(req.body);
  const category = await expenseCategoryService.createCategory(schoolId, validatedBody);
  return ApiResponse.success(res, category, 'Expense category created successfully', 201);
});

export const getExpenseCategories = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const categories = await expenseCategoryService.getCategories(schoolId, req.query);
  return ApiResponse.success(res, categories, 'Expense categories retrieved successfully');
});

export const updateExpenseCategory = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const validatedBody = updateExpenseCategorySchema.parse(req.body);
  const category = await expenseCategoryService.updateCategory(schoolId, id, validatedBody);
  return ApiResponse.success(res, category, 'Expense category updated successfully');
});

export const toggleExpenseCategoryStatus = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    throw ApiError.badRequest('isActive must be a boolean');
  }
  const category = await expenseCategoryService.toggleCategoryStatus(schoolId, id, isActive);
  return ApiResponse.success(res, category, 'Category status updated successfully');
});

export const deleteExpenseCategory = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const result = await expenseCategoryService.deleteCategory(schoolId, id);
  return ApiResponse.success(res, result, 'Category action processed successfully');
});
