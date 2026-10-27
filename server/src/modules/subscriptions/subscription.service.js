import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { getPaymentProvider } from '../../services/paymentProvider.js';
import { memoryCache } from '../../utils/cache.js';
import { approvePayment } from '../admin/adminSubscription.service.js';
import razorpayService from '../razorpay/razorpay.service.js';
import { env } from '../../config/env.js';

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
            maxStudentLimit: true,
            isEnterprise: true,
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

    // Also fetch current active students count for the school
    const activeStudentCount = await prisma.student.count({
      where: { schoolId, status: 'ACTIVE' },
    });

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
        maxStudentLimit: latestSubscription.maxStudentLimitSnapshot,
        isEnterprise: latestSubscription.isEnterpriseSnapshot,
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
      activeStudentCount,
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
      maxStudentLimit: p.maxStudentLimit,
      isEnterprise: p.isEnterprise,
      displayOrder: p.displayOrder,
    }));
  }, 300);
};

/**
 * Public marketing plans (includes trial info for landing page).
 * Cached for 5 minutes (300 seconds).
 */
export const getPublicLandingPlans = async () => {
  return await memoryCache.getOrSet('plans:public:landing', async () => {
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
      maxStudentLimit: p.maxStudentLimit,
      isEnterprise: p.isEnterprise,
      isTrial: p.isTrial,
    }));
  }, 300);
};

/**
 * Public registered schools list for landing page clients section.
 * Includes all active registered schools regardless of subscription status.
 * Cached for 5 minutes (300 seconds).
 */
export const getPublicRegisteredSchools = async () => {
  return await memoryCache.getOrSet('schools:public:landing', async () => {
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
  }, 300);
};

/**
 * Submit purchase request for a plan (Razorpay, UPI, or Cash).
 * Strict security rules:
 * 1. Razorpay requires verified signature and authoritative payment fetch from Razorpay API.
 * 2. Paid amount must match plan final price.
 * 3. Anti-replay check prevents reusing a transaction reference.
 * 4. Manual/UPI payments remain PENDING for Super Admin approval.
 */
export const submitPurchaseRequest = async (schoolId, data, actorUserId) => {
  const { planId, paymentMethod, referenceNumber, remarks, noRefundAccepted } = data;

  if (noRefundAccepted !== true && noRefundAccepted !== 'true') {
    throw ApiError.badRequest('You must confirm and agree that subscription purchases are non-refundable after activation.');
  }

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

  const currentSub = await prisma.schoolSubscription.findFirst({
    where: { schoolId },
    orderBy: { createdAt: 'desc' },
    include: { plan: true },
  });

  const now = new Date();
  if (
    currentSub &&
    currentSub.status === 'ACTIVE' &&
    currentSub.endDate &&
    new Date(currentSub.endDate) > now &&
    (currentSub.isEnterpriseSnapshot || currentSub.plan?.isEnterprise || currentSub.plan?.type === 'ENTERPRISE')
  ) {
    throw ApiError.badRequest(
      'Your school is currently on an active Enterprise Subscription. Additional plan purchases are disabled until your Enterprise subscription expires.'
    );
  }

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

  const isRazorpay = paymentMethod === 'RAZORPAY';
  let verifiedPaymentId = null;
  let verifiedOrderId = null;

  if (isRazorpay) {
    // 1. Resolve Razorpay transaction identifiers (support camelCase and snake_case)
    const paymentId = (
      data.razorpayPaymentId ||
      data.razorpay_payment_id ||
      data.paymentId ||
      data.payment_id ||
      referenceNumber ||
      ''
    ).trim();

    let orderId = (
      data.razorpayOrderId ||
      data.razorpay_order_id ||
      data.orderId ||
      data.order_id ||
      ''
    ).trim();

    if (!orderId && remarks?.includes('Razorpay Order: ')) {
      orderId = remarks.replace('Razorpay Order: ', '').trim();
    }

    const signature = (
      data.razorpaySignature ||
      data.razorpay_signature ||
      data.signature ||
      ''
    ).trim();

    if (!paymentId || !orderId || !signature) {
      throw ApiError.badRequest(
        'Razorpay checkout verification requires razorpay_payment_id, razorpay_order_id, and razorpay_signature.'
      );
    }

    // 2. Anti-Replay Guard: Prevent transaction reference reuse
    const existingRef = await prisma.subscriptionPayment.findFirst({
      where: {
        referenceNumber: paymentId,
        status: { not: 'REJECTED' },
      },
    });

    if (existingRef) {
      throw ApiError.conflict('This Razorpay payment transaction reference has already been processed or is in review.');
    }

    // 3. Cryptographic Signature Verification
    await razorpayService.verifyRazorpayPayment({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    });

    // 4. Authoritative Verification via Razorpay API (Server-to-Server)
    if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
      const paymentDetails = await razorpayService.fetchRazorpayPayment(paymentId);

      if (paymentDetails.order_id && paymentDetails.order_id !== orderId) {
        throw ApiError.badRequest('Razorpay payment does not match the generated order ID.');
      }

      if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
        throw ApiError.badRequest(
          `Payment transaction is in status "${paymentDetails.status}". Subscription activation requires a captured payment.`
        );
      }

      // Check payment amount (Razorpay amounts are in paise)
      const expectedAmountPaise = Math.round(Number(plan.finalPrice) * 100);
      if (paymentDetails.amount < expectedAmountPaise) {
        throw ApiError.badRequest(
          `Payment amount (₹${paymentDetails.amount / 100}) does not match the required subscription plan price (₹${plan.finalPrice}).`
        );
      }
    }

    verifiedPaymentId = paymentId;
    verifiedOrderId = orderId;
  }

  const providerType = isRazorpay ? 'RAZORPAY' : 'MANUAL';

  const paymentRecord = await prisma.subscriptionPayment.create({
    data: {
      schoolId,
      subscriptionId: currentSub?.id || null,
      planId: plan.id,
      amount: plan.finalPrice,
      currency: plan.currency,
      paymentMethod,
      status: 'PENDING',
      referenceNumber: verifiedPaymentId || referenceNumber?.trim() || null,
      provider: providerType,
      remarks: verifiedOrderId ? `Razorpay Order: ${verifiedOrderId}` : remarks?.trim() || null,
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
        referenceNumber: paymentRecord.referenceNumber,
      },
    },
  });

  memoryCache.delPattern(`subscription:`);
  memoryCache.del(`subscription:current:${schoolId}`);

  // Only verified Razorpay payments are auto-approved. Manual/Cash/UPI require Super Admin approval.
  if (isRazorpay) {
    const approved = await approvePayment(paymentRecord.id, actorUserId || null);
    return {
      payment: approved.payment,
      subscription: approved.subscription,
      success: true,
      message: 'Payment verified and subscription activated successfully!',
    };
  }

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
    message: 'Payment request submitted successfully. It will be activated after Super Admin verification.',
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
