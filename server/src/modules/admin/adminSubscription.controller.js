import { asyncHandler } from '../../utils/asyncHandler.js';
import * as adminSubscriptionService from './adminSubscription.service.js';

export const listPlans = asyncHandler(async (req, res) => {
  const plans = await adminSubscriptionService.listPlans();
  res.status(200).json({
    success: true,
    data: plans,
  });
});

export const createPlan = asyncHandler(async (req, res) => {
  const plan = await adminSubscriptionService.createPlan(req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: 'Subscription plan created successfully',
    data: plan,
  });
});

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await adminSubscriptionService.updatePlan(req.params.id, req.body, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Subscription plan updated successfully',
    data: plan,
  });
});

export const togglePlanStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body;
  const plan = await adminSubscriptionService.togglePlanStatus(req.params.id, isActive, req.user.id);
  res.status(200).json({
    success: true,
    message: `Plan ${isActive ? 'activated' : 'deactivated'} successfully`,
    data: plan,
  });
});

export const deletePlan = asyncHandler(async (req, res) => {
  const result = await adminSubscriptionService.deletePlan(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const listPendingPayments = asyncHandler(async (req, res) => {
  const result = await adminSubscriptionService.listPendingPayments(req.query);
  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

export const approvePayment = asyncHandler(async (req, res) => {
  const result = await adminSubscriptionService.approvePayment(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Payment request approved and subscription activated successfully',
    data: result,
  });
});

export const rejectPayment = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const payment = await adminSubscriptionService.rejectPayment(req.params.id, reason, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Payment request rejected',
    data: payment,
  });
});

export const extendSubscription = asyncHandler(async (req, res) => {
  const subscription = await adminSubscriptionService.extendSubscription(req.params.id, req.body, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Subscription extended successfully',
    data: subscription,
  });
});

export const createManualSubscription = asyncHandler(async (req, res) => {
  const { schoolId } = req.body;
  const subscription = await adminSubscriptionService.createManualSubscription(schoolId, req.body, req.user.id);
  res.status(201).json({
    success: true,
    message: 'Manual subscription created successfully',
    data: subscription,
  });
});

export const listSubscriptions = asyncHandler(async (req, res) => {
  const result = await adminSubscriptionService.listAllSubscriptions(req.query);
  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

export const updateSubscriptionStatus = asyncHandler(async (req, res) => {
  const { status, reason } = req.body;
  const subscription = await adminSubscriptionService.updateSubscriptionStatus(req.params.id, status, reason, req.user.id);
  res.status(200).json({
    success: true,
    message: `Subscription status updated to ${status}`,
    data: subscription,
  });
});

export const expireSubscription = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const subscription = await adminSubscriptionService.expireSubscription(req.params.id, reason, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Subscription manually expired successfully',
    data: subscription,
  });
});
