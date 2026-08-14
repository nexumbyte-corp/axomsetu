import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { hashPassword } from '../../utils/password.js';

export const adminUserService = {
  /**
   * Super Admin: List all platform users with filtering and pagination.
   */
  async listUsers({ page = 1, limit = 20, search, role, schoolId }) {
    const where = {};

    if (role) {
      where.role = role;
    }

    if (schoolId) {
      where.schoolAdmins = {
        some: { schoolId },
      };
    }

    if (search) {
      const searchFilter = { contains: search, mode: 'insensitive' };
      where.OR = [
        { name: searchFilter },
        { email: searchFilter },
        { phone: searchFilter },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);

    const skip = (pageNum - 1) * limitNum;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
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
              isOwner: true,
              school: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const items = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      schools: u.schoolAdmins.map((sa) => ({
        ...sa.school,
        isOwner: sa.isOwner,
      })),
    }));

    return {
      items,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  },

  /**
   * Super Admin: Create a new Super Admin account.
   */
  async createSuperAdmin({ name, email, password, phone }, actorUserId) {
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw ApiError.conflict('A user with this email address already exists');
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'SUPER_ADMIN',
        phone: phone?.trim() || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'SUPER_ADMIN_CREATED',
        entityType: 'User',
        entityId: user.id,
        newValues: { name: user.name, email: user.email, role: user.role },
      },
    });

    return user;
  },

  /**
   * Super Admin: Update user profile details.
   */
  async updateUserProfile(userId, data, actorUserId) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw ApiError.notFound('User not found');
    }

    if (data.email && data.email.toLowerCase() !== existing.email) {
      const emailConflict = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase().trim() },
      });
      if (emailConflict) {
        throw ApiError.conflict('Another user is already using this email address');
      }
    }

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.email !== undefined) updateData.email = data.email.toLowerCase().trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;

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
        userId: actorUserId,
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: userId,
        oldValues: { name: existing.name, email: existing.email, phone: existing.phone },
        newValues: { name: updatedUser.name, email: updatedUser.email, phone: updatedUser.phone },
      },
    });

    return updatedUser;
  },

  /**
   * Super Admin: Change user role.
   */
  async changeUserRole(userId, newRole, actorUserId) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw ApiError.notFound('User not found');
    }

    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(newRole)) {
      throw ApiError.badRequest('Invalid role');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: userId,
        oldValues: { role: existing.role },
        newValues: { role: newRole },
      },
    });

    return updatedUser;
  },

  /**
   * Super Admin: Reset any user's password.
   */
  async resetUserPassword(userId, newPassword, actorUserId) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw ApiError.notFound('User not found');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await prisma.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'PASSWORD_RESET_BY_ADMIN',
        entityType: 'User',
        entityId: userId,
        newValues: { targetUserEmail: existing.email },
      },
    });

    return { message: `Password for ${existing.email} successfully reset.` };
  },
};
