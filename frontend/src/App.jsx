import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import AdminRoute from './layouts/AdminRoute';

// Pages
import LoginPage from './pages/Login/LoginPage';
import OverviewPage from './pages/Dashboard/OverviewPage';
import RegisterAccountPage from './pages/RegisterAccount/RegisterAccountPage';
import ImportAccountsPage from './pages/Accounts/ImportAccountsPage';
import MailPage from './pages/Mail/MailPage';
import HelpPage from './pages/Help/HelpPage';
import HrOverviewPage from './pages/HR/HrOverviewPage';
import TeamsPage from './pages/HR/TeamsPage';
import MonthClosePage from './pages/HR/MonthClosePage';
import AttendanceRegisterPage from './pages/Attendance/AttendanceRegisterPage';
import AccountsListPage from './pages/Accounts/AccountsListPage';
import TasksPage from './pages/Tasks/TasksPage';
import DepartmentsPage from './pages/Departments/DepartmentsPage';
import ChatPage from './pages/Chat/ChatPage';
import AttendancePage from './pages/Attendance/AttendancePage';
import DocumentsPage from './pages/Documents/DocumentsPage';
import ScheduledPostsPage from './pages/Social/ScheduledPostsPage';
import AdminDashboardPage from './pages/Admin/AdminDashboardPage';
import AdminAccountsPage from './pages/Admin/AdminAccountsPage';
import AdminEmployeesPage from './pages/Admin/AdminEmployeesPage';
import AdminClientsCampaignsPage from './pages/Admin/AdminClientsCampaignsPage';
import AdminAuditLogsPage from './pages/Admin/AdminAuditLogsPage';
import AdminSecurityPage from './pages/Admin/AdminSecurityPage';
import OAuthCallbackPage from './pages/OAuthCallback/OAuthCallbackPage';
import AuthCallbackPage from './pages/Login/AuthCallbackPage';
import ProfilePage from './pages/Profile/ProfilePage';
import ManagerDashboardPage from './pages/Manager/ManagerDashboardPage';
import SuperAdminConsolePage from './pages/SuperAdmin/SuperAdminConsolePage';
import RequirePermission from './layouts/RequirePermission';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Protected Employee Workspace */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<OverviewPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/mail" element={<MailPage />} />
            <Route path="/help" element={<HelpPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendance/register" element={<AttendanceRegisterPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/social/posts" element={<ScheduledPostsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/accounts/new" element={<RegisterAccountPage />} />
            <Route path="/accounts/import" element={<ImportAccountsPage />} />
            <Route path="/register" element={<Navigate to="/accounts/new" replace />} />
            <Route path="/accounts" element={<AccountsListPage />} />
            <Route path="/profile" element={<ProfilePage />} />

            {/* Manager workspace (managers, admins, super admins) */}
            <Route element={<RequirePermission perm="manager:portal" />}>
              <Route path="/manager" element={<ManagerDashboardPage />} />
            </Route>

            {/* HR: eagle view, team routing, employee directory */}
            <Route element={<RequirePermission perm="hr:portal" />}>
              <Route path="/hr" element={<HrOverviewPage />} />
              <Route path="/hr/teams" element={<TeamsPage />} />
              <Route path="/hr/payroll" element={<MonthClosePage />} />
            </Route>
            <Route element={<RequirePermission perm="employees:read_all" />}>
              <Route path="/admin/employees" element={<AdminEmployeesPage />} />
            </Route>

            {/* Super admin console */}
            <Route element={<RequirePermission perm="settings:manage" />}>
              <Route path="/super-admin" element={<SuperAdminConsolePage />} />
            </Route>

            {/* Protected Admin Portal */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/security" element={<AdminSecurityPage />} />
              <Route path="/admin/accounts" element={<AdminAccountsPage />} />
              <Route path="/admin/clients" element={<AdminClientsCampaignsPage />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
