import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { COOKIE_NAME } from '../utils/session.js';

/**
 * Robust Client IP Resolver:
 * Correctly resolves client IP whether deployed directly or behind Cloudflare,
 * AWS ALB, Nginx, or any reverse proxy.
 */
export const getClientIp = (req) => {
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) {
    return Array.isArray(cfIp) ? cfIp[0] : cfIp;
  }
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (xForwardedFor) {
    const raw = Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor;
    const firstIp = raw.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

/**
 * Tenant & User-Aware Rate Limit Key Generator:
 * - If user has an authenticated session cookie or Bearer token, rate-limits per individual user session.
 *   This ensures multiple school staff, teachers, and accountants working from the same School Wi-Fi/Office NAT
 *   do NOT share a single rate-limit bucket and never lock each other out during busy admissions or fee counters.
 * - If unauthenticated (anonymous visitors, public landing, bots), rate-limits by client IP.
 */
export const getRateLimitKey = (req) => {
  const sessionToken = req.cookies?.[COOKIE_NAME];
  if (sessionToken) {
    return `sess_${sessionToken.substring(0, 16)}`;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return `jwt_${authHeader.substring(7, 27)}`;
  }
  return `ip_${getClientIp(req)}`;
};

/**
 * Factory helper for standard JSON-formatted rate limiters.
 */
const createLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 600,
    message = 'Too many requests. Please wait a moment and try again.',
    skipSuccessfulRequests = false,
    keyGenerator = getRateLimitKey,
  } = options;

  return rateLimit({
    windowMs,
    max: typeof max === 'function' ? max : (env.NODE_ENV === 'test' ? 50000 : max),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator,
    skipSuccessfulRequests,
    validate: { xForwardedForHeader: false },
    handler: (req, res, _next, opts) => {
      const resetTime = req.rateLimit?.resetTime;
      const retryAfterSeconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : Math.ceil(opts.windowMs / 1000);

      res.status(opts.statusCode).json({
        success: false,
        message: typeof opts.message === 'string' ? opts.message : message,
        code: 'TOO_MANY_REQUESTS',
        retryAfterSeconds,
      });
    },
  });
};

/**
 * 1. Global API Rate Limiter (Dynamic Quota)
 * Applied across all /api endpoints.
 * - Authenticated School Staff: 3,000 requests per 15-minute window (~200 req/min per clerk).
 *   Enables high-frequency sequential admissions, rapid fee collections, and multiple open tabs without throttling.
 * - Anonymous / Public traffic: 400 requests per 15-minute window per IP to stop scrapers and floods.
 */
export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    if (env.NODE_ENV === 'test') return 50000;
    const isAuthenticated = Boolean(req.cookies?.[COOKIE_NAME] || req.headers.authorization);
    return isAuthenticated ? 3000 : 400;
  },
  keyGenerator: getRateLimitKey,
  message: 'Too many requests. Please slow down and try again.',
});

/**
 * 2. Strict Authentication Rate Limiter
 * Applied to login, registration, password changes, and sensitive auth endpoints.
 * Allows 20 attempts per 15-minute window per IP.
 * Skips successful logins so legitimate users are not penalized.
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: getClientIp,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts. Please try again in a few minutes.',
});

/**
 * 3. Payment & Checkout Rate Limiter
 * Applied to Razorpay checkout, verify payment, and subscription purchase requests.
 * Allows 25 requests per 15 minutes per IP.
 */
export const paymentLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Too many payment attempts. Please wait a moment before trying again.',
});

/**
 * 4. Heavy Operations Rate Limiter
 * Applied to resource-intensive operations like exports, bulk promotions, and reports.
 * Allows 40 requests per 1-minute window per IP.
 */
export const heavyOperationsLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: 'Please wait a moment before requesting another report or export.',
});

/**
 * 5. Early-Stage DDoS & Protocol Anomaly Pre-Filter
 * Rejects oversized URLs, header floods, and known automated vulnerability scanners.
 */
export const ddosPreFilter = (req, res, next) => {
  // Guard against URL flood / Buffer overflow
  if (req.originalUrl && req.originalUrl.length > 2048) {
    return res.status(414).json({
      success: false,
      message: 'Request link is too long. Please refresh and try again.',
      code: 'URI_TOO_LONG',
    });
  }

  // Guard against Header Bomb / Header flood
  const headerKeys = Object.keys(req.headers || {});
  if (headerKeys.length > 80) {
    return res.status(431).json({
      success: false,
      message: 'Too much browser data. Please clear cache and refresh.',
      code: 'HEADERS_TOO_LARGE',
    });
  }

  // Block known automated attack probe tools
  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  if (
    userAgent.includes('sqlmap') ||
    userAgent.includes('nikto') ||
    userAgent.includes('masscan') ||
    userAgent.includes('zgrab') ||
    userAgent.includes('acunetix') ||
    userAgent.includes('dirbuster') ||
    userAgent.includes('gobuster')
  ) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted.',
      code: 'FORBIDDEN_TOOL',
    });
  }

  next();
};

export const generalLimiter = globalLimiter;
