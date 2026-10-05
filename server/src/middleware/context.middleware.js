import { AsyncLocalStorage } from 'node:async_hooks';
import { getClientIp } from '../utils/ipHelper.js';

export const requestContext = new AsyncLocalStorage();

/**
 * Returns the current request store or null if called outside a request lifecycle
 * @returns {{ ipAddress: string|null, userAgent: string|null, userId: string|null, schoolId: string|null } | null}
 */
export const getRequestContext = () => requestContext.getStore() || null;

/**
 * Updates the current request context user ID if store exists
 * @param {string} userId
 */
export const setRequestContextUser = (userId) => {
  const store = requestContext.getStore();
  if (store && userId) {
    store.userId = userId;
  }
};

/**
 * Updates the current request context school ID if store exists
 * @param {string} schoolId
 */
export const setRequestContextSchool = (schoolId) => {
  const store = requestContext.getStore();
  if (store && schoolId) {
    store.schoolId = schoolId;
  }
};

/**
 * Request Context Middleware:
 * Automatically captures client IP and User-Agent in an AsyncLocalStorage store.
 * Allows deep service calls, audit logs, and transactions to access ambient request metadata.
 */
export const requestContextMiddleware = (req, res, next) => {
  const ipAddress = getClientIp(req);
  const userAgent = req.headers?.['user-agent'] || null;

  const store = {
    ipAddress,
    userAgent,
    userId: req.user?.id || null,
    schoolId: req.schoolId || null,
  };

  requestContext.run(store, () => {
    next();
  });
};
