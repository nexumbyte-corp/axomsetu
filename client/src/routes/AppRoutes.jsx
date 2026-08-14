import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute.jsx';
import { RoleRoute } from './RoleRoute.jsx';
import { PermissionRoute } from './PermissionRoute.jsx';
import { OwnerRoute } from './OwnerRoute.jsx';
import { SubscriptionRoute } from './SubscriptionRoute.jsx';
import { SubscriptionProvider } from '../context/SubscriptionContext.jsx';

// Layouts
import { SchoolAdminLayout } from '../layouts/SchoolAdminLayout.jsx';
import { SuperAdminLayout } from '../layouts/SuperAdminLayout.jsx';

// Public Pages
import { LandingPage } from '../pages/LandingPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';

// School Admin Pages
import { DashboardPage } from '../pages/DashboardPage.jsx';
import { AcademicYearsPage } from '../pages/AcademicYearsPage.jsx';
import { ClassesPage } from '../pages/ClassesPage.jsx';
import { MediumsPage } from '../pages/MediumsPage.jsx';
import { SectionsPage } from '../pages/SectionsPage.jsx';
import { StreamsPage } from '../pages/StreamsPage.jsx';

// Student Module Pages
import { StudentsListPage } from '../pages/students/StudentsListPage.jsx';
import { AddStudentPage } from '../pages/students/AddStudentPage.jsx';
import { StudentDetailsPage } from '../pages/students/StudentDetailsPage.jsx';
import { EditStudentProfilePage } from '../pages/students/EditStudentProfilePage.jsx';
import { BulkPromotionPage } from '../pages/students/BulkPromotionPage.jsx';

// Staff & Payroll Pages
import { StaffListPage } from '../pages/staff/StaffListPage.jsx';
import { StaffDetailsPage } from '../pages/staff/StaffDetailsPage.jsx';
import { StaffDepartmentsPage } from '../pages/staff/StaffDepartmentsPage.jsx';
import { SalarySetupPage } from '../pages/staff/SalarySetupPage.jsx';
import { MonthlySalaryPage } from '../pages/payroll/MonthlySalaryPage.jsx';
import { SalaryPaymentsPage } from '../pages/payroll/SalaryPaymentsPage.jsx';
import { StaffAdvancesPage } from '../pages/staff/StaffAdvancesPage.jsx';
import { SalaryHistoryPage } from '../pages/payroll/SalaryHistoryPage.jsx';

// Finance Module Pages
import { FinanceLayout } from '../pages/finance/FinanceLayout.jsx';
import { FinanceOverviewPage } from '../pages/finance/FinanceOverviewPage.jsx';
import { FinancialTransactionsPage } from '../pages/finance/FinancialTransactionsPage.jsx';
import { ExpensesPage } from '../pages/finance/ExpensesPage.jsx';
import { FundsPage } from '../pages/finance/FundsPage.jsx';

// Super Admin Pages
import { SuperAdminDashboardPage } from '../pages/admin/SuperAdminDashboardPage.jsx';
import { SuperAdminSchoolsPage } from '../pages/SuperAdminSchoolsPage.jsx';
import { SchoolDetailsPage } from '../pages/admin/SchoolDetailsPage.jsx';
import { SuperAdminUsersPage } from '../pages/SuperAdminUsersPage.jsx';
import { SuperAdminPaymentsPage } from '../pages/admin/SuperAdminPaymentsPage.jsx';
import { SuperAdminRevenueReportPage } from '../pages/admin/reports/SuperAdminRevenueReportPage.jsx';
import { SuperAdminGrowthReportPage } from '../pages/admin/reports/SuperAdminGrowthReportPage.jsx';
import { SuperAdminAuditLogsPage } from '../pages/SuperAdminAuditLogsPage.jsx';
import { SuperAdminSettingsPage } from '../pages/admin/SuperAdminSettingsPage.jsx';

// Fee Module Pages
import { FeeManagementLayout } from '../pages/fees/FeeManagementLayout.jsx';
import { CollectFeesPage } from '../pages/fees/CollectFeesPage.jsx';
import { ReceiptsListPage } from '../pages/fees/ReceiptsListPage.jsx';
import { ReceiptDetailsPage } from '../pages/fees/ReceiptDetailsPage.jsx';
import { FeeTemplatesPage } from '../pages/fees/FeeTemplatesPage.jsx';
import { FeeStructuresPage } from '../pages/fees/FeeStructuresPage.jsx';
import { FeeTypesPage } from '../pages/fees/FeeTypesPage.jsx';
import { GenerateFeesPage } from '../pages/fees/GenerateFeesPage.jsx';
import { GeneratedHistoryPage } from '../pages/fees/GeneratedHistoryPage.jsx';
import { StudentLedgerPage } from '../pages/students/StudentLedgerPage.jsx';

// Reports Module Page
import { ReportsPage } from '../pages/reports/ReportsPage.jsx';

// School Users & Permissions
import { SchoolUsersPage } from '../pages/school-users/SchoolUsersPage.jsx';
import { SchoolProfilePage } from '../pages/settings/SchoolProfilePage.jsx';

// Subscription Pages
import { SubscriptionPage } from '../pages/SubscriptionPage.jsx';
import { SuperAdminPlansPage } from '../pages/admin/SuperAdminPlansPage.jsx';
import { PlanFormPage } from '../pages/admin/PlanFormPage.jsx';
import { SuperAdminSubscriptionsPage } from '../pages/admin/SuperAdminSubscriptionsPage.jsx';

// Hostel Module Pages
import { HostelLayout } from '../pages/hostel/HostelLayout.jsx';
import { HostelDashboardPage } from '../pages/hostel/HostelDashboardPage.jsx';
import { HostelSetupPage } from '../pages/hostel/HostelSetupPage.jsx';
import { HostelFeeSetupPage } from '../pages/hostel/HostelFeeSetupPage.jsx';
import { HostelAdmissionPage } from '../pages/hostel/HostelAdmissionPage.jsx';
import { HostelResidentsPage } from '../pages/hostel/HostelResidentsPage.jsx';
import { HostelReportsPage } from '../pages/hostel/HostelReportsPage.jsx';

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
        <Route path="profile" element={<Navigate to="/app/settings/profile" replace />} />
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
  );
};


