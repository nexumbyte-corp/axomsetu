import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import * as adminSubscriptionController from './adminSubscription.controller.js';

const router = Router();

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN'));

// Plans Management
router.get('/plans', adminSubscriptionController.listPlans);
router.post('/plans', adminSubscriptionController.createPlan);
router.patch('/plans/:id', adminSubscriptionController.updatePlan);
router.patch('/plans/:id/status', adminSubscriptionController.togglePlanStatus);
router.delete('/plans/:id', adminSubscriptionController.deletePlan);

// Subscriptions & Payments Management
router.get('/', adminSubscriptionController.listSubscriptions);
router.post('/manual', adminSubscriptionController.createManualSubscription);
router.patch('/:id/status', adminSubscriptionController.updateSubscriptionStatus);
router.post('/:id/expire', adminSubscriptionController.expireSubscription);
router.post('/:id/extend', adminSubscriptionController.extendSubscription);

router.get('/payments/pending', adminSubscriptionController.listPendingPayments);
router.post('/payments/:id/approve', adminSubscriptionController.approvePayment);
router.post('/payments/:id/reject', adminSubscriptionController.rejectPayment);

export default router;
