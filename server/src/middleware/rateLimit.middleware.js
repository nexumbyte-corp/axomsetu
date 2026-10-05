import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { COOKIE_NAME, hashSessionToken } from '../utils/session.js';
import { getClientIp as resolveClientIp } from '../utils/ipHelper.js';

/**
 * Universal client IP resolver for rate limiting
 */
export const getClientIp = (req) => resolveClientIp(req, '127.0.0.1');

/**
 * Fast in-memory session identity cache:
 * Maps sessionTokenHash -> { userId, schoolId, expiresAt }
 * Avoids repeated synchronous DB lookups in the rate-limiting hot path.
 */
export const sessionIdentityCache = new Map();

/**
 * Sets session identity in cache
 * @param {string} tokenHash
 * @param {{ userId: string, schoolId?: string|null, expiresAt?: number|Date }} identity
 */
export const setSessionIdentity = (tokenHash, identity) => {
    if (!tokenHash || !identity) return;
    const expiresAt = identity.expiresAt instanceof Date
        ? identity.expiresAt.getTime()
        : (typeof identity.expiresAt === 'number' ? identity.expiresAt : Date.now() + 7 * 86400 * 1000);

    sessionIdentityCache.set(tokenHash, {
        userId: identity.userId,
        schoolId: identity.schoolId || null,
        expiresAt,
    });
};

/**
 * Retrieves session identity from cache if not expired
 * @param {string} tokenHash
 * @returns {{ userId: string, schoolId: string|null }|null}
 */
export const getSessionIdentity = (tokenHash) => {
    if (!tokenHash) return null;
    const entry = sessionIdentityCache.get(tokenHash);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
        sessionIdentityCache.delete(tokenHash);
        return null;
    }
    return entry;
};

/**
 * Removes session from cache (e.g. on logout)
 * @param {string} tokenHash
 */
export const clearSessionIdentity = (tokenHash) => {
    if (tokenHash) {
        sessionIdentityCache.delete(tokenHash);
    }
};

/**
 * Sanitizes key fragments to prevent delimiter injection and key collisions
 * Replaces colons, spaces, and wildcard characters with underscores.
 * @param {any} val
 * @param {string} [defaultVal='unknown']
 * @returns {string}
 */
export const cleanKeyPart = (val, defaultVal = 'unknown') => {
    if (val === null || val === undefined) return defaultVal;
    const str = String(val).trim();
    if (!str) return defaultVal;
    const cleaned = str.replace(/[:\s*?#]+/g, '_');
    return cleaned || defaultVal;
};

/**
 * Resolves the tenant / school identifier from request:
 * 1. req.schoolId (set by middleware/context)
 * 2. Header 'x-school-id' or 'x-tenant-id'
 * 3. req.session?.schoolId or req.user?.schoolId
 * 4. Session identity cache (from session cookie)
 * 5. Route parameter :schoolId or Query parameter schoolId
 * 6. Subdomain tenant (e.g. schoolA.axomsetu.com)
 * 7. Fallback: 'public'
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export const resolveSchoolId = (req) => {
    if (!req) return 'public';

    // 1. Explicitly attached to request context
    if (req.schoolId) return String(req.schoolId);

    // 2. Explicit tenant header (from frontend client or mobile app)
    const headerSchool = req.headers?.['x-school-id'] || req.headers?.['x-tenant-id'];
    if (headerSchool) {
        const raw = Array.isArray(headerSchool) ? headerSchool[0] : headerSchool;
        if (raw && raw.trim()) return raw.trim();
    }

    // 3. User session or user membership
    if (req.session?.schoolId) return String(req.session.schoolId);
    if (req.user?.schoolId) return String(req.user.schoolId);

    // 4. Session token cache lookup
    const sessionToken = req.cookies?.[COOKIE_NAME];
    if (sessionToken) {
        const tokenHash = hashSessionToken(sessionToken);
        const cached = getSessionIdentity(tokenHash);
        if (cached?.schoolId) return String(cached.schoolId);
    }

    // 5. Route params or query params (e.g. /api/v1/schools/:schoolId)
    if (req.params?.schoolId) return String(req.params.schoolId);
    if (req.query?.schoolId) return String(req.query.schoolId);

    // 6. Subdomain tenant (e.g. school1.axomsetu.com)
    const host = req.headers?.host || '';
    const hostParts = host.split(':')[0].split('.');
    if (hostParts.length > 2) {
        const sub = hostParts[0].toLowerCase();
        if (sub !== 'api' && sub !== 'www' && sub !== 'admin' && sub !== 'app' && sub !== 'localhost') {
            return sub;
        }
    }

    return 'public';
};

/**
 * Resolves the authenticated user identifier from request:
 * 1. req.user?.id
 * 2. req.session?.userId
 * 3. Session identity cache
 * 4. Bearer JWT payload (decoded without signature overhead)
 * 5. Fallback: 'anon'
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export const resolveUserId = (req) => {
    if (!req) return 'anon';

    // 1. Explicitly authenticated user on req
    if (req.user?.id) return String(req.user.id);
    if (req.session?.userId) return String(req.session.userId);

    // 2. Session token cache lookup
    const sessionToken = req.cookies?.[COOKIE_NAME];
    if (sessionToken) {
        const tokenHash = hashSessionToken(sessionToken);
        const cached = getSessionIdentity(tokenHash);
        if (cached?.userId) return String(cached.userId);
    }

    // 3. Bearer token decode (JWT payload)
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const rawToken = authHeader.substring(7).trim();
        try {
            const decoded = jwt.decode(rawToken);
            if (decoded && decoded.userId) return String(decoded.userId);
            if (decoded && decoded.id) return String(decoded.id);
        } catch {
            // Ignore decode error
        }
    }

    return 'anon';
};

/**
 * Resolves the client / device identifier from request:
 * 1. Header 'x-device-id' or 'x-client-id' (hardware / client UUID)
 * 2. Cookie 'axomsetu_device_id'
 * 3. Authenticated session token hash (each login is isolated per device)
 * 4. Authenticated Bearer token hash
 * 5. Fallback: Client IP
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export const resolveDeviceId = (req) => {
    if (!req) return 'dev_unknown';

    // 1. Preferred: Client-provided device/hardware ID header
    const devHeader = req.headers?.['x-device-id'] || req.headers?.['x-client-id'];
    if (devHeader) {
        const raw = Array.isArray(devHeader) ? devHeader[0] : devHeader;
        if (raw && raw.trim()) return `dev_${cleanKeyPart(raw.trim())}`;
    }

    // 2. Cookie device ID
    const devCookie = req.cookies?.['axomsetu_device_id'];
    if (devCookie && typeof devCookie === 'string' && devCookie.trim()) {
        return `dev_${cleanKeyPart(devCookie.trim())}`;
    }

    // 3. Authenticated session token identifier:
    // Each browser login session is distinct per device/window!
    const sessionToken = req.cookies?.[COOKIE_NAME];
    if (sessionToken) {
        const tokenHash = hashSessionToken(sessionToken);
        return `sess_${tokenHash.substring(0, 16)}`;
    }

    // 4. Authenticated Bearer token
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
        const rawToken = authHeader.substring(7).trim();
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        return `jwt_${tokenHash.substring(0, 16)}`;
    }

    // 5. Unauthenticated fallback: Client IP
    const clientIp = getClientIp(req);
    return `ip_${cleanKeyPart(clientIp, '127.0.0.1')}`;
};

/**
 * Generates the fully namespaced, collision-free rate-limit key:
 * rate_limit:{schoolId}:{userId}:{deviceId}:{endpointGroup}
 *
 * Examples:
 * - School A + Device 1: rate_limit:sch_a:usr_1:dev_1:global
 * - School A + Device 2: rate_limit:sch_a:usr_1:dev_2:global
 * - School B + Device 1: rate_limit:sch_b:usr_1:dev_1:global
 * - Unauthenticated:    rate_limit:public:anon:ip_103_21_244_2:auth
 *
 * @param {import('express').Request} req
 * @param {string} [endpointGroup='global']
 * @returns {string}
 */
export const resolveRateLimitKey = (req, endpointGroup = 'global') => {
    const schoolId = cleanKeyPart(resolveSchoolId(req), 'public');
    const userId = cleanKeyPart(resolveUserId(req), 'anon');
    const deviceId = cleanKeyPart(resolveDeviceId(req), 'dev_unknown');
    const group = cleanKeyPart(endpointGroup, 'global');

    return `rate_limit:${schoolId}:${userId}:${deviceId}:${group}`;
};

/**
 * Tenant & User-Aware Rate Limit Key Generator (Backward-compatible default)
 */
export const getRateLimitKey = (req) => resolveRateLimitKey(req, 'global');

/**
 * Atomic in-memory rate-limit store with automatic background TTL expiration.
 * Compliant with express-rate-limit Store interface.
 * Ensures concurrent requests are counted safely and expired records are evicted.
 */
export class TenantMemoryStore {
    /**
     * @param {number} [cleanupIntervalMs=30000] Interval in ms for clearing expired buckets
     */
    constructor(cleanupIntervalMs = 30000) {
        this.hits = new Map(); // key -> { totalHits: number, resetTime: Date }
        this.windowMs = 15 * 60 * 1000;
        this.cleanupIntervalMs = cleanupIntervalMs;

        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.cleanupIntervalMs);

        if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
            this.cleanupTimer.unref();
        }
    }

    /**
     * Initializes store with rate limiter options
     * @param {{ windowMs: number }} options
     */
    init(options) {
        if (options && options.windowMs) {
            this.windowMs = options.windowMs;
        }
    }

    /**
     * Atomically increments the hit counter for a key.
     * If the window has expired or the key doesn't exist, resets the counter.
     * @param {string} key
     * @returns {Promise<{ totalHits: number, resetTime: Date }>}
     */
    async increment(key) {
        const now = Date.now();
        let record = this.hits.get(key);

        if (!record || now >= record.resetTime.getTime()) {
            const resetTime = new Date(now + this.windowMs);
            record = { totalHits: 1, resetTime };
            this.hits.set(key, record);
            return { totalHits: 1, resetTime };
        }

        record.totalHits += 1;
        return { totalHits: record.totalHits, resetTime: record.resetTime };
    }

    /**
     * Decrements the hit counter for a key (used by skipSuccessfulRequests).
     * @param {string} key
     */
    async decrement(key) {
        const record = this.hits.get(key);
        if (record && record.totalHits > 0) {
            record.totalHits -= 1;
        }
    }

    /**
     * Resets the hit counter for a specific key.
     * @param {string} key
     */
    async resetKey(key) {
        this.hits.delete(key);
    }

    /**
     * Resets all keys in the store.
     */
    async resetAll() {
        this.hits.clear();
    }

    /**
     * Gets current hit count and reset time for a key without incrementing.
     * @param {string} key
     * @returns {Promise<{ totalHits: number, resetTime: Date } | undefined>}
     */
    async get(key) {
        const now = Date.now();
        const record = this.hits.get(key);
        if (!record || now >= record.resetTime.getTime()) {
            if (record) this.hits.delete(key);
            return undefined;
        }
        return record;
    }

    /**
     * Evicts all expired records from memory.
     */
    cleanup() {
        const now = Date.now();
        for (const [key, record] of this.hits.entries()) {
            if (now >= record.resetTime.getTime()) {
                this.hits.delete(key);
            }
        }
    }

    /**
     * Destroys the background cleanup timer and clears the store.
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.hits.clear();
    }
}

/**
 * Shared in-memory store instance
 */
export const defaultTenantStore = new TenantMemoryStore();

/**
 * Factory helper for creating tenant- and device-isolated rate limiters.
 *
 * @param {Object} options
 * @param {string} [options.endpointGroup='global'] Logical group or endpoint name
 * @param {number} [options.windowMs=900000] Time window in milliseconds (default: 15m)
 * @param {number|Function} [options.max=600] Max allowed hits per window
 * @param {string} [options.message] User-friendly rate limit message
 * @param {boolean} [options.skipSuccessfulRequests=false]
 * @param {Object} [options.store] Store implementation (defaults to TenantMemoryStore)
 * @param {Function} [options.keyGenerator] Custom key generator
 * @returns {import('express').RequestHandler}
 */
export const createLimiter = (options = {}) => {
    const {
        endpointGroup = 'global',
        windowMs = 15 * 60 * 1000,
        max = 600,
        message = 'Too many requests. Please wait a moment and try again.',
        skipSuccessfulRequests = false,
        store = new TenantMemoryStore(),
        keyGenerator = (req) => resolveRateLimitKey(req, endpointGroup),
    } = options;

    return rateLimit({
        windowMs,
        max: (req) => {
            if (typeof max === 'function') {
                return max(req);
            }
            return max;
        },
        message,
        standardHeaders: 'draft-6', // Sets RateLimit-Policy, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
        legacyHeaders: true,        // Sets X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
        keyGenerator,
        store,
        skipSuccessfulRequests,
        validate: { xForwardedForHeader: false, default: false },
        handler: (req, res, _next, opts) => {
            const resetTime = req.rateLimit?.resetTime;
            const retryAfterSeconds = resetTime
                ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
                : Math.ceil(opts.windowMs / 1000);

            const resolvedLimit = typeof max === 'function' ? max(req) : max;

            res.status(opts.statusCode || 429).json({
                success: false,
                message: message || opts.message,
                code: 'TOO_MANY_REQUESTS',
                retryAfterSeconds,
                limit: req.rateLimit?.limit || resolvedLimit,
                remaining: 0,
                resetTime: resetTime || new Date(Date.now() + retryAfterSeconds * 1000),
            });
        },
    });
};

/**
 * 1. Global API Rate Limiter
 * Applied across all /api endpoints.
 * - Authenticated School Staff: 3,000 requests per 15-minute window per device (~200 req/min).
 *   Enables high-frequency sequential admissions, rapid fee collections, and multiple open tabs without throttling.
 * - Anonymous / Public traffic: 400 requests per 15-minute window per device/IP.
 */
export const globalLimiter = createLimiter({
    endpointGroup: 'global',
    windowMs: 15 * 60 * 1000,
    max: (req) => {
        const isAuthenticated = Boolean(
            req.user?.id ||
            req.cookies?.[COOKIE_NAME] ||
            (req.headers.authorization && req.headers.authorization.toLowerCase().startsWith('bearer '))
        );
        return isAuthenticated ? 3000 : 400;
    },
    message: 'Too many requests. Please slow down and try again.',
});

/**
 * 2. Strict Authentication Rate Limiter
 * Applied to login, registration, password changes, and sensitive auth endpoints.
 * Allows 20 attempts per 15-minute window per device.
 * Skips successful logins so legitimate users are not penalized.
 */
export const authLimiter = createLimiter({
    endpointGroup: 'auth',
    windowMs: 15 * 60 * 1000,
    max: 20,
    skipSuccessfulRequests: true,
    message: 'Too many login attempts. Please try again in a few minutes.',
});

/**
 * 3. Payment & Checkout Rate Limiter
 * Applied to Razorpay checkout, verify payment, and subscription purchase requests.
 * Allows 25 requests per 15 minutes per device.
 */
export const paymentLimiter = createLimiter({
    endpointGroup: 'payment',
    windowMs: 15 * 60 * 1000,
    max: 25,
    message: 'Too many payment attempts. Please wait a moment before trying again.',
});

/**
 * 4. Heavy Operations Rate Limiter
 * Applied to resource-intensive operations like exports, bulk promotions, and reports.
 * Allows 40 requests per 1-minute window per device.
 */
export const heavyOperationsLimiter = createLimiter({
    endpointGroup: 'heavy_ops',
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
