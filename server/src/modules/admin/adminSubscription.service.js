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
 * Super Admin: Approve pending payment request.
 * Transactional: Marks payment PAID and creates/activates subscription with snapshots.
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
      orderBy: { endDate: 'desc' },
    });

    const now = new Date();
    let startDate = now;

    // Renewal starts after current subscription ends
    if (currentSub && currentSub.endDate && new Date(currentSub.endDate) > now) {
      startDate = new Date(currentSub.endDate);
    }

    const durationVal = payment.plan.durationValue;
    const durationUnit = payment.plan.durationUnit;
    const endDate = calculateSubscriptionEndDate(startDate, durationUnit, durationVal);

    const durationSnapshotStr = `${durationVal} ${durationUnit.toLowerCase()}${durationVal > 1 ? 's' : ''}`;

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
        action: currentSub ? 'SUBSCRIPTION_RENEWED' : 'SUBSCRIPTION_PAYMENT_APPROVED',
        entityType: 'SchoolSubscription',
        entityId: newSub.id,
        newValues: {
          paymentId,
          planName: payment.plan.name,
          amount: Number(payment.amount),
          startDate,
          endDate,
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
    amount = 0,
    paymentMethod = 'CASH',
    referenceNumber,
    remarks,
    isComplimentary = false,
    complimentaryReason,
  } = data;

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) throw ApiError.notFound('School not found');

  let planName = 'Custom Plan';
  let basePrice = Number(amount);
  let discount = 0;

  let targetPlan = null;
  if (planId) {
    targetPlan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (targetPlan) {
      planName = targetPlan.name;
      basePrice = Number(targetPlan.basePrice);
      discount = Number(targetPlan.discountAmount);
    }
  }

  const start = startDate ? new Date(startDate) : new Date();
  let end = null;
  if (endDate) {
    end = new Date(endDate);
  } else if (targetPlan) {
    end = calculateSubscriptionEndDate(start, targetPlan.durationUnit, targetPlan.durationValue);
  } else {
    end = calculateSubscriptionEndDate(start, 'MONTH', 1);
  }
  const finalPrice = isComplimentary ? 0 : Number(amount);

  return await prisma.$transaction(async (tx) => {
    const sub = await tx.schoolSubscription.create({
      data: {
        schoolId,
        planId: planId || null,
        planNameSnapshot: isComplimentary ? `${planName} (Complimentary)` : planName,
        durationSnapshot: 'Custom Duration',
        basePriceSnapshot: basePrice,
        discountSnapshot: isComplimentary ? basePrice : discount,
        finalPriceSnapshot: finalPrice,
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
        planId: planId || (await tx.subscriptionPlan.findFirst({ where: { isTrial: false } })).id,
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
          isComplimentary,
        },
      },
    });

    return sub;
  });
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

