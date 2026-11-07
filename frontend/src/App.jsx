import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import AdminRoute from './layouts/AdminRoute';

// Pages
import LandingPage from './pages/Landing/LandingPage';
import LoginPage from './pages/Login/LoginPage';
import EmployeeDashboard from './pages/Dashboard/EmployeeDashboard';
import RegisterAccountPage from './pages/RegisterAccount/RegisterAccountPage';
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

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

          {/* Protected Employee Workspace */}
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<EmployeeDashboard />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/social/posts" element={<ScheduledPostsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/departments" element={<DepartmentsPage />} />
            <Route path="/register" element={<RegisterAccountPage />} />
            <Route path="/accounts" element={<AccountsListPage />} />

            {/* Protected Admin Portal */}
            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/security" element={<AdminSecurityPage />} />
              <Route path="/admin/accounts" element={<AdminAccountsPage />} />
              <Route path="/admin/employees" element={<AdminEmployeesPage />} />
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
