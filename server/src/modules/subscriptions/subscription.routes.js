import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { requireOwnerOrSchoolAdmin } from '../../middleware/permission.middleware.js';
import * as subscriptionController from './subscription.controller.js';

const router = Router();

// Public route for landing page
router.get('/public-plans', subscriptionController.getPublicLandingPlans);
router.get('/public-schools', subscriptionController.getPublicLandingSchools);

// Protected School Admin routes
router.use(authenticate);
router.use(resolveSchool);

// All authenticated school members can read the current subscription status
router.get('/current', subscriptionController.getCurrentSubscription);

// Management / purchase operations restricted to Owner or School Admin
router.use(requireOwnerOrSchoolAdmin('Only the School Owner or School Admin can access subscription management'));

router.get('/plans', subscriptionController.getActivePlans);
router.get('/history', subscriptionController.getSubscriptionHistory);
router.post('/purchase', subscriptionController.submitPurchaseRequest);
router.get('/payments', subscriptionController.getPaymentRequests);

export default router;
