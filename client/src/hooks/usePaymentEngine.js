import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService } from '../services/payment.service.js';

const PAYMENT_KEYS = {
  all: ['payments'],
  list: (params) => ['payments', 'list', params],
  search: (query, params) => ['payments', 'search', query, params],
  details: (id) => ['payments', 'details', id],
  reprint: (id) => ['payments', 'reprint', id],
  dashboard: (params) => ['payments', 'dashboard', params],
  studentPayments: (studentId) => ['students', studentId, 'payments'],
  studentOutstanding: (studentId) => ['students', studentId, 'outstanding'],
  studentLedger: (studentId, params) => ['students', studentId, 'ledger', params],
  dailyCollection: (params) => ['reports', 'daily-collection', params],
  monthlyCollection: (params) => ['reports', 'monthly-collection', params],
  classCollection: (params) => ['reports', 'class-collection', params],
  duesReport: (params) => ['reports', 'dues', params],
};

// 1. Fetch Student Outstanding Dues
export const useStudentOutstanding = (studentId) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.studentOutstanding(studentId),
    queryFn: () => paymentService.getStudentOutstanding(studentId),
    enabled: Boolean(studentId),
    staleTime: 1000 * 30, // 30s
  });
};

// 2. Fetch Student Derived Ledger
export const useStudentLedger = (studentId, params = {}) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.studentLedger(studentId, params),
    queryFn: () => paymentService.getStudentLedger(studentId, params),
    enabled: Boolean(studentId),
  });
};

// 3. Fetch Student Payment History
export const useStudentPayments = (studentId) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.studentPayments(studentId),
    queryFn: () => paymentService.getStudentPayments(studentId),
    enabled: Boolean(studentId),
  });
};

// 4. Fetch Single Receipt Details
export const usePaymentDetails = (id) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.details(id),
    queryFn: () => paymentService.getReceiptDetails(id),
    enabled: Boolean(id),
  });
};

// 5. Fetch Payments History List
export const usePaymentsList = (params = {}) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.list(params),
    queryFn: () => paymentService.getPayments(params),
    staleTime: 0,
    refetchOnMount: 'always',
  });
};

// 8. Fetch Dashboard Summary
export const useDashboardSummary = (params = {}) => {
  return useQuery({
    queryKey: PAYMENT_KEYS.dashboard(params),
    queryFn: () => paymentService.getDashboardSummary(params),
  });
};

// 9. Mutation: Collect Payment
export const useCollectPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => paymentService.collectPayment(data),
    onSuccess: (res, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.all });
      if (variables.studentId) {
        queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.studentOutstanding(variables.studentId) });
        queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.studentLedger(variables.studentId) });
        queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.studentPayments(variables.studentId) });
      }
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.dashboard() });
    },
  });
};

// 10. Mutation: Void Payment
export const useVoidPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => paymentService.voidPayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.dashboard() });
    },
  });
};

// 11. Mutation: Delete Unpaid Fee Charge (Admin Only)
export const useDeleteUnpaidFeeCharge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ chargeId }) => paymentService.deleteUnpaidFeeCharge(chargeId),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.all });
      queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.dashboard() });
      if (variables?.studentId) {
        queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.studentOutstanding(variables.studentId) });
        queryClient.invalidateQueries({ queryKey: PAYMENT_KEYS.studentLedger(variables.studentId) });
      }
    },
  });
};
