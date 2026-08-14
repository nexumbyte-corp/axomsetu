import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import {
  addFund,
  getFunds,
  getFundById,
  cancelFund,
  createFundSource,
  getFundSources,
  updateFundSource,
  toggleFundSourceStatus,
  deleteFundSource,
} from './fund.controller.js';

const router = Router();

router.use(authenticate, resolveSchool);

// Funds Routes
router.get('/', requirePermission(PERMISSIONS.FUND_VIEW), getFunds);
router.post('/', requirePermission(PERMISSIONS.FUND_CREATE), addFund);
router.get('/:id', requirePermission(PERMISSIONS.FUND_VIEW), getFundById);
router.patch('/:id/cancel', requirePermission(PERMISSIONS.FUND_EDIT), cancelFund);

export default router;

// Export separate sub-router for fund-sources
export const fundSourceRouter = Router();
fundSourceRouter.use(authenticate, resolveSchool);

fundSourceRouter.get('/', requirePermission(PERMISSIONS.FUND_VIEW), getFundSources);
fundSourceRouter.post('/', requirePermission(PERMISSIONS.FUND_CREATE), createFundSource);
fundSourceRouter.put('/:id', requirePermission(PERMISSIONS.FUND_EDIT), updateFundSource);
fundSourceRouter.patch('/:id/status', requirePermission(PERMISSIONS.FUND_EDIT), toggleFundSourceStatus);
fundSourceRouter.delete('/:id', requirePermission(PERMISSIONS.FUND_EDIT), deleteFundSource);
