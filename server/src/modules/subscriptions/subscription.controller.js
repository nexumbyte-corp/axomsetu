import { asyncHandler } from '../../utils/asyncHandler.js';
import * as subscriptionService from './subscription.service.js';

export const getCurrentSubscription = asyncHandler(async (req, res) => {
  const result = await subscriptionService.getCurrentSubscription(req.schoolId);
  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getActivePlans = asyncHandler(async (req, res) => {
  const plans = await subscriptionService.getActivePaidPlans();
  res.status(200).json({
    success: true,
    data: plans,
  });
});

export const getPublicLandingPlans = asyncHandler(async (req, res) => {
  const plans = await subscriptionService.getPublicLandingPlans();
  res.status(200).json({
    success: true,
    data: plans,
  });
});

export const getPublicLandingSchools = asyncHandler(async (req, res) => {
  const schools = await subscriptionService.getPublicRegisteredSchools();
  res.status(200).json({
    success: true,
    data: schools,
  });
});

export const submitPurchaseRequest = asyncHandler(async (req, res) => {
  const result = await subscriptionService.submitPurchaseRequest(req.schoolId, req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: result.message,
    data: result.payment,
  });
});

export const getPaymentRequests = asyncHandler(async (req, res) => {
  const payments = await subscriptionService.getSchoolPaymentRequests(req.schoolId);
  res.status(200).json({
    success: true,
    data: payments,
  });
});

export const getSubscriptionHistory = asyncHandler(async (req, res) => {
  const history = await subscriptionService.getSchoolSubscriptionHistory(req.schoolId);
  res.status(200).json({
    success: true,
    data: history,
  });
});
