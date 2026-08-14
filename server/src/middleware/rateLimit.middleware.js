import rateLimit from 'express-rate-limit';

/**
 * General API Rate Limiter
 * Disabled for general operation (pass-through middleware).
 */
export const generalLimiter = (req, res, next) => next();

/**
 * Strict Rate Limiter for Authentication Endpoints
 * Applied to login, register, and password reset endpoints to mitigate brute force attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 authentication attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.',
  },
});
