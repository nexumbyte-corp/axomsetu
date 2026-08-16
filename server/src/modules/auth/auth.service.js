import { prisma } from '../../config/prisma.js';
import { env } from '../../config/env.js';
import { ApiError } from '../../utils/ApiError.js';
import { comparePassword, hashPassword } from '../../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';
import { generateSessionToken, hashSessionToken } from '../../utils/session.js';

/**
 * Revokes all active server sessions for a specific user ID.
 * Used during single-session enforcement, password resets, and account deactivation.
 * @param {string} userId
 */
const revokeAllUserSessions = async (userId) => {
  if (!userId) return;
  await prisma.userSession.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const loginUser = async ({ email, password }, meta = {}) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      schoolAdmins: {
        include: {
          school: true,
          permissions: {
            select: { permission: true },
          },
        },
      },
    },
  });

  // Security: Generic error message to prevent account enumeration
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta.ipAddress || null,
        userAgent: meta.userAgent || null,
      },
    }).catch(() => {});
    throw ApiError.unauthorized('Invalid email or password');
  }

  // Check if account is suspended/inactive across memberships
  const activeMembership = user.schoolAdmins.find((sa) => sa.isActive !== false);
  if (user.role !== 'SUPER_ADMIN' && !activeMembership) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact your school administrator.');
  }

  // STRICT REQUIREMENT 5: Single active session per user.
  // Revoke any pre-existing active session before creating the new session.
  await revokeAllUserSessions(user.id);

  // Generate new cryptographically secure session token
  const rawSessionToken = generateSessionToken();
  const sessionTokenHash = hashSessionToken(rawSessionToken);

  const maxAgeDays = env.SESSION_MAX_AGE_DAYS || 7;
  const expiresAt = new Date(Date.now() + maxAgeDays * 24 * 60 * 60 * 1000);
  const primarySchoolId = user.schoolAdmins[0]?.schoolId || null;

  // Store server-side session hash in database
  await prisma.userSession.create({
    data: {
      userId: user.id,
      schoolId: primarySchoolId,
      sessionTokenHash,
      expiresAt,
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
    },
  });

  // Generate legacy access tokens for API compatibility
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Log successful authentication event
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      schoolId: primarySchoolId,
      action: 'LOGIN',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
    },
  }).catch(() => {});

  const { passwordHash, ...userWithoutPassword } = user;

  const normalizedUser = {
    ...userWithoutPassword,
    schoolAdmins: userWithoutPassword.schoolAdmins.map((sa) => ({
      ...sa,
      permissions: (sa.permissions || []).map((p) => p.permission),
    })),
  };

  return {
    user: normalizedUser,
    sessionToken: rawSessionToken,
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    throw ApiError.unauthorized('User not found');
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

export const getCurrentUserProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      schoolAdmins: {
        select: {
          id: true,
          isOwner: true,
          schoolRole: true,
          isActive: true,
          school: {
            select: {
              id: true,
              name: true,
              code: true,
              logoUrl: true,
              status: true,
            },
          },
          permissions: {
            select: { permission: true },
          },
        },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('User profile not found');
  }

  const normalizedUser = {
    ...user,
    schoolAdmins: user.schoolAdmins.map((sa) => ({
      ...sa,
      permissions: sa.permissions.map((p) => p.permission),
    })),
  };

  return normalizedUser;
};

export const logoutUser = async (userId, rawToken = null) => {
  if (rawToken) {
    const tokenHash = hashSessionToken(rawToken);
    await prisma.userSession.updateMany({
      where: { sessionTokenHash: tokenHash },
      data: { revokedAt: new Date() },
    }).catch(() => {});
  } else if (userId) {
    await revokeAllUserSessions(userId);
  }

  if (userId) {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: userId,
      },
    }).catch(() => {});
  }
  return true;
};

export const updateUserProfile = async (userId, data) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      updatedAt: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: userId,
      oldValues: { name: user.name, phone: user.phone },
      newValues: { name: updatedUser.name, phone: updatedUser.phone },
    },
  }).catch(() => {});

  return updatedUser;
};

export const changeUserPassword = async (userId, { currentPassword, newPassword }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound('User not found');
  }

  const isCurrentValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isCurrentValid) {
    throw ApiError.badRequest('Current password is incorrect');
  }

  if (!newPassword || newPassword.length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters long');
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  // REQUIREMENT 9: Password Change revokes ALL active sessions for that user
  await revokeAllUserSessions(userId);

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
    },
  }).catch(() => {});

  return { message: 'Password changed successfully. All existing sessions have been signed out.' };
};
