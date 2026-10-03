import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/prisma.js';
import { memoryCache } from '../utils/cache.js';
import { authenticate } from './auth.middleware.js';
import { resolveSchool } from './school.middleware.js';

/**
 * Centralized Subscription Access Guard.
 * Enforces school subscription status at backend API level.
 * Rejects operational requests (read and write) if school has no active subscription.
 * Bypasses Super Admin.
 * Uses 30-second in-memory caching to eliminate redundant DB lookups on high-frequency operational routes.
 */
export const requireActiveSubscription = asyncHandler(async (req, res, next) => {
  // Ensure user authentication if not already performed
  if (!req.user) {
    await new Promise((resolve, reject) => {
      authenticate(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  // Super Admin bypass
  if (req.user && req.user.role === 'SUPER_ADMIN') {
    return next();
  }

  // Ensure school tenant context if not already resolved
  if (!req.schoolId) {
    await new Promise((resolve, reject) => {
      resolveSchool(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  if (!req.schoolId) {
    throw ApiError.forbidden('School tenant context required');
  }

  // Lookup latest subscription for the school with high-performance memory cache (30s TTL)
  const cacheKey = `subscription:guard:${req.schoolId}`;
  const latestSubscription = await memoryCache.getOrSet(
    cacheKey,
    async () => {
      const sub = await prisma.schoolSubscription.findFirst({
        where: { schoolId: req.schoolId },
        select: {
          id: true,
          status: true,
          endDate: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return sub || { status: 'NO_SUBSCRIPTION', endDate: null };
    },
    30
  );

  if (!latestSubscription || latestSubscription.status === 'NO_SUBSCRIPTION') {
    throw ApiError.forbidden(
      'Your school does not have an active subscription. Operational features are restricted until a subscription is activated.'
    );
  }

  const now = new Date();
  const isExpiredByDate = latestSubscription.endDate ? new Date(latestSubscription.endDate) < now : true;
  const isNotActiveStatus = latestSubscription.status !== 'ACTIVE';

  if (isNotActiveStatus || isExpiredByDate) {
    const statusMsg =
      latestSubscription.status === 'EXPIRED' || isExpiredByDate
        ? 'expired'
        : String(latestSubscription.status).toLowerCase();
    throw ApiError.forbidden(
      `Your school subscription is ${statusMsg}. Operational modules (students, staff, fees, finance, reports, etc.) are restricted until an active subscription is restored.`
    );
  }

  next();
});

