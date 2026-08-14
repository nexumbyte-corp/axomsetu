import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requireRole } from '../../middleware/role.middleware.js';
import * as subscriptionController from './subscription.controller.js';

const router = Router();

// Public route for landing page
router.get('/public-plans', subscriptionController.getPublicLandingPlans);
router.get('/public-schools', subscriptionController.getPublicLandingSchools);

// Protected School Admin routes
router.use(authenticate);
router.use(resolveSchool);
router.use(requireRole('SCHOOL_ADMIN', 'SUPER_ADMIN'));

router.get('/current', subscriptionController.getCurrentSubscription);
router.get('/plans', subscriptionController.getActivePlans);
router.get('/history', subscriptionController.getSubscriptionHistory);
router.post('/purchase', subscriptionController.submitPurchaseRequest);
router.get('/payments', subscriptionController.getPaymentRequests);

export default router;
