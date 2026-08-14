import { Router } from 'express';
import * as authController from './auth.controller.js';
import {
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './auth.validation.js';
import { registerSchoolSchema } from '../schools/school.validation.js';
import { registerSchool } from '../schools/school.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';

const router = Router();

// Public Auth & Registration Endpoints
router.post('/register-school', validate(registerSchoolSchema), registerSchool);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);

// Authenticated Session Endpoints
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;

