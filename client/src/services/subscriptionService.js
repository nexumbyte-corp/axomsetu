import { api } from './api.js';

export const subscriptionService = {
  // School Admin Endpoints
  async getCurrentSubscription() {
    return await api.get('/subscriptions/current');
  },

  async getActivePlans() {
    return await api.get('/subscriptions/plans');
  },

  async getPublicLandingPlans() {
    return await api.get('/subscriptions/public-plans');
  },

  async getPublicLandingSchools() {
    return await api.get('/subscriptions/public-schools');
  },

  async getPlatformContact() {
    return await api.get('/platform/contact');
  },

  async submitPurchaseRequest(data) {
    return await api.post('/subscriptions/purchase', data);
  },

  async getPaymentRequests() {
    return await api.get('/subscriptions/payments');
  },

  async getSubscriptionHistory() {
    return await api.get('/subscriptions/history');
  },

  // Super Admin Endpoints
  async adminListPlans() {
    return await api.get('/admin/subscriptions/plans');
  },

  async adminCreatePlan(data) {
    return await api.post('/admin/subscriptions/plans', data);
  },

  async adminUpdatePlan(id, data) {
    return await api.patch(`/admin/subscriptions/plans/${id}`, data);
  },

  async adminTogglePlanStatus(id, isActive) {
    return await api.patch(`/admin/subscriptions/plans/${id}/status`, { isActive });
  },

  async adminDeletePlan(id) {
    return await api.delete(`/admin/subscriptions/plans/${id}`);
  },

  async adminListPendingPayments(params = {}) {
    return await api.get('/admin/subscriptions/payments/pending', { params });
  },

  async adminApprovePayment(id) {
    return await api.post(`/admin/subscriptions/payments/${id}/approve`);
  },

  async adminRejectPayment(id, reason) {
    return await api.post(`/admin/subscriptions/payments/${id}/reject`, { reason });
  },

  async adminExtendSubscription(id, data) {
    return await api.post(`/admin/subscriptions/${id}/extend`, data);
  },

  async adminCreateManualSubscription(data) {
    return await api.post('/admin/subscriptions/manual', data);
  },

  async adminListSubscriptions(params = {}) {
    return await api.get('/admin/subscriptions', { params });
  },

  async adminGetSubscriptionById(id) {
    return await api.get(`/admin/subscriptions/${id}`);
  },

  async adminUpdateSubscriptionStatus(id, status, reason = null) {
    return await api.patch(`/admin/subscriptions/${id}/status`, { status, reason });
  },

  async adminExpireSubscription(id, reason = null) {
    return await api.post(`/admin/subscriptions/${id}/expire`, { reason });
  },

  async adminUpdateSubscriptionDetails(id, data) {
    return await api.put(`/admin/subscriptions/${id}`, data);
  },
};
