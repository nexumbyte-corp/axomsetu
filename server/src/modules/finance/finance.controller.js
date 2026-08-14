import { financialLedgerService } from './financialLedger.service.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';

export const getFinanceOverview = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const overview = await financialLedgerService.getOverview(schoolId, req.query);
  return ApiResponse.success(res, overview, 'Finance overview retrieved successfully');
});

export const getFinancialTransactions = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const result = await financialLedgerService.getTransactions(schoolId, req.query);
  return ApiResponse.success(res, result, 'Financial transactions retrieved successfully');
});

export const getFinancialTransactionById = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const { id } = req.params;
  const txn = await financialLedgerService.getTransactionById(schoolId, id);
  return ApiResponse.success(res, txn, 'Transaction details retrieved successfully');
});

export const recordOpeningBalance = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const userId = req.user?.id;
  const txn = await financialLedgerService.recordOpeningBalance(schoolId, req.body, userId);
  return ApiResponse.success(res, txn, 'Opening balance recorded successfully', 201);
});

export const backfillFinanceLedger = asyncHandler(async (req, res) => {
  const schoolId = req.schoolId || req.user?.schoolId;
  const result = await financialLedgerService.backfillHistoricalLedger(schoolId);
  return ApiResponse.success(res, result, 'Finance ledger backfilled successfully');
});
