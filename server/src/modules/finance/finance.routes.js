import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission, requireOwnerOrSchoolAdmin } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import {
  getFinanceOverview,
  getFinancialTransactions,
  getFinancialTransactionById,
  recordOpeningBalance,
  backfillFinanceLedger,
} from './finance.controller.js';

const router = Router();

router.use(authenticate, resolveSchool);

router.get('/overview', requirePermission(PERMISSIONS.EXPENSE_VIEW), getFinanceOverview);
router.get('/transactions', requirePermission(PERMISSIONS.EXPENSE_VIEW), getFinancialTransactions);
router.get('/transactions/:id', requirePermission(PERMISSIONS.EXPENSE_VIEW), getFinancialTransactionById);
router.post('/opening-balance', requireOwnerOrSchoolAdmin(), recordOpeningBalance);
router.post('/backfill', requireOwnerOrSchoolAdmin(), backfillFinanceLedger);

export default router;
