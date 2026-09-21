import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { GuestRoute } from './GuestRoute.jsx';
import { RoleRoute } from './RoleRoute.jsx';
import { PermissionRoute } from './PermissionRoute.jsx';
import { OwnerRoute } from './OwnerRoute.jsx';
import { SubscriptionRoute } from './SubscriptionRoute.jsx';
import { SubscriptionProvider } from '../context/SubscriptionContext.jsx';
import { PageLoader } from '../components/ui/PageLoader.jsx';

// Helper function to lazy load pages with named or default exports
const lazyLoad = (factory, name) =>
  React.lazy(() =>
    factory().then((module) => ({
      default: name ? module[name] : module.default || module[Object.keys(module)[0]],
    }))
  );

// Layouts
const SchoolAdminLayout = lazyLoad(() => import('../layouts/SchoolAdminLayout.jsx'), 'SchoolAdminLayout');
const SuperAdminLayout = lazyLoad(() => import('../layouts/SuperAdminLayout.jsx'), 'SuperAdminLayout');

// Public Pages
const LandingPage = lazyLoad(() => import('../pages/LandingPage.jsx'), 'LandingPage');
const LoginPage = lazyLoad(() => import('../pages/LoginPage.jsx'), 'LoginPage');
const RegisterPage = lazyLoad(() => import('../pages/RegisterPage.jsx'), 'RegisterPage');
const ContactPage = lazyLoad(() => import('../pages/ContactPage.jsx'), 'ContactPage');

// School Admin Pages
const DashboardPage = lazyLoad(() => import('../pages/DashboardPage.jsx'), 'DashboardPage');
const AcademicYearsPage = lazyLoad(() => import('../pages/AcademicYearsPage.jsx'), 'AcademicYearsPage');
const ClassesPage = lazyLoad(() => import('../pages/ClassesPage.jsx'), 'ClassesPage');
const MediumsPage = lazyLoad(() => import('../pages/MediumsPage.jsx'), 'MediumsPage');
const SectionsPage = lazyLoad(() => import('../pages/SectionsPage.jsx'), 'SectionsPage');
const StreamsPage = lazyLoad(() => import('../pages/StreamsPage.jsx'), 'StreamsPage');
const AdmitCardGenerationPage = lazyLoad(() => import('../pages/academics/AdmitCardGenerationPage.jsx'), 'AdmitCardGenerationPage');

// Student Module Pages
const StudentsListPage = lazyLoad(() => import('../pages/students/StudentsListPage.jsx'), 'StudentsListPage');
const AddStudentPage = lazyLoad(() => import('../pages/students/AddStudentPage.jsx'), 'AddStudentPage');
const StudentDetailsPage = lazyLoad(() => import('../pages/students/StudentDetailsPage.jsx'), 'StudentDetailsPage');
const EditStudentProfilePage = lazyLoad(() => import('../pages/students/EditStudentProfilePage.jsx'), 'EditStudentProfilePage');
const BulkPromotionPage = lazyLoad(() => import('../pages/students/BulkPromotionPage.jsx'), 'BulkPromotionPage');

// Staff & Payroll Pages
const StaffListPage = lazyLoad(() => import('../pages/staff/StaffListPage.jsx'), 'StaffListPage');
const StaffDetailsPage = lazyLoad(() => import('../pages/staff/StaffDetailsPage.jsx'), 'StaffDetailsPage');
const StaffDepartmentsPage = lazyLoad(() => import('../pages/staff/StaffDepartmentsPage.jsx'), 'StaffDepartmentsPage');
const SalarySetupPage = lazyLoad(() => import('../pages/staff/SalarySetupPage.jsx'), 'SalarySetupPage');
const MonthlySalaryPage = lazyLoad(() => import('../pages/payroll/MonthlySalaryPage.jsx'), 'MonthlySalaryPage');
const SalaryPaymentsPage = lazyLoad(() => import('../pages/payroll/SalaryPaymentsPage.jsx'), 'SalaryPaymentsPage');
const StaffAdvancesPage = lazyLoad(() => import('../pages/staff/StaffAdvancesPage.jsx'), 'StaffAdvancesPage');
const SalaryHistoryPage = lazyLoad(() => import('../pages/payroll/SalaryHistoryPage.jsx'), 'SalaryHistoryPage');

// Finance Module Pages
const FinanceLayout = lazyLoad(() => import('../pages/finance/FinanceLayout.jsx'), 'FinanceLayout');
const FinanceOverviewPage = lazyLoad(() => import('../pages/finance/FinanceOverviewPage.jsx'), 'FinanceOverviewPage');
const FinancialTransactionsPage = lazyLoad(() => import('../pages/finance/FinancialTransactionsPage.jsx'), 'FinancialTransactionsPage');
const ExpensesPage = lazyLoad(() => import('../pages/finance/ExpensesPage.jsx'), 'ExpensesPage');
const FundsPage = lazyLoad(() => import('../pages/finance/FundsPage.jsx'), 'FundsPage');

// Super Admin Pages
const SuperAdminDashboardPage = lazyLoad(() => import('../pages/admin/SuperAdminDashboardPage.jsx'), 'SuperAdminDashboardPage');
const SuperAdminSchoolsPage = lazyLoad(() => import('../pages/SuperAdminSchoolsPage.jsx'), 'SuperAdminSchoolsPage');
const SchoolDetailsPage = lazyLoad(() => import('../pages/admin/SchoolDetailsPage.jsx'), 'SchoolDetailsPage');
const SuperAdminUsersPage = lazyLoad(() => import('../pages/SuperAdminUsersPage.jsx'), 'SuperAdminUsersPage');
const SuperAdminPaymentsPage = lazyLoad(() => import('../pages/admin/SuperAdminPaymentsPage.jsx'), 'SuperAdminPaymentsPage');
const SuperAdminRevenueReportPage = lazyLoad(() => import('../pages/admin/reports/SuperAdminRevenueReportPage.jsx'), 'SuperAdminRevenueReportPage');
const SuperAdminGrowthReportPage = lazyLoad(() => import('../pages/admin/reports/SuperAdminGrowthReportPage.jsx'), 'SuperAdminGrowthReportPage');
const SuperAdminAuditLogsPage = lazyLoad(() => import('../pages/SuperAdminAuditLogsPage.jsx'), 'SuperAdminAuditLogsPage');
const SuperAdminSettingsPage = lazyLoad(() => import('../pages/admin/SuperAdminSettingsPage.jsx'), 'SuperAdminSettingsPage');
const SubscriptionInvoicePage = lazyLoad(() => import('../pages/admin/SubscriptionInvoicePage.jsx'), 'SubscriptionInvoicePage');

// Fee Module Pages
const FeeManagementLayout = lazyLoad(() => import('../pages/fees/FeeManagementLayout.jsx'), 'FeeManagementLayout');
const CollectFeesPage = lazyLoad(() => import('../pages/fees/CollectFeesPage.jsx'), 'CollectFeesPage');
const ReceiptsListPage = lazyLoad(() => import('../pages/fees/ReceiptsListPage.jsx'), 'ReceiptsListPage');
const ReceiptDetailsPage = lazyLoad(() => import('../pages/fees/ReceiptDetailsPage.jsx'), 'ReceiptDetailsPage');
const FeeTemplatesPage = lazyLoad(() => import('../pages/fees/FeeTemplatesPage.jsx'), 'FeeTemplatesPage');
const FeeTypesPage = lazyLoad(() => import('../pages/fees/FeeTypesPage.jsx'), 'FeeTypesPage');
const GenerateFeesPage = lazyLoad(() => import('../pages/fees/GenerateFeesPage.jsx'), 'GenerateFeesPage');
const GeneratedHistoryPage = lazyLoad(() => import('../pages/fees/GeneratedHistoryPage.jsx'), 'GeneratedHistoryPage');
const StudentLedgerPage = lazyLoad(() => import('../pages/students/StudentLedgerPage.jsx'), 'StudentLedgerPage');

// Reports Module Page
const ReportsPage = lazyLoad(() => import('../pages/reports/ReportsPage.jsx'), 'ReportsPage');

// School Users & Permissions
const SchoolUsersPage = lazyLoad(() => import('../pages/school-users/SchoolUsersPage.jsx'), 'SchoolUsersPage');
const SchoolProfilePage = lazyLoad(() => import('../pages/settings/SchoolProfilePage.jsx'), 'SchoolProfilePage');
const UserProfilePage = lazyLoad(() => import('../pages/settings/UserProfilePage.jsx'), 'UserProfilePage');

// Subscription Pages
const SubscriptionPage = lazyLoad(() => import('../pages/SubscriptionPage.jsx'), 'SubscriptionPage');
const SuperAdminPlansPage = lazyLoad(() => import('../pages/admin/SuperAdminPlansPage.jsx'), 'SuperAdminPlansPage');
const PlanFormPage = lazyLoad(() => import('../pages/admin/PlanFormPage.jsx'), 'PlanFormPage');
const SuperAdminSubscriptionsPage = lazyLoad(() => import('../pages/admin/SuperAdminSubscriptionsPage.jsx'), 'SuperAdminSubscriptionsPage');

// Hostel Module Pages
const HostelLayout = lazyLoad(() => import('../pages/hostel/HostelLayout.jsx'), 'HostelLayout');
const HostelDashboardPage = lazyLoad(() => import('../pages/hostel/HostelDashboardPage.jsx'), 'HostelDashboardPage');
const HostelSetupPage = lazyLoad(() => import('../pages/hostel/HostelSetupPage.jsx'), 'HostelSetupPage');
const HostelFeeSetupPage = lazyLoad(() => import('../pages/hostel/HostelFeeSetupPage.jsx'), 'HostelFeeSetupPage');
const HostelAdmissionPage = lazyLoad(() => import('../pages/hostel/HostelAdmissionPage.jsx'), 'HostelAdmissionPage');
const HostelResidentsPage = lazyLoad(() => import('../pages/hostel/HostelResidentsPage.jsx'), 'HostelResidentsPage');
const HostelReportsPage = lazyLoad(() => import('../pages/hostel/HostelReportsPage.jsx'), 'HostelReportsPage');

export const AppRoutes = () => {
  return (
    <React.Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Protected School Admin Portal */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['SCHOOL_ADMIN']}>
                <SubscriptionProvider>
                  <SchoolAdminLayout />
                </SubscriptionProvider>
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<PermissionRoute permission="DASHBOARD_VIEW"><DashboardPage /></PermissionRoute>} />
          <Route path="subscription" element={<SubscriptionPage />} />

          {/* Operational Modules - Protected by SubscriptionRoute */}
          <Route path="academic-years" element={<SubscriptionRoute><PermissionRoute permission="ACADEMICS_VIEW"><AcademicYearsPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="classes" element={<SubscriptionRoute><PermissionRoute permission="ACADEMICS_VIEW"><ClassesPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="mediums" element={<SubscriptionRoute><PermissionRoute permission="ACADEMICS_VIEW"><MediumsPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="sections" element={<SubscriptionRoute><PermissionRoute permission="ACADEMICS_VIEW"><SectionsPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="streams" element={<SubscriptionRoute><PermissionRoute permission="ACADEMICS_VIEW"><StreamsPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="admit-cards" element={<SubscriptionRoute><PermissionRoute permission="ACADEMICS_VIEW"><AdmitCardGenerationPage /></PermissionRoute></SubscriptionRoute>} />

          {/* Students Routes */}
          <Route path="students" element={<SubscriptionRoute><PermissionRoute permission="STUDENTS_VIEW"><StudentsListPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="students/new" element={<SubscriptionRoute><PermissionRoute permission="STUDENTS_CREATE"><AddStudentPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="students/promote" element={<SubscriptionRoute><PermissionRoute permission="STUDENTS_PROMOTE"><BulkPromotionPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="students/:studentId" element={<SubscriptionRoute><PermissionRoute permission="STUDENTS_VIEW"><StudentDetailsPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="students/:id/ledger" element={<SubscriptionRoute><PermissionRoute permission="FEES_VIEW"><StudentLedgerPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="students/:studentId/edit" element={<SubscriptionRoute><PermissionRoute permission="STUDENTS_EDIT"><EditStudentProfilePage /></PermissionRoute></SubscriptionRoute>} />

          {/* Fee Management Routes */}
          <Route path="fees" element={<SubscriptionRoute><FeeManagementLayout /></SubscriptionRoute>}>
            <Route index element={<Navigate to="collect" replace />} />
            <Route path="collect" element={<PermissionRoute permission="FEES_COLLECT"><CollectFeesPage /></PermissionRoute>} />
            <Route path="generate" element={<PermissionRoute permission="FEES_GENERATE"><GenerateFeesPage /></PermissionRoute>} />
            <Route path="templates" element={<PermissionRoute permission="FEES_MANAGE_STRUCTURE"><FeeTemplatesPage /></PermissionRoute>} />
            <Route path="generated" element={<PermissionRoute permission="FEES_VIEW"><GeneratedHistoryPage /></PermissionRoute>} />
            <Route path="receipts" element={<PermissionRoute permission="FEES_VIEW"><ReceiptsListPage /></PermissionRoute>} />
            <Route path="receipts/:id" element={<PermissionRoute permission="FEES_VIEW"><ReceiptDetailsPage /></PermissionRoute>} />
            <Route path="settings" element={<Navigate to="settings/types" replace />} />
            <Route path="settings/types" element={<PermissionRoute permission="FEES_MANAGE_STRUCTURE"><FeeTypesPage /></PermissionRoute>} />
            {/* Legacy route fallbacks */}
            <Route path="payments" element={<Navigate to="/app/fees/receipts" replace />} />
            <Route path="structures" element={<Navigate to="/app/fees/templates" replace />} />
            <Route path="types" element={<Navigate to="/app/fees/settings/types" replace />} />
          </Route>

          {/* Staff & Payroll Routes */}
          <Route path="staff" element={<SubscriptionRoute><PermissionRoute permission="STAFF_VIEW"><StaffListPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="staff/departments" element={<SubscriptionRoute><PermissionRoute permission="STAFF_VIEW"><StaffDepartmentsPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="staff/salary" element={<SubscriptionRoute><PermissionRoute permission="SALARY_VIEW"><SalarySetupPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="staff/payments" element={<SubscriptionRoute><PermissionRoute permission="PAYROLL_VIEW"><SalaryPaymentsPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="staff/advances" element={<SubscriptionRoute><PermissionRoute permission="SALARY_MANAGE"><StaffAdvancesPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="staff/history" element={<SubscriptionRoute><PermissionRoute permission="PAYROLL_VIEW"><SalaryHistoryPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="staff/:staffId" element={<SubscriptionRoute><PermissionRoute permission="STAFF_VIEW"><StaffDetailsPage /></PermissionRoute></SubscriptionRoute>} />

          {/* Payroll Primary Route */}
          <Route path="payroll" element={<SubscriptionRoute><PermissionRoute permission="PAYROLL_VIEW"><MonthlySalaryPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="payroll/payments" element={<Navigate to="/app/staff/payments" replace />} />

          {/* Finance & Ledger Routes */}
          <Route path="finance" element={<SubscriptionRoute><PermissionRoute permission="EXPENSE_VIEW"><FinanceLayout /></PermissionRoute></SubscriptionRoute>}>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<FinanceOverviewPage />} />
            <Route path="transactions" element={<FinancialTransactionsPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="funds" element={<FundsPage />} />
          </Route>
          <Route path="expenses" element={<Navigate to="/app/finance/expenses" replace />} />
          <Route path="funds" element={<Navigate to="/app/finance/funds" replace />} />

          <Route path="reports" element={<SubscriptionRoute><PermissionRoute permission="REPORTS_VIEW"><ReportsPage /></PermissionRoute></SubscriptionRoute>} />

          {/* Hostel Management Routes */}
          <Route path="hostel" element={<SubscriptionRoute><PermissionRoute permission="HOSTEL_VIEW"><HostelLayout /></PermissionRoute></SubscriptionRoute>}>
            <Route index element={<HostelDashboardPage />} />
            <Route path="setup" element={<PermissionRoute permission="HOSTEL_SETUP"><HostelSetupPage /></PermissionRoute>} />
            <Route path="fees" element={<PermissionRoute permission="HOSTEL_SETUP"><HostelFeeSetupPage /></PermissionRoute>} />
            <Route path="admission" element={<PermissionRoute permission="HOSTEL_ADMIT"><HostelAdmissionPage /></PermissionRoute>} />
            <Route path="residents" element={<PermissionRoute permission="HOSTEL_VIEW"><HostelResidentsPage /></PermissionRoute>} />
            <Route path="transfers" element={<Navigate to="/app/hostel/residents" replace />} />
            <Route path="reports" element={<PermissionRoute permission="HOSTEL_VIEW"><HostelReportsPage /></PermissionRoute>} />
          </Route>

          {/* Users & Permissions Routes */}
          <Route path="settings/users" element={<SubscriptionRoute><PermissionRoute permission="USERS_VIEW"><SchoolUsersPage /></PermissionRoute></SubscriptionRoute>} />
          <Route path="settings/profile" element={<SubscriptionRoute><OwnerRoute><SchoolProfilePage /></OwnerRoute></SubscriptionRoute>} />
          <Route path="profile" element={<SubscriptionRoute><UserProfilePage /></SubscriptionRoute>} />
        </Route>

        {/* Protected Super Admin Portal */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                <SuperAdminLayout />
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<SuperAdminDashboardPage />} />
          <Route path="plans" element={<SuperAdminPlansPage />} />
          <Route path="plans/new" element={<PlanFormPage />} />
          <Route path="plans/:planId/edit" element={<PlanFormPage />} />
          <Route path="subscriptions" element={<SuperAdminSubscriptionsPage />} />
          <Route path="subscriptions/:subscriptionId/invoice" element={<SubscriptionInvoicePage />} />
          <Route path="schools" element={<SuperAdminSchoolsPage />} />
          <Route path="schools/:schoolId" element={<SchoolDetailsPage />} />
          <Route path="users" element={<SuperAdminUsersPage />} />
          <Route path="payments" element={<SuperAdminPaymentsPage />} />
          <Route path="reports/revenue" element={<SuperAdminRevenueReportPage />} />
          <Route path="reports/growth" element={<SuperAdminGrowthReportPage />} />
          <Route path="audit-logs" element={<SuperAdminAuditLogsPage />} />
          <Route path="platform" element={<SuperAdminSettingsPage />} />
          <Route path="settings" element={<Navigate to="/admin/platform" replace />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </React.Suspense>
  );
};
