import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPaymentProvider } from '../../services/paymentProvider.js';
import { memoryCache } from '../../utils/cache.js';

/**
 * Get current active or latest subscription for a school.
 * Cached for 30 seconds to speed up routing & checks.
 */
export const getCurrentSubscription = async (schoolId) => {
  const cacheKey = `subscription:current:${schoolId}`;
  return await memoryCache.getOrSet(cacheKey, async () => {
    const latestSubscription = await prisma.schoolSubscription.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            badge: true,
            offerTitle: true,
            offerDescription: true,
            features: true,
          },
        },
      },
    });

    if (!latestSubscription) {
      return {
        school: null,
        subscription: null,
        status: 'EXPIRED',
        remainingDays: 0,
      };
    }

    const now = new Date();
    const endDate = latestSubscription.endDate ? new Date(latestSubscription.endDate) : null;
    const diffTime = endDate ? endDate.getTime() - now.getTime() : 0;
    const rawDays = endDate ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;
    const remainingDays = Math.max(0, rawDays);

    let status = latestSubscription.status;
    if (status === 'EXPIRED' || status === 'SUSPENDED' || status === 'CANCELLED') {
      // Keep explicit expired/suspended/cancelled status
    } else if (!endDate || remainingDays === 0 || endDate < now) {
      if (status === 'ACTIVE') {
        status = 'EXPIRED';
      }
    }

    return {
      school: null,
      subscription: {
        id: latestSubscription.id,
        schoolId: latestSubscription.schoolId,
        planId: latestSubscription.planId,
        planName: latestSubscription.planNameSnapshot,
        duration: latestSubscription.durationSnapshot,
        basePrice: Number(latestSubscription.basePriceSnapshot),
        discount: Number(latestSubscription.discountSnapshot),
        finalPrice: Number(latestSubscription.finalPriceSnapshot),
        status,
        startDate: latestSubscription.startDate,
        endDate: latestSubscription.endDate,
        nextBillingDate: latestSubscription.nextBillingDate,
        autoRenew: latestSubscription.autoRenew,
        paymentStatus: latestSubscription.paymentStatus,
        paymentProvider: latestSubscription.paymentProvider,
        remarks: latestSubscription.remarks,
        createdAt: latestSubscription.createdAt,
        planDetails: latestSubscription.plan,
      },
      status,
      remainingDays,
    };
  }, 30);
};

/**
 * Get available paid plans for authenticated school purchase page.
 * Cached for 5 minutes (300 seconds).
 */
export const getActivePaidPlans = async () => {
  return await memoryCache.getOrSet('plans:active:paid', async () => {
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
        isTrial: false,
      },
      orderBy: { displayOrder: 'asc' },
    });

    return plans.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      type: p.type,
      durationValue: p.durationValue,
      durationUnit: p.durationUnit,
      basePrice: Number(p.basePrice),
      discountPercentage: Number(p.discountPercentage),
      discountAmount: Number(p.discountAmount),
      finalPrice: Number(p.finalPrice),
      currency: p.currency,
      description: p.description,
      features: p.features,
      offerTitle: p.offerTitle,
      offerDescription: p.offerDescription,
      badge: p.badge,
      displayOrder: p.displayOrder,
    }));
  }, 300);
};

/**
 * Public marketing plans (includes trial info for landing page).
 */
export const getPublicLandingPlans = async () => {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' },
  });

  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    code: p.code,
    type: p.type,
    durationValue: p.durationValue,
    durationUnit: p.durationUnit,
    basePrice: Number(p.basePrice),
    discountPercentage: Number(p.discountPercentage),
    discountAmount: Number(p.discountAmount),
    finalPrice: Number(p.finalPrice),
    currency: p.currency,
    description: p.description,
    features: p.features,
    offerTitle: p.offerTitle,
    offerDescription: p.offerDescription,
    badge: p.badge,
    isTrial: p.isTrial,
  }));
};

/**
 * Public registered schools list for landing page clients section.
 * Includes all active registered schools regardless of subscription status.
 */
export const getPublicRegisteredSchools = async () => {
  const schools = await prisma.school.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      code: true,
      logoUrl: true,
      district: true,
      state: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return schools;
};

/**
 * Submit purchase request for a plan (Cash or UPI).
 */
export const submitPurchaseRequest = async (schoolId, data, actorUserId) => {
  const { planId, paymentMethod, referenceNumber, remarks } = data;

  if (!planId) {
    throw ApiError.badRequest('Plan ID is mandatory');
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan || !plan.isActive) {
    throw ApiError.badRequest('This subscription plan is no longer available');
  }

  if (plan.isTrial) {
    throw ApiError.badRequest('The free trial plan cannot be purchased.');
  }

  const providerType = paymentMethod === 'RAZORPAY' ? 'RAZORPAY' : 'MANUAL';
  const provider = getPaymentProvider(providerType);

  await provider.createOrder({
    amount: plan.finalPrice,
    currency: plan.currency,
    referenceNumber,
    paymentMethod,
  });

  // Check if there is already a pending payment request for this school
  const existingPending = await prisma.subscriptionPayment.findFirst({
    where: {
      schoolId,
      status: 'PENDING',
    },
  });

  if (existingPending) {
    throw ApiError.conflict('You already have a pending payment request awaiting Super Admin approval.');
  }

  const currentSub = await prisma.schoolSubscription.findFirst({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
  });

  const paymentRecord = await prisma.subscriptionPayment.create({
    data: {
      schoolId,
      subscriptionId: currentSub?.id || null,
      planId: plan.id,
      amount: plan.finalPrice,
      currency: plan.currency,
      paymentMethod,
      status: 'PENDING',
      referenceNumber: referenceNumber?.trim() || null,
      provider: providerType,
      remarks: remarks?.trim() || null,
      requestedAt: new Date(),
    },
    include: {
      plan: {
        select: { id: true, name: true, code: true, durationValue: true, durationUnit: true },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId,
      userId: actorUserId,
      action: 'SUBSCRIPTION_PURCHASE_REQUESTED',
      entityType: 'SubscriptionPayment',
      entityId: paymentRecord.id,
      newValues: {
        planId: plan.id,
        planName: plan.name,
        amount: Number(plan.finalPrice),
        paymentMethod,
        referenceNumber: referenceNumber || null,
      },
    },
  });

  memoryCache.delPattern(`subscription:${schoolId}`);

  return {
    payment: {
      id: paymentRecord.id,
      planName: paymentRecord.plan.name,
      amount: Number(paymentRecord.amount),
      currency: paymentRecord.currency,
      paymentMethod: paymentRecord.paymentMethod,
      referenceNumber: paymentRecord.referenceNumber,
      status: paymentRecord.status,
      requestedAt: paymentRecord.requestedAt,
    },
    message:
      paymentMethod === 'CASH'
        ? 'Cash payment request submitted. It will be activated after Super Admin verification.'
        : 'UPI payment request submitted with reference number. Awaiting Super Admin verification.',
  };
};

/**
 * Get payment requests for school.
 */
export const getSchoolPaymentRequests = async (schoolId) => {
  const payments = await prisma.subscriptionPayment.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: {
        select: { name: true, durationValue: true, durationUnit: true },
      },
      approvedBy: {
        select: { name: true, email: true },
      },
    },
  });

  return payments.map((p) => ({
    id: p.id,
    planName: p.plan.name,
    amount: Number(p.amount),
    currency: p.currency,
    paymentMethod: p.paymentMethod,
    referenceNumber: p.referenceNumber,
    status: p.status,
    rejectionReason: p.rejectionReason,
    remarks: p.remarks,
    requestedAt: p.requestedAt,
    approvedAt: p.approvedAt,
    approvedBy: p.approvedBy ? p.approvedBy.name : null,
  }));
};

/**
 * Get subscription history for school.
 */
export const getSchoolSubscriptionHistory = async (schoolId) => {
  const subscriptions = await prisma.schoolSubscription.findMany({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    include: {
      plan: {
        select: { name: true, code: true },
      },
    },
  });

  return subscriptions.map((s) => ({
    id: s.id,
    planName: s.planNameSnapshot,
    duration: s.durationSnapshot,
    basePrice: Number(s.basePriceSnapshot),
    discount: Number(s.discountSnapshot),
    finalPrice: Number(s.finalPriceSnapshot),
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    paymentStatus: s.paymentStatus,
    paymentProvider: s.paymentProvider,
    createdAt: s.createdAt,
  }));
};
