import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { hashPassword } from '../../utils/password.js';
import { calculateSubscriptionEndDate } from '../../utils/subscriptionUtils.js';
import { ensureCurrentAcademicYear } from '../academic-years/academicYear.service.js';
import { initializeDefaultClasses } from '../academics/academic.service.js';
import { initializeSystemFeeTypes } from '../fees/fee-type.service.js';
import { compressAndUploadLogo, deleteCloudinaryImage } from '../../services/cloudinary.service.js';
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_POLICY_VERSION } from '../../constants/legalConstants.js';

/**
 * Concurrency-safe school code generator using a PostgreSQL sequence.
 * Formats code as SCH000001, SCH000002, etc.
 */
const generateUniqueSchoolCode = async (tx) => {
  await tx.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS school_code_seq START WITH 1;`);

  let attempts = 0;
  while (attempts < 10) {
    const result = await tx.$queryRawUnsafe(`SELECT nextval('school_code_seq') as val;`);
    const seqNum = Number(result[0].val);
    const code = `SCH${String(seqNum).padStart(6, '0')}`;

    const existing = await tx.school.findUnique({ where: { code } });
    if (!existing) {
      return code;
    }
    attempts++;
  }

  throw ApiError.internal('Failed to generate a unique school code');
};

/**
 * Atomic Onboarding Service.
 * Creates School, Owner User, SchoolAdmin membership, 2-Month Free Trial Subscription, Current Academic Year, Default Classes (PP-XII), and AuditLog in a single transaction.
 */
export const createSchoolWithOwnerAndTrial = async (data, creatorUserId = null, reqContext = {}) => {
  const {
    schoolName,
    name,
    address,
    phone,
    email,
    ownerName,
    adminName,
    password,
    adminPassword,
    termsAccepted,
    acceptedTermsVersion = CURRENT_TERMS_VERSION,
    privacyPolicyVersion = CURRENT_PRIVACY_POLICY_VERSION,
  } = data;

  const isSuperAdminCreation = Boolean(creatorUserId);
  if (!isSuperAdminCreation && termsAccepted !== true && termsAccepted !== 'true') {
    throw ApiError.badRequest('Terms & Conditions acceptance is required before registration.');
  }

  const targetSchoolName = (schoolName || name || '').trim();
  const targetOwnerName = (ownerName || adminName || '').trim();
  const targetPassword = password || adminPassword;
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedOwnerName = targetOwnerName;

  // Duplicate checks before starting transaction
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existingUser) {
    throw ApiError.conflict('A user with this email address already exists');
  }

  const existingSchool = await prisma.school.findFirst({
    where: { email: normalizedEmail },
  });
  if (existingSchool) {
    throw ApiError.conflict('A school with this primary contact email already exists');
  }

  // Atomic transaction
  return await prisma.$transaction(async (tx) => {
    // 1. Generate unique school code
    const code = await generateUniqueSchoolCode(tx);

    // 2. Hash owner password
    const passwordHash = await hashPassword(targetPassword);

    // 3. Create School
    const school = await tx.school.create({
      data: {
        name: targetSchoolName,
        code,
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        email: normalizedEmail,
        status: 'ACTIVE',
      },
    });

    // 4. Create Owner User
    const ownerUser = await tx.user.create({
      data: {
        name: trimmedOwnerName,
        email: normalizedEmail,
        passwordHash,
        role: 'SCHOOL_ADMIN',
        phone: phone?.trim() || null,
      },
    });

    // 5. Create SchoolAdmin membership
    await tx.schoolAdmin.create({
      data: {
        schoolId: school.id,
        userId: ownerUser.id,
        isOwner: true,
        schoolRole: 'OWNER',
      },
    });

    // 6. Ensure Current Academic Year for the new school
    await ensureCurrentAcademicYear(school.id, tx);

    // 7. Initialize Default Classes (PP to XII)
    await initializeDefaultClasses(school.id, tx);

    // 8. Initialize System Fee Types (Admission, Tuition, Miscellaneous)
    await initializeSystemFeeTypes(school.id, tx);

    // 9. Automatically create Free Trial Subscription from DB plan (One Trial per school rule)
    const existingTrial = await tx.schoolSubscription.findFirst({
      where: {
        schoolId: school.id,
        plan: { isTrial: true },
      },
    });

    let subscription = null;
    if (!existingTrial) {
      let trialPlan = await tx.subscriptionPlan.findFirst({
        where: { isTrial: true, isActive: true },
      });

      if (!trialPlan) {
        trialPlan = await tx.subscriptionPlan.findFirst({
          where: { isTrial: true },
        });
      }

      if (!trialPlan) {
        trialPlan = await tx.subscriptionPlan.create({
          data: {
            name: 'Free Trial',
            code: 'TRIAL',
            type: 'TRIAL',
            durationValue: 1,
            durationUnit: 'MONTH',
            basePrice: 0,
            discountPercentage: 100,
            discountAmount: 0,
            finalPrice: 0,
            currency: 'INR',
            description: '1-Month full platform free trial for newly registered schools.',
            offerTitle: '1 Month Free',
            offerDescription: 'Try AxomSetu completely free with full access for 1 month.',
            badge: 'FREE TRIAL',
            isTrial: true,
            isActive: true,
            displayOrder: 0,
            features: [
              'All Modules Activated',
              'Student Management',
              'Staff Management',
              'Attendance Management',
              'Academic Management',
              'Fee Management',
              'Hostel Management',
              'Payroll Management',
              'Finance & Ledger',
              'Reports & Analytics',
              'PDF Documents Generator',
              'Technical Support',
            ],
          },
        });
      }

      const startDate = new Date();
      const endDate = calculateSubscriptionEndDate(startDate, trialPlan.durationUnit, trialPlan.durationValue);
      const unitLabel = trialPlan.durationUnit.toLowerCase();
      const durationSnapshot = `${trialPlan.durationValue} ${unitLabel}${trialPlan.durationValue > 1 ? 's' : ''}`;

      subscription = await tx.schoolSubscription.create({
        data: {
          schoolId: school.id,
          planId: trialPlan.id,
          planNameSnapshot: trialPlan.name,
          durationSnapshot,
          basePriceSnapshot: trialPlan.basePrice,
          discountSnapshot: trialPlan.discountAmount,
          finalPriceSnapshot: trialPlan.finalPrice,
          status: 'ACTIVE',
          startDate,
          endDate,
          paymentStatus: 'PAID',
          paymentProvider: 'MANUAL',
          remarks: 'Automatic Free Trial on School Registration',
        },
      });
    }

    // 10. Record immutable Terms & Conditions acceptance record
    const termsAcceptance = await tx.termsAcceptance.create({
      data: {
        schoolId: school.id,
        userId: ownerUser.id,
        termsVersion: acceptedTermsVersion || CURRENT_TERMS_VERSION,
        privacyPolicyVersion: privacyPolicyVersion || CURRENT_PRIVACY_POLICY_VERSION,
        acceptedAt: new Date(),
        ipAddress: reqContext.ipAddress || null,
        userAgent: reqContext.userAgent || null,
      },
    });

    // 11. Audit log entry for TERMS_ACCEPTED
    await tx.auditLog.create({
      data: {
        schoolId: school.id,
        userId: ownerUser.id,
        action: 'TERMS_ACCEPTED',
        entityType: 'TermsAcceptance',
        entityId: termsAcceptance.id,
        ipAddress: reqContext.ipAddress || null,
        userAgent: reqContext.userAgent || null,
        newValues: {
          termsVersion: termsAcceptance.termsVersion,
          privacyPolicyVersion: termsAcceptance.privacyPolicyVersion,
          acceptedAt: termsAcceptance.acceptedAt,
        },
      },
    });

    // 12. Audit log entry for SCHOOL_REGISTERED
    await tx.auditLog.create({
      data: {
        schoolId: school.id,
        userId: creatorUserId || ownerUser.id,
        action: creatorUserId ? 'CREATE_SCHOOL' : 'SCHOOL_REGISTERED',
        entityType: 'School',
        entityId: school.id,
        ipAddress: reqContext.ipAddress || null,
        userAgent: reqContext.userAgent || null,
        newValues: {
          schoolId: school.id,
          schoolName: school.name,
          code: school.code,
          ownerUserId: ownerUser.id,
          ownerEmail: ownerUser.email,
          subscriptionId: subscription?.id || null,
          termsAcceptanceId: termsAcceptance.id,
        },
      },
    });

    return {
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        address: school.address,
        phone: school.phone,
        email: school.email,
        status: school.status,
        createdAt: school.createdAt,
      },
      owner: {
        id: ownerUser.id,
        name: ownerUser.name,
        email: ownerUser.email,
        role: ownerUser.role,
      },
      subscription: subscription
        ? {
          id: subscription.id,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          planName: subscription.planNameSnapshot,
        }
        : null,
    };
  });
};

/**
 * Super Admin: List Schools with pagination, search, and status filter.
 */
export const listSchools = async ({ page = 1, limit = 20, search, status }) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 20);

  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    const searchFilter = { contains: search, mode: 'insensitive' };
    where.OR = [
      { name: searchFilter },
      { code: searchFilter },
      { email: searchFilter },
      { phone: searchFilter },
    ];
  }

  const skip = (pageNum - 1) * limitNum;

  const [total, schools] = await Promise.all([
    prisma.school.count({ where }),
    prisma.school.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        admins: {
          where: { isOwner: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
              },
            },
          },
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            plan: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const items = schools.map((school) => {
    const ownerMembership = school.admins[0];
    const latestSubscription = school.subscriptions[0] || null;

    return {
      id: school.id,
      name: school.name,
      code: school.code,
      address: school.address,
      phone: school.phone,
      email: school.email,
      logoUrl: school.logoUrl,
      status: school.status,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
      owner: ownerMembership ? ownerMembership.user : null,
      subscription: latestSubscription
        ? {
          id: latestSubscription.id,
          status: latestSubscription.status,
          startDate: latestSubscription.startDate,
          endDate: latestSubscription.endDate,
          plan: latestSubscription.plan,
        }
        : null,
    };
  });

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Super Admin: Get detailed school information by schoolId.
 */
export const getSchoolById = async (schoolId) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      admins: {
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
        },
      },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              durationValue: true,
              durationUnit: true,
              basePrice: true,
              finalPrice: true,
            },
          },
        },
      },
      academicYears: {
        select: {
          id: true,
          name: true,
          isCurrent: true,
          isLocked: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      termsAcceptances: {
        orderBy: { acceptedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!school) {
    throw ApiError.notFound('School not found');
  }

  const ownerMembership = school.admins.find((a) => a.isOwner);
  const latestSubscription = school.subscriptions[0] || null;

  return {
    school: {
      id: school.id,
      name: school.name,
      code: school.code,
      address: school.address,
      phone: school.phone,
      email: school.email,
      logoUrl: school.logoUrl,
      status: school.status,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    },
    owner: ownerMembership ? ownerMembership.user : null,
    admins: school.admins.map((a) => ({
      id: a.id,
      userId: a.userId,
      isOwner: a.isOwner,
      createdAt: a.createdAt,
      user: a.user,
    })),
    subscription: latestSubscription
      ? {
        id: latestSubscription.id,
        status: latestSubscription.status,
        startDate: latestSubscription.startDate,
        endDate: latestSubscription.endDate,
        finalPriceSnapshot: latestSubscription.finalPriceSnapshot,
        basePriceSnapshot: latestSubscription.basePriceSnapshot,
        discountSnapshot: latestSubscription.discountSnapshot,
        maxStudentLimitSnapshot: latestSubscription.maxStudentLimitSnapshot,
        isEnterpriseSnapshot: latestSubscription.isEnterpriseSnapshot,
        planNameSnapshot: latestSubscription.planNameSnapshot,
        paymentMethod: latestSubscription.paymentMethod,
        referenceNumber: latestSubscription.referenceNumber,
        remarks: latestSubscription.remarks,
        plan: latestSubscription.plan,
      }
      : null,
    subscriptionsHistory: school.subscriptions.map((s) => ({
      id: s.id,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      finalPriceSnapshot: s.finalPriceSnapshot,
      basePriceSnapshot: s.basePriceSnapshot,
      maxStudentLimitSnapshot: s.maxStudentLimitSnapshot,
      isEnterpriseSnapshot: s.isEnterpriseSnapshot,
      planNameSnapshot: s.planNameSnapshot,
      plan: s.plan,
    })),
    academicYears: school.academicYears,
    termsAcceptances: school.termsAcceptances.map((t) => ({
      id: t.id,
      termsVersion: t.termsVersion,
      privacyPolicyVersion: t.privacyPolicyVersion,
      acceptedAt: t.acceptedAt,
      ipAddress: t.ipAddress,
      userAgent: t.userAgent,
      user: t.user,
    })),
  };
};

/**
 * Super Admin: Update school profile fields (name, address, phone, email, logoUrl).
 * Note: Changing school.email does NOT alter owner User.email.
 */
export const updateSchool = async (schoolId, data, actorUserId) => {
  const existingSchool = await prisma.school.findUnique({
    where: { id: schoolId },
  });

  if (!existingSchool) {
    throw ApiError.notFound('School not found');
  }

  if (data.email && data.email !== existingSchool.email) {
    const emailConflict = await prisma.school.findFirst({
      where: {
        email: data.email,
        NOT: { id: schoolId },
      },
    });
    if (emailConflict) {
      throw ApiError.conflict('Another school is already using this email address');
    }
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.address !== undefined) updateData.address = data.address || null;
  if (data.phone !== undefined) updateData.phone = data.phone || null;
  if (data.email !== undefined) updateData.email = data.email || null;
  if (data.district !== undefined) updateData.district = data.district || null;
  if (data.state !== undefined) updateData.state = data.state || null;
  if (data.pincode !== undefined) updateData.pincode = data.pincode || null;
  if (data.udiseCode !== undefined) updateData.udiseCode = data.udiseCode || null;
  if (data.affiliationNo !== undefined) updateData.affiliationNo = data.affiliationNo || null;
  if (data.website !== undefined) updateData.website = data.website || null;
  if (data.logoUrl !== undefined && data.logoUrl !== existingSchool.logoUrl) {
    if (existingSchool.logoUrl) {
      await deleteCloudinaryImage(existingSchool.logoUrl);
    }
    updateData.logoUrl = data.logoUrl || null;
  }

  const updatedSchool = await prisma.school.update({
    where: { id: schoolId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'UPDATE_SCHOOL',
      entityType: 'School',
      entityId: schoolId,
      oldValues: {
        name: existingSchool.name,
        address: existingSchool.address,
        phone: existingSchool.phone,
        email: existingSchool.email,
        logoUrl: existingSchool.logoUrl,
      },
      newValues: {
        name: updatedSchool.name,
        address: updatedSchool.address,
        phone: updatedSchool.phone,
        email: updatedSchool.email,
        logoUrl: updatedSchool.logoUrl,
      },
    },
  });

  return updatedSchool;
};

/**
 * Super Admin: Update school status (ACTIVE, SUSPENDED, INACTIVE).
 */
export const updateSchoolStatus = async (schoolId, status, reason = null, actorUserId) => {
  const existingSchool = await prisma.school.findUnique({
    where: { id: schoolId },
  });

  if (!existingSchool) {
    throw ApiError.notFound('School not found');
  }

  const updatedSchool = await prisma.school.update({
    where: { id: schoolId },
    data: { status },
  });

  const auditAction = status === 'SUSPENDED'
    ? 'SCHOOL_SUSPENDED'
    : status === 'ACTIVE'
      ? 'SCHOOL_ACTIVATED'
      : 'CHANGE_SCHOOL_STATUS';

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: auditAction,
      entityType: 'School',
      entityId: schoolId,
      oldValues: { status: existingSchool.status },
      newValues: { status: updatedSchool.status, reason },
    },
  });

  return updatedSchool;
};

/**
 * Super Admin: Add an existing user or create a new user as an Admin for a school.
 */
export const addSchoolAdmin = async (schoolId, payload, secondArg = false, thirdArg = null) => {
  let userId = typeof payload === 'string' ? payload : payload?.userId;
  let email = typeof payload === 'object' ? payload?.email : null;
  let isOwner = typeof payload === 'object' ? Boolean(payload?.isOwner) : Boolean(secondArg);
  let actorUserId = typeof payload === 'object' ? (thirdArg || payload?.actorUserId) : thirdArg;
  let schoolRole = typeof payload === 'object' ? (payload?.schoolRole || (isOwner ? 'OWNER' : 'SCHOOL_ADMIN')) : (isOwner ? 'OWNER' : 'SCHOOL_ADMIN');
  let systemRole = typeof payload === 'object' ? (payload?.role || payload?.systemRole || 'SCHOOL_ADMIN') : 'SCHOOL_ADMIN';

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw ApiError.notFound('School not found');

  let user = null;
  if (userId) {
    user = await prisma.user.findUnique({ where: { id: userId } });
  } else if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user && typeof payload === 'object' && payload.name) {
      const passwordHash = await hashPassword(payload.password || 'SchoolAdmin@123');
      user = await prisma.user.create({
        data: {
          name: payload.name.trim(),
          email: normalizedEmail,
          passwordHash,
          role: systemRole === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'SCHOOL_ADMIN',
          phone: payload.phone?.trim() || null,
        },
      });
    }
  }

  if (!user) throw ApiError.notFound('User not found. Please provide valid user details or email.');

  const existingAdmin = await prisma.schoolAdmin.findUnique({
    where: { schoolId_userId: { schoolId, userId: user.id } },
  });
  if (existingAdmin) throw ApiError.conflict('User is already an admin for this school');

  if (isOwner) {
    // Unmark existing owner
    await prisma.schoolAdmin.updateMany({
      where: { schoolId, isOwner: true },
      data: { isOwner: false },
    });
  }

  const admin = await prisma.schoolAdmin.create({
    data: {
      schoolId,
      userId: user.id,
      isOwner,
      schoolRole: isOwner ? 'OWNER' : schoolRole,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId || user.id,
      action: 'SCHOOL_ADMIN_ADDED',
      entityType: 'SchoolAdmin',
      entityId: admin.id,
      newValues: { userId: user.id, email: user.email, isOwner, schoolRole: admin.schoolRole },
    },
  });

  return admin;
};

/**
 * Super Admin: Remove an admin from a school.
 */
export const removeSchoolAdmin = async (schoolId, adminId, actorUserId) => {
  const admin = await prisma.schoolAdmin.findFirst({
    where: { id: adminId, schoolId },
  });

  if (!admin) throw ApiError.notFound('School admin assignment not found');
  if (admin.isOwner) throw ApiError.badRequest('Cannot remove the primary school owner. Change owner first.');

  await prisma.schoolAdmin.delete({ where: { id: adminId } });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'SCHOOL_ADMIN_REMOVED',
      entityType: 'SchoolAdmin',
      entityId: adminId,
      oldValues: { userId: admin.userId, isOwner: admin.isOwner },
    },
  });

  return { message: 'School admin removed successfully' };
};

/**
 * Super Admin: Change designated School Owner.
 */
export const changeSchoolOwner = async (schoolId, newOwnerUserId, actorUserId) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw ApiError.notFound('School not found');

  const newOwnerUser = await prisma.user.findUnique({ where: { id: newOwnerUserId } });
  if (!newOwnerUser) throw ApiError.notFound('Target user not found');

  // Find previous owner
  const previousOwnerAdmin = await prisma.schoolAdmin.findFirst({
    where: { schoolId, isOwner: true },
  });

  await prisma.$transaction(async (tx) => {
    // Demote current owner
    if (previousOwnerAdmin) {
      await tx.schoolAdmin.update({
        where: { id: previousOwnerAdmin.id },
        data: { isOwner: false },
      });
    }

    // Check if new owner is already an admin of this school
    const existingMembership = await tx.schoolAdmin.findUnique({
      where: { schoolId_userId: { schoolId, userId: newOwnerUserId } },
    });

    if (existingMembership) {
      await tx.schoolAdmin.update({
        where: { id: existingMembership.id },
        data: { isOwner: true, schoolRole: 'OWNER' },
      });
    } else {
      await tx.schoolAdmin.create({
        data: {
          schoolId,
          userId: newOwnerUserId,
          isOwner: true,
          schoolRole: 'OWNER',
        },
      });
    }

    await tx.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'SCHOOL_OWNER_CHANGED',
        entityType: 'School',
        entityId: schoolId,
        oldValues: { previousOwnerUserId: previousOwnerAdmin?.userId || null },
        newValues: { newOwnerUserId },
      },
    });
  });

  return { message: 'School owner updated successfully' };
};

/**
 * Super Admin: List all users belonging to a specific school.
 */
export const listSchoolUsers = async (schoolId) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw ApiError.notFound('School not found');

  const admins = await prisma.schoolAdmin.findMany({
    where: { schoolId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      permissions: {
        select: { permission: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return admins.map((a) => ({
    id: a.id,
    userId: a.userId,
    name: a.user.name,
    email: a.user.email,
    phone: a.user.phone,
    role: a.schoolRole,
    systemRole: a.user.role,
    isOwner: a.isOwner,
    isActive: a.isActive,
    createdAt: a.createdAt,
    userCreatedAt: a.user.createdAt,
    permissions: a.permissions.map((p) => p.permission),
  }));
};

/**
 * Super Admin: Create a new user for a specific school.
 */
export const createSchoolUser = async (schoolId, data, actorUserId) => {
  const { name, email, password, schoolRole = 'SCHOOL_ADMIN', permissions = [] } = data;

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw ApiError.notFound('School not found');

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existingUser) {
    // If user exists, attach to school if not already attached
    const existingMembership = await prisma.schoolAdmin.findUnique({
      where: { schoolId_userId: { schoolId, userId: existingUser.id } },
    });
    if (existingMembership) {
      throw ApiError.conflict('User is already registered for this school');
    }

    const membership = await prisma.schoolAdmin.create({
      data: {
        schoolId,
        userId: existingUser.id,
        schoolRole,
        isOwner: false,
        isActive: true,
        permissions: {
          create: permissions.map((p) => ({ permission: p })),
        },
      },
      include: { user: true },
    });

    return membership;
  }

  const passwordHash = await hashPassword(password || 'SchoolAdmin@123');

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: 'SCHOOL_ADMIN',
      },
    });

    const membership = await tx.schoolAdmin.create({
      data: {
        schoolId,
        userId: user.id,
        schoolRole,
        isOwner: false,
        isActive: true,
        permissions: {
          create: permissions.map((p) => ({ permission: p })),
        },
      },
      include: { user: true },
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId: actorUserId,
        action: 'SCHOOL_USER_CREATED',
        entityType: 'SchoolAdmin',
        entityId: membership.id,
        newValues: { email: normalizedEmail, name, schoolRole },
      },
    });

    return membership;
  });
};

/**
 * Super Admin: Activate or deactivate a school user membership.
 */
export const updateSchoolUserStatus = async (schoolId, adminId, isActive, actorUserId) => {
  const membership = await prisma.schoolAdmin.findFirst({
    where: { id: adminId, schoolId },
  });

  if (!membership) throw ApiError.notFound('School user membership not found');
  if (membership.isOwner && !isActive) {
    throw ApiError.badRequest('Cannot deactivate the primary school owner. Change owner first.');
  }

  const updated = await prisma.schoolAdmin.update({
    where: { id: adminId },
    data: { isActive },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: isActive ? 'SCHOOL_USER_ACTIVATED' : 'SCHOOL_USER_DEACTIVATED',
      entityType: 'SchoolAdmin',
      entityId: adminId,
      newValues: { isActive },
    },
  });

  return updated;
};

/**
 * Tenant School Admin: Fetch own school profile details including owner and active subscription info.
 */
export const getTenantSchoolProfile = async (schoolId) => {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      admins: {
        where: { isOwner: true },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
            },
          },
        },
      },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              basePrice: true,
              finalPrice: true,
              features: true,
              isTrial: true,
            },
          },
        },
      },
      _count: {
        select: {
          students: true,
          staff: true,
        },
      },
    },
  });

  if (!school) {
    throw ApiError.notFound('School not found');
  }

  const ownerMembership = school.admins[0];
  const activeSubscription = school.subscriptions[0] || null;

  return {
    id: school.id,
    name: school.name,
    code: school.code,
    address: school.address,
    phone: school.phone,
    email: school.email,
    logoUrl: school.logoUrl,
    district: school.district,
    state: school.state,
    pincode: school.pincode,
    udiseCode: school.udiseCode,
    affiliationNo: school.affiliationNo,
    website: school.website,
    status: school.status,
    createdAt: school.createdAt,
    updatedAt: school.updatedAt,
    owner: ownerMembership ? ownerMembership.user : null,
    activeSubscription: activeSubscription
      ? {
        id: activeSubscription.id,
        status: activeSubscription.status,
        startDate: activeSubscription.startDate,
        endDate: activeSubscription.endDate,
        paymentStatus: activeSubscription.paymentStatus,
        finalPrice: activeSubscription.finalPriceSnapshot,
        planName: activeSubscription.planNameSnapshot || activeSubscription.plan?.name,
        plan: activeSubscription.plan,
      }
      : null,
    stats: {
      totalStudents: school._count.students,
      totalStaff: school._count.staff,
    },
  };
};

/**
 * Tenant School Admin: Update own school profile details.
 */
export const updateTenantSchoolProfile = async (schoolId, data, actorUserId) => {
  return await updateSchool(schoolId, data, actorUserId);
};

/**
 * Tenant School Owner: Upload, compress logo (<=20KB), and delete previous logo from Cloudinary.
 */
export const uploadTenantSchoolLogo = async (schoolId, fileBuffer, mimeType, actorUserId) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw ApiError.notFound('School not found');

  // Delete previous Cloudinary image if present
  if (school.logoUrl) {
    await deleteCloudinaryImage(school.logoUrl);
  }

  // Compress image <= 20KB and upload to Cloudinary
  const uploadResult = await compressAndUploadLogo(fileBuffer, mimeType);

  const updatedSchool = await prisma.school.update({
    where: { id: schoolId },
    data: { logoUrl: uploadResult.secure_url },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'UPDATE_SCHOOL_LOGO',
      entityType: 'School',
      entityId: schoolId,
      oldValues: { logoUrl: school.logoUrl },
      newValues: { logoUrl: uploadResult.secure_url, bytes: uploadResult.bytes },
    },
  }).catch(() => { });

  return {
    school: updatedSchool,
    logoUrl: uploadResult.secure_url,
    sizeKb: (uploadResult.bytes / 1024).toFixed(2),
  };
};

/**
 * Tenant School Owner: Delete school logo from Cloudinary and set DB logoUrl to null.
 */
export const deleteTenantSchoolLogo = async (schoolId, actorUserId) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw ApiError.notFound('School not found');

  if (school.logoUrl) {
    await deleteCloudinaryImage(school.logoUrl);
  }

  const updatedSchool = await prisma.school.update({
    where: { id: schoolId },
    data: { logoUrl: null },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'DELETE_SCHOOL_LOGO',
      entityType: 'School',
      entityId: schoolId,
      oldValues: { logoUrl: school.logoUrl },
      newValues: { logoUrl: null },
    },
  }).catch(() => { });

  return { message: 'School logo deleted successfully', school: updatedSchool };
};

/**
 * Super Admin: Generate dynamic CAPTCHA challenge for school hard deletion.
 */
export const generateHardDeleteCaptcha = async (schoolId) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    throw ApiError.notFound('School not found');
  }

  // Generate random math expression (e.g. 35 + 24)
  const num1 = Math.floor(Math.random() * 80) + 10;
  const num2 = Math.floor(Math.random() * 80) + 10;
  const mathAnswer = String(num1 + num2);
  const mathQuestion = `${num1} + ${num2}`;

  // Generate random security code (e.g. 6 chars)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let securityCode = '';
  for (let i = 0; i < 6; i++) {
    securityCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const secret = process.env.JWT_SECRET || 'hard_delete_captcha_secret';
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

  const captchaToken = jwt.sign(
    {
      schoolId,
      mathAnswer,
      securityCode,
      exp: Math.floor(expiresAt / 1000),
    },
    secret
  );

  return {
    captchaToken,
    schoolId: school.id,
    schoolName: school.name,
    schoolCode: school.code,
    mathQuestion,
    securityCode,
    expiresAt: new Date(expiresAt).toISOString(),
  };
};

/**
 * Super Admin: Execute Permanent Hard Delete for a school tenant.
 */
export const hardDeleteSchool = async (schoolId, payload, actorUserId) => {
  const { confirmSchoolName, confirmSchoolCode, confirmPhrase, captchaToken, captchaAnswer } = payload;

  // 1. Verify school exists
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      admins: { select: { userId: true } },
      students: { select: { photoUrl: true } },
    },
  });

  if (!school) {
    throw ApiError.notFound('School not found');
  }

  // 2. Validate exact string matches
  if (confirmSchoolName.trim() !== school.name) {
    throw ApiError.badRequest('Confirmation school name does not match the target school name.');
  }

  if (confirmSchoolCode.trim() !== school.code) {
    throw ApiError.badRequest('Confirmation school code does not match the target school code.');
  }

  if (confirmPhrase.trim() !== 'PERMANENTLY DELETE') {
    throw ApiError.badRequest('Confirmation phrase must be PERMANENTLY DELETE.');
  }

  // 3. Verify CAPTCHA token
  const secret = process.env.JWT_SECRET || 'hard_delete_captcha_secret';
  let decodedToken;
  try {
    decodedToken = jwt.verify(captchaToken, secret);
  } catch (err) {
    throw ApiError.badRequest('CAPTCHA verification code has expired or is invalid. Please request a new CAPTCHA.');
  }

  if (decodedToken.schoolId !== schoolId) {
    throw ApiError.badRequest('CAPTCHA verification token does not match target school.');
  }

  const normalizedAnswer = captchaAnswer.trim().toUpperCase();
  const validMath = normalizedAnswer === decodedToken.mathAnswer.toUpperCase();
  const validCode = normalizedAnswer === decodedToken.securityCode.toUpperCase();

  if (!validMath && !validCode) {
    throw ApiError.badRequest('Incorrect CAPTCHA answer. Please solve the challenge correctly.');
  }

  // 4. Collect linked user IDs to purge orphan user accounts later
  const schoolUserIds = school.admins.map((a) => a.userId);

  // 5. Delete Cloudinary images if present
  if (school.logoUrl) {
    await deleteCloudinaryImage(school.logoUrl).catch(() => {});
  }
  for (const student of school.students) {
    if (student.photoUrl) {
      await deleteCloudinaryImage(student.photoUrl).catch(() => {});
    }
  }

  // 6. Perform permanent deletion in a single atomic transaction
  await prisma.$transaction(async (tx) => {
    // Delete non-cascading relations that use SetNull by default
    await tx.userSession.deleteMany({ where: { schoolId } });
    await tx.termsAcceptance.deleteMany({ where: { schoolId } });
    await tx.auditLog.deleteMany({ where: { schoolId } });

    // Hard delete the School record (cascading deletes all child records)
    await tx.school.delete({ where: { id: schoolId } });

    // Clean up orphaned User accounts (users associated with this school who have no remaining admin memberships and are not SUPER_ADMIN)
    if (schoolUserIds.length > 0) {
      for (const userId of schoolUserIds) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: { _count: { select: { schoolAdmins: true } } },
        });

        if (user && user.role !== 'SUPER_ADMIN' && user._count.schoolAdmins === 0) {
          await tx.user.delete({ where: { id: userId } }).catch(() => {});
        }
      }
    }

    // Record system audit log for the HARD_DELETE action
    await tx.auditLog.create({
      data: {
        userId: actorUserId,
        action: 'HARD_DELETE_SCHOOL',
        entityType: 'School',
        entityId: schoolId,
        oldValues: {
          schoolId: school.id,
          name: school.name,
          code: school.code,
          email: school.email,
        },
        newValues: {
          deletedAt: new Date(),
          deletedBy: actorUserId,
          reason: 'Hard deleted permanently by Super Admin',
        },
      },
    });
  });

  return {
    success: true,
    message: `School "${school.name}" (${school.code}) and all related data have been permanently deleted.`,
  };
};



