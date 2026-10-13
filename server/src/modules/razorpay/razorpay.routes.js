import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { resolveSchool } from '../../middleware/school.middleware.js';
import { createOrder, verifyPayment } from './razorpay.controller.js';

export const razorpayRouter = Router();

razorpayRouter.post('/create-order', authenticate, resolveSchool, createOrder);
razorpayRouter.post('/verify-payment', authenticate, resolveSchool, verifyPayment);

export default razorpayRouter;

