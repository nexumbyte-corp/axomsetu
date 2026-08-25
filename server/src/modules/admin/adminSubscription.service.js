import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { calculateSubscriptionEndDate } from '../../utils/subscriptionUtils.js';
import { memoryCache } from '../../utils/cache.js';

/**
 * Super Admin: List all subscription plans.
 */
export const listPlans = async () => {
  return await prisma.subscriptionPlan.findMany({
    orderBy: { displayOrder: 'asc' },
  });
};

/**
 * Super Admin: Get subscription details by ID.
 */
export const getSubscriptionById = async (id) => {
  const sub = await prisma.schoolSubscription.findUnique({
    where: { id },
    include: {
      school: true,
      plan: true,
    },
  });
  if (!sub) {
    throw ApiError.notFound('Subscription record not found');
  }
  return sub;
};

/**
 * Super Admin: Create a subscription plan.
 */
export const createPlan = async (data, actorUserId) => {
  const {
    name,
    code,
    type,
    durationValue,
    durationUnit = 'MONTH',
    basePrice,
    discountPercentage = 0,
    discountAmount = 0,
    currency = 'INR',
    description,
    features = [],
    offerTitle,
    offerDescription,
    badge,
    maxStudentLimit = null,
    isEnterprise = false,
    isTrial = false,
    isActive = true,
    displayOrder = 0,
  } = data;

  if (!name || !code || !type || durationValue === undefined || basePrice === undefined) {
    throw ApiError.badRequest('Missing mandatory plan fields (name, code, type, durationValue, basePrice)');
  }

  const existingCode = await prisma.subscriptionPlan.findUnique({
    where: { code: code.trim().toUpperCase() },
  });
  if (existingCode) {
    throw ApiError.conflict('A plan with this code already exists');
  }

  const numBase = Number(basePrice);
  const numDiscAmount = Number(discountAmount);
  const calculatedFinal = Math.max(0, numBase - numDiscAmount);
  const parsedStudentLimit = maxStudentLimit !== undefined && maxStudentLimit !== null && maxStudentLimit !== '' && Number(maxStudentLimit) > 0
    ? parseInt(maxStudentLimit, 10)
    : null;

  const plan = await prisma.subscriptionPlan.create({
    data: {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      type,
      durationValue: Number(durationValue),
      durationUnit,
      basePrice: numBase,
      discountPercentage: Number(discountPercentage),
      discountAmount: numDiscAmount,
      finalPrice: calculatedFinal,
      currency,
      description: description?.trim() || null,
      features,
      offerTitle: offerTitle?.trim() || null,
      offerDescription: offerDescription?.trim() || null,
      badge: badge?.trim() || null,
      maxStudentLimit: parsedStudentLimit,
      isEnterprise: Boolean(isEnterprise) || type === 'ENTERPRISE',
      isTrial,
      isActive,
      displayOrder: Number(displayOrder),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      action: 'SUBSCRIPTION_PLAN_CREATED',
      entityType: 'SubscriptionPlan',
      entityId: plan.id,
      newValues: { code: plan.code, name: plan.name, finalPrice: Number(plan.finalPrice) },
    },
  });

  memoryCache.invalidatePrefix('plans:');

  return plan;
};

/**
 * Super Admin: Update a plan.
 */
export const updatePlan = async (planId, data, actorUserId) => {
  const existing = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });
  if (!existing) {
    throw ApiError.notFound('Plan not found');
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.durationValue !== undefined) updateData.durationValue = Number(data.durationValue);
  if (data.durationUnit !== undefined) updateData.durationUnit = data.durationUnit;
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.features !== undefined) updateData.features = data.features;
  if (data.offerTitle !== undefined) updateData.offerTitle = data.offerTitle?.trim() || null;
  if (data.offerDescription !== undefined) updateData.offerDescription = data.offerDescription?.trim() || null;
  if (data.badge !== undefined) updateData.badge = data.badge?.trim() || null;
  if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
  if (data.displayOrder !== undefined) updateData.displayOrder = Number(data.displayOrder);

  if (data.maxStudentLimit !== undefined) {
    updateData.maxStudentLimit = data.maxStudentLimit !== null && data.maxStudentLimit !== '' && Number(data.maxStudentLimit) > 0
      ? parseInt(data.maxStudentLimit, 10)
      : null;
  }
  if (data.isEnterprise !== undefined) {
    updateData.isEnterprise = Boolean(data.isEnterprise);
  }

  let numBase = data.basePrice !== undefined ? Number(data.basePrice) : Number(existing.basePrice);
  let numDiscAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : Number(existing.discountAmount);
  let numDiscPercent = data.discountPercentage !== undefined ? Number(data.discountPercentage) : Number(existing.discountPercentage);

  if (data.basePrice !== undefined || data.discountAmount !== undefined) {
    updateData.basePrice = numBase;
    updateData.discountAmount = numDiscAmount;
    updateData.discountPercentage = numDiscPercent;
    updateData.finalPrice = Math.max(0, numBase - numDiscAmount);
  }

  const updatedPlan = await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      action: 'SUBSCRIPTION_PLAN_UPDATED',
      entityType: 'SubscriptionPlan',
      entityId: planId,
      oldValues: { name: existing.name, basePrice: Number(existing.basePrice) },
      newValues: { name: updatedPlan.name, basePrice: Number(updatedPlan.basePrice) },
    },
  });

  memoryCache.invalidatePrefix('plans:');

  return updatedPlan;
};

/**
 * Super Admin: Toggle plan active status.
 */
export const togglePlanStatus = async (planId, isActive, actorUserId) => {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw ApiError.notFound('Plan not found');

  const updated = await prisma.subscriptionPlan.update({
    where: { id: planId },
    data: { isActive },
  });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      action: isActive ? 'SUBSCRIPTION_PLAN_ACTIVATED' : 'SUBSCRIPTION_PLAN_DEACTIVATED',
      entityType: 'SubscriptionPlan',
      entityId: planId,
      newValues: { isActive },
    },
  });

  memoryCache.invalidatePrefix('plans:');

  return updated;
};

/**
 * Super Admin: List all pending payment requests.
 */
export const listPendingPayments = async ({ page = 1, limit = 20, status, search }) => {
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const numLimit = Math.max(1, parseInt(limit, 10) || 20);

  const where = {};
  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { referenceNumber: { contains: search, mode: 'insensitive' } },
      { school: { name: { contains: search, mode: 'insensitive' } } },
      { school: { code: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const skip = (numPage - 1) * numLimit;

  const [total, items] = await Promise.all([
    prisma.subscriptionPayment.count({ where }),
    prisma.subscriptionPayment.findMany({
      where,
      skip,
      take: numLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        school: {
          select: { id: true, name: true, code: true, email: true, phone: true },
        },
        plan: {
          select: { id: true, name: true, durationValue: true, durationUnit: true, type: true },
        },
        approvedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
  ]);

  return {
    items: items.map((p) => ({
      id: p.id,
      schoolId: p.schoolId,
      schoolName: p.school.name,
      schoolCode: p.school.code,
      schoolEmail: p.school.email,
      planId: p.planId,
      planName: p.plan.name,
      amount: Number(p.amount),
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      status: p.status,
      referenceNumber: p.referenceNumber,
      rejectionReason: p.rejectionReason,
      remarks: p.remarks,
      requestedAt: p.requestedAt,
      approvedAt: p.approvedAt,
      approvedBy: p.approvedBy ? p.approvedBy.name : null,
    })),
    pagination: {
      total,
      page: numPage,
      limit: numLimit,
      totalPages: Math.ceil(total / numLimit) || 1,
    },
  };
};

/**
 * Calculates additional credit days when upgrading/switching an active subscription.
 * Note: If current plan is a TRIAL (or free plan with 0 price), ALL remaining trial days are directly added to the new plan!
 */
export const calculateProRataDaysCredit = (activeSub, newFinalPrice, newBaseDurationDays) => {
  if (!activeSub || !activeSub.endDate || !activeSub.startDate) {
    return 0;
  }

  const now = new Date();
  const subEndDate = new Date(activeSub.endDate);

  if (subEndDate <= now) {
    return 0;
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  const remainingDays = Math.max(0, Math.ceil((subEndDate.getTime() - now.getTime()) / msPerDay));
  if (remainingDays <= 0) return 0;

  const oldPrice = Number(activeSub.finalPriceSnapshot || 0);
  const isTrial = Boolean(activeSub.plan?.isTrial) ||
                  activeSub.planNameSnapshot?.toLowerCase().includes('trial') ||
                  (activeSub.isEnterpriseSnapshot === false && oldPrice === 0);

  // If active subscription is a TRIAL (or free plan), directly add ALL remaining trial days!
  if (isTrial || oldPrice === 0) {
    return remainingDays;
  }

  // Otherwise, perform pro-rata monetary conversion for paid plans
  const subStartDate = new Date(activeSub.startDate);
  const totalOldDays = Math.max(1, Math.ceil((subEndDate.getTime() - subStartDate.getTime()) / msPerDay));
  const oldDailyRate = oldPrice / totalOldDays;
  const unusedCredit = remainingDays * oldDailyRate;

  const newPrice = Number(newFinalPrice || 0);
  const newDays = Math.max(1, Number(newBaseDurationDays || 30));

  if (newPrice <= 0 || newDays <= 0 || unusedCredit <= 0) {
    return remainingDays;
  }

  const newDailyRate = newPrice / newDays;
  const extraCreditDays = Math.round(unusedCredit / newDailyRate);

  return Math.max(0, extraCreditDays);
};

/**
 * Super Admin: Approve pending payment request.
 * Transactional: Marks payment PAID and creates/activates subscription with snapshots and pro-rata credit.
 */
export const approvePayment = async (paymentId, adminId) => {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
    include: {
      plan: true,
      school: true,
    },
  });

  if (!payment) {
    throw ApiError.notFound('Payment request not found');
  }

  if (payment.status !== 'PENDING') {
    throw ApiError.badRequest(`This payment request is already ${payment.status.toLowerCase()}`);
  }

  return await prisma.$transaction(async (tx) => {
    // Check if school currently has an active subscription
    const currentSub = await tx.schoolSubscription.findFirst({
      where: {
        schoolId: payment.schoolId,
        status: 'ACTIVE',
        endDate: { not: null, gt: new Date() },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    const now = new Date();
    const startDate = now;

    const durationVal = payment.plan.durationValue;
    const durationUnit = payment.plan.durationUnit;
    let endDate = calculateSubscriptionEndDate(startDate, durationUnit, durationVal);

    let extraDaysFromRollOver = 0;
    if (currentSub) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const baseDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay));
      extraDaysFromRollOver = calculateProRataDaysCredit(currentSub, payment.amount, baseDays);

      if (extraDaysFromRollOver > 0) {
        endDate.setDate(endDate.getDate() + extraDaysFromRollOver);
      }

      // Mark previous subscription as EXPIRED (replaced)
      await tx.schoolSubscription.update({
        where: { id: currentSub.id },
        data: {
          status: 'EXPIRED',
          remarks: currentSub.remarks
            ? `${currentSub.remarks} | Replaced by new plan with +${extraDaysFromRollOver} pro-rata credit days`
            : `Replaced by new plan with +${extraDaysFromRollOver} pro-rata credit days`,
        },
      });
    }

    const durationSnapshotStr = extraDaysFromRollOver > 0
      ? `${durationVal} ${durationUnit.toLowerCase()}${durationVal > 1 ? 's' : ''} (+${extraDaysFromRollOver} credit days)`
      : `${durationVal} ${durationUnit.toLowerCase()}${durationVal > 1 ? 's' : ''}`;

    // Create Subscription
    const newSub = await tx.schoolSubscription.create({
      data: {
        schoolId: payment.schoolId,
        planId: payment.planId,
        planNameSnapshot: payment.plan.name,
        durationSnapshot: durationSnapshotStr,
        basePriceSnapshot: payment.plan.basePrice,
        discountSnapshot: payment.plan.discountAmount,
        finalPriceSnapshot: payment.amount,
        maxStudentLimitSnapshot: payment.plan.maxStudentLimit,
        isEnterpriseSnapshot: payment.plan.isEnterprise,
        status: 'ACTIVE',
        startDate,
        endDate,
        paymentStatus: 'PAID',
        paymentProvider: payment.provider,
        remarks: payment.remarks,
      },
    });

    // Update payment record
    const updatedPayment = await tx.subscriptionPayment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        subscriptionId: newSub.id,
        approvedAt: now,
        approvedById: adminId,
      },
    });

    await tx.auditLog.create({
      data: {
        schoolId: payment.schoolId,
        userId: adminId,
        action: currentSub ? 'SUBSCRIPTION_UPGRADED_PRO_RATA' : 'SUBSCRIPTION_PAYMENT_APPROVED',
        entityType: 'SchoolSubscription',
        entityId: newSub.id,
        newValues: {
          paymentId,
          planName: payment.plan.name,
          amount: Number(payment.amount),
          startDate,
          endDate,
          extraDaysFromRollOver,
        },
      },
    });

    return {
      payment: updatedPayment,
      subscription: newSub,
    };
  });
};

/**
 * Super Admin: Reject payment request with reason.
 */
export const rejectPayment = async (paymentId, reason, adminId) => {
  if (!reason || !reason.trim()) {
    throw ApiError.badRequest('Rejection reason is mandatory');
  }

  const payment = await prisma.subscriptionPayment.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw ApiError.notFound('Payment request not found');
  }

  if (payment.status !== 'PENDING') {
    throw ApiError.badRequest(`This payment request is already ${payment.status.toLowerCase()}`);
  }

  const updatedPayment = await prisma.subscriptionPayment.update({
    where: { id: paymentId },
    data: {
      status: 'REJECTED',
      rejectionReason: reason.trim(),
      approvedAt: new Date(),
      approvedById: adminId,
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId: payment.schoolId,
      userId: adminId,
      action: 'SUBSCRIPTION_PAYMENT_REJECTED',
      entityType: 'SubscriptionPayment',
      entityId: paymentId,
      newValues: { rejectionReason: reason.trim() },
    },
  });

  return updatedPayment;
};

/**
 * Super Admin: Extend a school subscription end date.
 */
export const extendSubscription = async (subscriptionId, { addDays, newEndDate, reason }, adminId) => {
  if (!reason || !reason.trim()) {
    throw ApiError.badRequest('Extension reason is mandatory');
  }

  const subscription = await prisma.schoolSubscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    throw ApiError.notFound('Subscription not found');
  }

  let targetEndDate = new Date(subscription.endDate);
  if (newEndDate) {
    targetEndDate = new Date(newEndDate);
  } else if (addDays) {
    targetEndDate.setDate(targetEndDate.getDate() + Number(addDays));
  } else {
    throw ApiError.badRequest('Must specify either addDays or newEndDate');
  }

  const updatedSub = await prisma.schoolSubscription.update({
    where: { id: subscriptionId },
    data: {
      endDate: targetEndDate,
      status: targetEndDate > new Date() ? 'ACTIVE' : subscription.status,
      remarks: subscription.remarks ? `${subscription.remarks} | Extends: ${reason}` : `Extension: ${reason}`,
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId: subscription.schoolId,
      userId: adminId,
      action: 'SUBSCRIPTION_EXTENDED',
      entityType: 'SchoolSubscription',
      entityId: subscriptionId,
      oldValues: { endDate: subscription.endDate },
      newValues: { endDate: targetEndDate, reason: reason.trim() },
    },
  });

  return updatedSub;
};

/**
 * Super Admin: Manually create/assign a subscription for a school.
 */
export const createManualSubscription = async (schoolId, data, adminId) => {
  const {
    planId,
    startDate,
    endDate,
    durationMonths,
    amount = 0,
    maxStudentLimit,
    isEnterprise = false,
    paymentMethod = 'CASH',
    referenceNumber,
    remarks,
    isComplimentary = false,
    complimentaryReason,
  } = data;

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw ApiError.notFound('School not found');

  let planName = isEnterprise ? 'Enterprise Plan' : 'Custom Plan';
  let basePrice = Number(amount);
  let discount = 0;
  let defaultLimit = maxStudentLimit !== undefined && maxStudentLimit !== null && maxStudentLimit !== ''
    ? (Number(maxStudentLimit) > 0 ? parseInt(maxStudentLimit, 10) : null)
    : null;

  let targetPlan = null;
  if (planId) {
    targetPlan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (targetPlan) {
      planName = targetPlan.name;
      basePrice = Number(targetPlan.basePrice);
      discount = Number(targetPlan.discountAmount);
      if (defaultLimit === null && targetPlan.maxStudentLimit) {
        defaultLimit = targetPlan.maxStudentLimit;
      }
    }
  }

  const start = startDate ? new Date(startDate) : new Date();
  let end = null;
  if (endDate) {
    end = new Date(endDate);
  } else if (durationMonths && Number(durationMonths) > 0) {
    end = new Date(start);
    end.setMonth(end.getMonth() + parseInt(durationMonths, 10));
  } else if (targetPlan) {
    end = calculateSubscriptionEndDate(start, targetPlan.durationUnit, targetPlan.durationValue);
  } else {
    end = calculateSubscriptionEndDate(start, 'MONTH', 1);
  }
  const finalPrice = isComplimentary ? 0 : Number(amount);
  const durationText = durationMonths ? `${durationMonths} month(s)` : 'Custom Duration';

  return await prisma.$transaction(async (tx) => {
    // Check if school currently has an active subscription to calculate pro-rata credit days
    const currentSub = await tx.schoolSubscription.findFirst({
      where: {
        schoolId,
        status: 'ACTIVE',
        endDate: { not: null, gt: new Date() },
      },
      include: { plan: true },
      orderBy: { endDate: 'desc' },
    });

    let extraDaysFromRollOver = 0;
    if (currentSub && end && start) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const baseDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / msPerDay));
      extraDaysFromRollOver = calculateProRataDaysCredit(currentSub, finalPrice, baseDays);

      if (extraDaysFromRollOver > 0) {
        end.setDate(end.getDate() + extraDaysFromRollOver);
      }

      // Expire previous active subscription as requested
      await tx.schoolSubscription.update({
        where: { id: currentSub.id },
        data: {
          status: 'EXPIRED',
          remarks: currentSub.remarks
            ? `${currentSub.remarks} | Replaced by new subscription with +${extraDaysFromRollOver} pro-rata credit days`
            : `Replaced by new subscription with +${extraDaysFromRollOver} pro-rata credit days`,
        },
      });
    }

    const durationText = extraDaysFromRollOver > 0
      ? `${durationMonths ? `${durationMonths} month(s)` : 'Custom'} (+${extraDaysFromRollOver} credit days)`
      : (durationMonths ? `${durationMonths} month(s)` : 'Custom Duration');

    const sub = await tx.schoolSubscription.create({
      data: {
        schoolId,
        planId: planId || null,
        planNameSnapshot: isComplimentary ? `${planName} (Complimentary)` : planName,
        durationSnapshot: durationText,
        basePriceSnapshot: basePrice,
        discountSnapshot: isComplimentary ? basePrice : discount,
        finalPriceSnapshot: finalPrice,
        maxStudentLimitSnapshot: defaultLimit,
        isEnterpriseSnapshot: Boolean(isEnterprise) || (targetPlan?.type === 'ENTERPRISE'),
        status: 'ACTIVE',
        startDate: start,
        endDate: end,
        paymentStatus: 'PAID',
        paymentProvider: 'MANUAL',
        remarks: isComplimentary ? `COMPLIMENTARY: ${complimentaryReason || remarks || 'Special admin grant'}` : remarks,
      },
    });

    await tx.subscriptionPayment.create({
      data: {
        schoolId,
        subscriptionId: sub.id,
        planId: planId || (await tx.subscriptionPlan.findFirst({ where: { isTrial: false } }))?.id || null,
        amount: finalPrice,
        currency: 'INR',
        paymentMethod: isComplimentary ? 'OTHER' : paymentMethod,
        status: 'PAID',
        referenceNumber: referenceNumber || (isComplimentary ? 'COMPLIMENTARY' : null),
        provider: 'MANUAL',
        remarks: isComplimentary ? `COMPLIMENTARY: ${complimentaryReason}` : remarks,
        requestedAt: start,
        approvedAt: new Date(),
        approvedById: adminId,
      },
    });

    await tx.auditLog.create({
      data: {
        schoolId,
        userId: adminId,
        action: isComplimentary ? 'COMPLIMENTARY_SUBSCRIPTION_GRANTED' : 'SUBSCRIPTION_CREATED',
        entityType: 'SchoolSubscription',
        entityId: sub.id,
        newValues: {
          planName,
          amount: finalPrice,
          startDate: start,
          endDate: end,
          extraDaysFromRollOver,
          isComplimentary,
        },
      },
    });

    return sub;
  });
};

/**
 * Super Admin: Update subscription details (Student Capacity Limit, Expiry Date, Status, Price).
 */
export const updateSubscriptionDetails = async (subscriptionId, data, adminId) => {
  const existing = await prisma.schoolSubscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!existing) throw ApiError.notFound('Subscription not found');

  const { maxStudentLimit, finalPrice, endDate, status, remarks } = data;

  const updateData = {};
  if (maxStudentLimit !== undefined) {
    updateData.maxStudentLimitSnapshot = (maxStudentLimit === '' || maxStudentLimit === null || Number(maxStudentLimit) <= 0)
      ? null
      : parseInt(maxStudentLimit, 10);
  }
  if (finalPrice !== undefined && finalPrice !== '') {
    updateData.finalPriceSnapshot = Number(finalPrice);
  }
  if (endDate !== undefined && endDate !== '') {
    updateData.endDate = new Date(endDate);
  }
  if (status) {
    updateData.status = status;
  }
  if (remarks !== undefined) {
    updateData.remarks = remarks;
  }

  const updated = await prisma.schoolSubscription.update({
    where: { id: subscriptionId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: {
      schoolId: existing.schoolId,
      userId: adminId,
      action: 'SUBSCRIPTION_UPDATED',
      entityType: 'SchoolSubscription',
      entityId: subscriptionId,
      oldValues: {
        maxStudentLimit: existing.maxStudentLimitSnapshot,
        status: existing.status,
        endDate: existing.endDate,
        finalPrice: Number(existing.finalPriceSnapshot),
      },
      newValues: updateData,
    },
  });

  return updated;
};

/**
 * Super Admin: List all subscriptions across schools.
 */
export const listAllSubscriptions = async ({ page = 1, limit = 20, status, search }) => {
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const numLimit = Math.max(1, parseInt(limit, 10) || 20);

  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { school: { name: { contains: search, mode: 'insensitive' } } },
      { school: { code: { contains: search, mode: 'insensitive' } } },
      { planNameSnapshot: { contains: search, mode: 'insensitive' } },
    ];
  }

  const skip = (numPage - 1) * numLimit;

  const [total, items] = await Promise.all([
    prisma.schoolSubscription.count({ where }),
    prisma.schoolSubscription.findMany({
      where,
      skip,
      take: numLimit,
      orderBy: { createdAt: 'desc' },
      include: {
        school: { select: { id: true, name: true, code: true, email: true } },
        plan: { select: { id: true, name: true, code: true } },
      },
    }),
  ]);

  return {
    items: items.map((s) => ({
      id: s.id,
      schoolId: s.schoolId,
      schoolName: s.school.name,
      schoolCode: s.school.code,
      planName: s.planNameSnapshot,
      duration: s.durationSnapshot,
      basePrice: Number(s.basePriceSnapshot),
      discount: Number(s.discountSnapshot),
      finalPrice: Number(s.finalPriceSnapshot),
      maxStudentLimit: s.maxStudentLimitSnapshot,
      isEnterprise: s.isEnterpriseSnapshot,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      paymentStatus: s.paymentStatus,
      createdAt: s.createdAt,
    })),
    pagination: {
      total,
      page: numPage,
      limit: numLimit,
      totalPages: Math.ceil(total / numLimit) || 1,
    },
  };
};

/**
 * Super Admin: Manually expire an active school subscription.
 */
export const expireSubscription = async (subscriptionId, reason = null, adminId) => {
  const existing = await prisma.schoolSubscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!existing) throw ApiError.notFound('Subscription not found');

  const remarksNote = reason ? `Manually expired by Super Admin: ${reason}` : 'Manually expired by Super Admin';

  const updated = await prisma.schoolSubscription.update({
    where: { id: subscriptionId },
    data: {
      status: 'EXPIRED',
      endDate: null,
      remarks: existing.remarks ? `${existing.remarks} | ${remarksNote}` : remarksNote,
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId: existing.schoolId,
      userId: adminId,
      action: 'SUBSCRIPTION_MANUALLY_EXPIRED',
      entityType: 'SchoolSubscription',
      entityId: subscriptionId,
      oldValues: { status: existing.status, endDate: existing.endDate },
      newValues: { status: 'EXPIRED', endDate: null, reason: reason?.trim() || null },
    },
  });

  return updated;
};

/**
 * Super Admin: Suspend, Activate, or Expire a school subscription.
 */
export const updateSubscriptionStatus = async (subscriptionId, status, reason, adminId) => {
  if (status === 'EXPIRED') {
    return await expireSubscription(subscriptionId, reason, adminId);
  }

  const existing = await prisma.schoolSubscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!existing) throw ApiError.notFound('Subscription not found');

  const updated = await prisma.schoolSubscription.update({
    where: { id: subscriptionId },
    data: {
      status,
      remarks: reason ? `Status changed to ${status}: ${reason}` : existing.remarks,
    },
  });

  const auditAction = status === 'SUSPENDED'
    ? 'SUBSCRIPTION_SUSPENDED'
    : status === 'ACTIVE'
      ? 'SUBSCRIPTION_ACTIVATED'
      : 'SUBSCRIPTION_CANCELLED';

  await prisma.auditLog.create({
    data: {
      schoolId: existing.schoolId,
      userId: adminId,
      action: auditAction,
      entityType: 'SchoolSubscription',
      entityId: subscriptionId,
      oldValues: { status: existing.status, endDate: existing.endDate },
      newValues: { status, reason },
    },
  });

  return updated;
};

/**
 * Super Admin: Delete a subscription plan safely if unused.
 */
export const deletePlan = async (planId, actorUserId) => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
    include: {
      _count: { select: { subscriptions: true } },
    },
  });

  if (!plan) throw ApiError.notFound('Subscription plan not found');

  if (plan._count.subscriptions > 0) {
    throw ApiError.badRequest(
      `Cannot delete plan '${plan.name}' because ${plan._count.subscriptions} subscription(s) are linked to it. Deactivate it instead to preserve history.`
    );
  }

  await prisma.subscriptionPlan.delete({ where: { id: planId } });

  await prisma.auditLog.create({
    data: {
      userId: actorUserId,
      action: 'SUBSCRIPTION_PLAN_DELETED',
      entityType: 'SubscriptionPlan',
      entityId: planId,
      oldValues: { name: plan.name, code: plan.code },
    },
  });

  return { message: `Plan '${plan.name}' deleted successfully` };
};

