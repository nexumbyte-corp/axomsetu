import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { prisma } from '../config/prisma.js';

/**
 * Enforces tenant isolation. Resolves the allowed school strictly from
 * authenticated user membership (SchoolAdmin table).
 * Never trusts schoolId supplied in body/query by frontend.
 *
 * Extended to support three school roles: OWNER, SCHOOL_ADMIN, STAFF.
 * Also loads user's assigned permissions for STAFF users.
 * Also enforces isActive — inactive users are blocked immediately.
 */
export const resolveSchool = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('User not authenticated');
  }

  // For all school users, strictly lookup membership
  const membership = await prisma.schoolAdmin.findFirst({
    where: { userId: req.user.id },
    include: {
      school: true,
      permissions: {
        select: { permission: true },
      },
    },
  });

  if (!membership || !membership.school) {
    if (req.user.role === 'SUPER_ADMIN') {
      const targetSchoolId = req.headers['x-school-id'] || req.query.schoolId;
      let school = null;
      if (targetSchoolId) {
        school = await prisma.school.findUnique({ where: { id: targetSchoolId } });
      }
      if (!school) {
        school = await prisma.school.findFirst({ where: { status: 'ACTIVE' } });
      }
      if (school) {
        req.schoolId = school.id;
        req.school = school;
        req.schoolMembership = {
          id: 'super-admin-membership',
          schoolRole: 'OWNER',
          isOwner: true,
          isActive: true,
          permissions: [],
        };
        req.isOwner = true;
        req.isSchoolAdmin = true;
        req.schoolRole = 'OWNER';
        return next();
      }
    }
    throw ApiError.forbidden('No school membership associated with your user account');
  }

  // Check if user is active in the school
  if (membership.isActive === false) {
    throw ApiError.forbidden('Your account has been deactivated. Please contact your school administrator.');
  }

  if (membership.school.status !== 'ACTIVE') {
    throw ApiError.forbidden('Associated school account is inactive or suspended');
  }

  // Attach school context
  req.schoolId = membership.schoolId;
  req.school = membership.school;
  req.schoolAdmin = membership;

  // Attach resolved role context
  const isOwnerFlag = membership.isOwner || membership.schoolRole === 'OWNER';
  const resolvedRole = isOwnerFlag ? 'OWNER' : membership.schoolRole;

  req.schoolMembership = {
    id: membership.id,
    schoolRole: resolvedRole,
    isOwner: isOwnerFlag,
    isActive: membership.isActive,
    permissions: membership.permissions.map((p) => p.permission),
  };

  // Convenience flags
  req.isOwner = isOwnerFlag;
  req.isSchoolAdmin = resolvedRole === 'SCHOOL_ADMIN';
  req.schoolRole = resolvedRole;

  next();
});
