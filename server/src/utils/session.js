import crypto from 'crypto';
import { env } from '../config/env.js';

export const COOKIE_NAME = 'axomsetu_session';

/**
 * Generate a cryptographically secure random session token.
 */
export const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * SHA-256 hash for raw session tokens. Never store raw token in database.
 * @param {string} token
 */
export const hashSessionToken = (token) => {
  if (!token) return '';
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Set secure HttpOnly cookie on HTTP response.
 * @param {import('express').Response} res
 * @param {string} token
 */
export const setSessionCookie = (res, token) => {
  const maxAgeMs = (env.SESSION_MAX_AGE_DAYS || 7) * 24 * 60 * 60 * 1000;
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  });
};

/**
 * Clear authentication cookie.
 * @param {import('express').Response} res
 */
export const clearSessionCookie = (res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
};
