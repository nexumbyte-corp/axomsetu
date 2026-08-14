import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requirePermission } from '../../middleware/permission.middleware.js';
import { PERMISSIONS } from '../../config/permissions.js';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  cancelExpense,
  createExpenseCategory,
  getExpenseCategories,
  updateExpenseCategory,
  toggleExpenseCategoryStatus,
  deleteExpenseCategory,
} from './expense.controller.js';

const router = Router();

router.use(authenticate, resolveSchool);

// Expenses Routes
router.get('/', requirePermission(PERMISSIONS.EXPENSE_VIEW), getExpenses);
router.post('/', requirePermission(PERMISSIONS.EXPENSE_CREATE), createExpense);
router.get('/:id', requirePermission(PERMISSIONS.EXPENSE_VIEW), getExpenseById);
router.patch('/:id/cancel', requirePermission(PERMISSIONS.EXPENSE_DELETE), cancelExpense);

export default router;

// Export separate sub-router for categories
export const categoryRouter = Router();
categoryRouter.use(authenticate, resolveSchool);

categoryRouter.get('/', requirePermission(PERMISSIONS.EXPENSE_VIEW), getExpenseCategories);
categoryRouter.post('/', requirePermission(PERMISSIONS.EXPENSE_CREATE), createExpenseCategory);
categoryRouter.put('/:id', requirePermission(PERMISSIONS.EXPENSE_EDIT), updateExpenseCategory);
categoryRouter.patch('/:id/status', requirePermission(PERMISSIONS.EXPENSE_EDIT), toggleExpenseCategoryStatus);
categoryRouter.delete('/:id', requirePermission(PERMISSIONS.EXPENSE_DELETE), deleteExpenseCategory);
