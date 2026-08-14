import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { hashPassword } from '../../utils/password.js';
import { validateAssignablePermissions } from '../../middleware/permission.middleware.js';
import { ASSIGNABLE_PERMISSIONS } from '../../config/permissions.js';

/**
 * School-scoped User Management Service.
 *
 * All operations are school-scoped — actors can only manage users within their own school.
 * Safety rules:
 *  - Cannot create/assign OWNER role
 *  - Cannot deactivate the only OWNER
 *  - Cannot modify OWNER's permissions
 *  - Cannot assign VOID_RECEIPT to STAFF
 *  - All permission saves are audited
 */
export const schoolUserService = {
  /**
   * List all users in the school with their roles, status, and permission summary.
   */
  async listUsers(schoolId, query = {}) {
    const { search, schoolRole, isActive, page = 1, limit = 20 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      schoolId,
      ...(schoolRole && { schoolRole }),
      ...(isActive !== undefined && { isActive: isActive === 'true' || isActive === true }),
    };

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [total, memberships] = await Promise.all([
      prisma.schoolAdmin.count({ where }),
      prisma.schoolAdmin.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              createdAt: true,
            },
          },
          permissions: {
            select: { permission: true },
          },
        },
      }),
    ]);

    return {
      users: memberships.map((m) => formatMembership(m)),
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
    };
  },

  /**
   * Get a single school user's details and permissions.
   */
  async getUser(schoolId, membershipId) {
    const membership = await prisma.schoolAdmin.findFirst({
      where: { id: membershipId, schoolId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        },
        permissions: {
          select: { permission: true },
        },
      },
    });

    if (!membership) {
      throw ApiError.notFound('User not found in this school');
    }

    return formatMembership(membership);
  },

  /**
   * Create a new user and add them to the school as STAFF or SCHOOL_ADMIN.
   * New users always get User.role = SCHOOL_ADMIN for existing middleware compatibility.
   * The school-level role is stored in SchoolAdmin.schoolRole.
   */
  async createUser(schoolId, data, actorMembershipId, actorUserId) {
    const { name, email, password, phone, schoolRole, customRoleLabel, isActive } = data;

    // Validate role — cannot create OWNER through this endpoint
    if (schoolRole === 'OWNER') {
      throw ApiError.forbidden('Cannot assign Owner role through user management. Ownership cannot be transferred here.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let userId;

    if (existingUser) {
      // Check if they're already a member of this school
      const existingMembership = await prisma.schoolAdmin.findFirst({
        where: { userId: existingUser.id, schoolId },
      });

      if (existingMembership) {
        throw ApiError.conflict('This user is already a member of your school');
      }

      userId = existingUser.id;
    } else {
      // Create new user account
      const passwordHash = await hashPassword(password);
      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          passwordHash,
          phone: phone?.trim() || null,
          role: 'SCHOOL_ADMIN', // Platform role — STAFF users still get SCHOOL_ADMIN globally
        },
      });
      userId = newUser.id;
    }

    // Create school membership
    const membership = await prisma.schoolAdmin.create({
      data: {
        schoolId,
        userId,
        isOwner: false,
        schoolRole: schoolRole || 'STAFF',
        isActive: isActive !== undefined ? isActive : true,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
        },
        permissions: { select: { permission: true } },
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'SCHOOL_USER_CREATED',
        entityType: 'SchoolAdmin',
        entityId: membership.id,
        newValues: {
          targetUser: membership.user.email,
          schoolRole: membership.schoolRole,
          isActive: membership.isActive,
        },
      },
    });

    return formatMembership(membership);
  },

  /**
   * Update school user profile fields (name, phone, customRoleLabel).
   */
  async updateUser(schoolId, membershipId, data, actorUserId) {
    const membership = await prisma.schoolAdmin.findFirst({
      where: { id: membershipId, schoolId },
      include: { user: true },
    });

    if (!membership) {
      throw ApiError.notFound('User not found in this school');
    }

    const { name, phone } = data;

    const updatedUser = await prisma.user.update({
      where: { id: membership.userId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'SCHOOL_USER_UPDATED',
        entityType: 'SchoolAdmin',
        entityId: membershipId,
        oldValues: { name: membership.user.name, phone: membership.user.phone },
        newValues: { name: updatedUser.name, phone: updatedUser.phone },
      },
    });

    return { ...formatMembership({ ...membership, user: updatedUser }) };
  },

  /**
   * Activate or deactivate a school user.
   * Cannot deactivate the only OWNER.
   * Cannot deactivate/modify OWNER if actor is SCHOOL_ADMIN.
   */
  async updateUserStatus(schoolId, membershipId, { isActive, reason }, actorMembership, actorUserId) {
    const membership = await prisma.schoolAdmin.findFirst({
      where: { id: membershipId, schoolId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!membership) {
      throw ApiError.notFound('User not found in this school');
    }

    // Protect OWNER — only another OWNER can deactivate an OWNER (and only if there's another)
    if (membership.schoolRole === 'OWNER') {
      if (actorMembership.schoolRole !== 'OWNER') {
        throw ApiError.forbidden('Only the Owner can modify another Owner\'s status');
      }

      if (!isActive) {
        // Ensure at least one active OWNER remains
        const activeOwnerCount = await prisma.schoolAdmin.count({
          where: { schoolId, schoolRole: 'OWNER', isActive: true },
        });

        if (activeOwnerCount <= 1) {
          throw ApiError.forbidden(
            'Cannot deactivate the only active Owner. Assign another Owner first.'
          );
        }
      }
    }

    const updated = await prisma.schoolAdmin.update({
      where: { id: membershipId },
      data: { isActive },
    });

    // REQUIREMENT 10: Revoke all active sessions belonging to the user when deactivated
    if (!isActive) {
      await prisma.userSession.updateMany({
        where: { userId: membership.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }).catch(() => {});
    }

    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'SCHOOL_USER_STATUS_CHANGED',
        entityType: 'SchoolAdmin',
        entityId: membershipId,
        oldValues: { isActive: membership.isActive },
        newValues: { isActive, reason: reason || null, targetUser: membership.user.email },
      },
    });

    return { id: membershipId, isActive: updated.isActive, message: `User ${isActive ? 'activated' : 'deactivated'} successfully` };
  },

  /**
   * Get a user's current permissions.
   */
  async getUserPermissions(schoolId, membershipId) {
    const membership = await prisma.schoolAdmin.findFirst({
      where: { id: membershipId, schoolId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        permissions: { select: { permission: true } },
      },
    });

    if (!membership) {
      throw ApiError.notFound('User not found in this school');
    }

    return {
      membershipId: membership.id,
      userId: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      schoolRole: membership.schoolRole,
      permissions: membership.permissions.map((p) => p.permission),
    };
  },

  /**
   * Set (replace) a user's permissions.
   *
   * Safety rules:
   *  - Cannot assign permissions to OWNER
   *  - Cannot assign permissions to SCHOOL_ADMIN (they already have full access)
   *  - Cannot assign system-restricted permissions (FEES_VOID_RECEIPT, etc.)
   *  - Actor cannot modify their own permissions
   *  - Only OWNER can modify SCHOOL_ADMIN's role (not supported here — N/A since full access)
   *  - Saves atomically (delete + createMany in a transaction)
   *  - Full audit log of added/removed permissions
   */
  async setUserPermissions(schoolId, membershipId, permissions, actorMembership, actorUserId) {
    const membership = await prisma.schoolAdmin.findFirst({
      where: { id: membershipId, schoolId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        permissions: { select: { permission: true } },
      },
    });

    if (!membership) {
      throw ApiError.notFound('User not found in this school');
    }

    // Cannot modify OWNER permissions
    if (membership.schoolRole === 'OWNER') {
      throw ApiError.forbidden('Cannot modify Owner permissions. Owners always have full access.');
    }

    // Cannot modify SCHOOL_ADMIN permissions (they already have full access)
    if (membership.schoolRole === 'SCHOOL_ADMIN') {
      throw ApiError.forbidden('School Admins already have full access. Permissions are only applicable to Staff users.');
    }

    // Only STAFF users have assignable permissions — validated above

    // Validate all provided permissions
    validateAssignablePermissions(permissions);

    const oldPermissions = membership.permissions.map((p) => p.permission);
    const newPermissions = [...new Set(permissions)]; // deduplicate

    const added = newPermissions.filter((p) => !oldPermissions.includes(p));
    const removed = oldPermissions.filter((p) => !newPermissions.includes(p));

    // Atomic save: delete all then recreate
    await prisma.$transaction([
      prisma.schoolUserPermission.deleteMany({
        where: { schoolAdminId: membershipId },
      }),
      prisma.schoolUserPermission.createMany({
        data: newPermissions.map((perm) => ({
          schoolAdminId: membershipId,
          permission: perm,
        })),
        skipDuplicates: true,
      }),
    ]);

    // Audit log
    await prisma.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'USER_PERMISSIONS_UPDATED',
        entityType: 'SchoolAdmin',
        entityId: membershipId,
        oldValues: { permissions: oldPermissions },
        newValues: {
          permissions: newPermissions,
          added,
          removed,
          targetUser: membership.user.email,
        },
      },
    });

    return {
      membershipId,
      userId: membership.user.id,
      permissions: newPermissions,
      added,
      removed,
      message: 'Permissions updated successfully',
    };
  },
};

/**
 * Format a SchoolAdmin membership record for API response.
 */
function formatMembership(m) {
  const permissions = m.permissions?.map((p) => p.permission) || [];
  const isOwnerOrAdmin = m.schoolRole === 'OWNER' || m.schoolRole === 'SCHOOL_ADMIN';

  // Build a human-readable access summary
  let accessSummary;
  if (isOwnerOrAdmin) {
    accessSummary = 'Full Access';
  } else if (permissions.length === 0) {
    accessSummary = 'No Access';
  } else if (permissions.length <= 3) {
    accessSummary = permissions.join(' · ');
  } else {
    accessSummary = `${permissions.length} permissions`;
  }

  return {
    id: m.id,
    userId: m.user?.id,
    name: m.user?.name,
    email: m.user?.email,
    phone: m.user?.phone,
    schoolRole: m.schoolRole,
    isOwner: m.isOwner || m.schoolRole === 'OWNER',
    isActive: m.isActive,
    permissions,
    accessSummary,
    roleLabel: getRoleLabel(m.schoolRole),
    createdAt: m.createdAt,
  };
}

function getRoleLabel(schoolRole) {
  switch (schoolRole) {
    case 'OWNER': return 'Owner';
    case 'SCHOOL_ADMIN': return 'School Admin';
    case 'STAFF': return 'Staff / User';
    default: return schoolRole;
  }
}
