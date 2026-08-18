import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/prisma.js';
import { COOKIE_NAME, hashSessionToken } from '../utils/session.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // 1. Extract session token from HttpOnly cookie first, then Authorization header, then query parameter
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    token = req.cookies[COOKIE_NAME];
  } else {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }
  }

  if (!token) {
    throw ApiError.unauthorized('Authentication required', 'UNAUTHORIZED');
  }

  const tokenHash = hashSessionToken(token);

  // 2. Query authoritative server-side session
  const session = await prisma.userSession.findFirst({
    where: { sessionTokenHash: tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
    },
  });

  // 3. Handle session validation
  if (session) {
    // Check if session has been revoked (e.g. user logged in on another device or password reset)
    if (session.revokedAt) {
      throw ApiError.unauthorized(
        'Your session has ended because your account was signed in from another device.',
        'SESSION_REVOKED'
      );
    }

    // Check if session has expired
    if (new Date() > new Date(session.expiresAt)) {
      throw ApiError.unauthorized(
        'Your session has expired. Please log in again.',
        'SESSION_EXPIRED'
      );
    }

    if (!session.user) {
      throw ApiError.unauthorized('User associated with session no longer exists');
    }

    // Update last activity timestamp asynchronously if > 1 minute has elapsed
    const now = new Date();
    if (now.getTime() - new Date(session.lastActivityAt).getTime() > 60000) {
      prisma.userSession
        .update({
          where: { id: session.id },
          data: { lastActivityAt: now },
        })
        .catch(() => {});
    }

    req.user = session.user;
    req.session = session;
    req.token = token;
    return next();
  }

  // 4. Fallback for legacy access tokens if present during transition
  try {
    const decoded = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('User associated with token no longer exists');
    }

    req.user = user;
    return next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired session token', 'SESSION_EXPIRED');
  }
});
