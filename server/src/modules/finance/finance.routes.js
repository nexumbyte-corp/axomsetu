import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import {
  getFinanceOverview,
  getFinancialTransactions,
  getFinancialTransactionById,
  recordOpeningBalance,
  backfillFinanceLedger,
} from './finance.controller.js';

const router = Router();

router.use(authenticate, resolveSchool);

router.get('/overview', getFinanceOverview);
router.get('/transactions', getFinancialTransactions);
router.get('/transactions/:id', getFinancialTransactionById);
router.post('/opening-balance', recordOpeningBalance);
router.post('/backfill', backfillFinanceLedger);

export default router;
