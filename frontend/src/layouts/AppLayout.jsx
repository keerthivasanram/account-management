import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';
import SecurityWatermark from '../components/SecurityWatermark';
import SecurityShield from '../components/SecurityShield';

export const AppLayout = () => {
  const { employee, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <LoadingSpinner text="Authenticating session..." size="lg" />
      </div>
    );
  }

  if (!employee) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Derive dynamic navbar title
  const path = location.pathname;
  let title = 'Overview';
  if (path.startsWith('/dashboard')) title = 'Overview';
  else if (path.startsWith('/tasks')) title = 'Tasks & Deliverables';
  else if (path.startsWith('/projects')) title = 'Projects';
  else if (path.startsWith('/departments')) title = 'Departments';
  else if (path.startsWith('/register')) title = 'Register Instagram Account';
  else if (path.startsWith('/accounts')) title = 'Instagram Accounts';
  else if (path.startsWith('/social/posts')) title = 'Publishing & Scheduled Content';
  else if (path.startsWith('/chat')) title = 'Company Chat';
  else if (path.startsWith('/documents')) title = 'Company Vault & Documents';
  else if (path.startsWith('/attendance')) title = 'Attendance & Shifts';
  else if (path.startsWith('/admin/security')) title = 'Security & Settings';
  else if (path.startsWith('/admin/accounts')) title = 'Account Assignments';
  else if (path.startsWith('/admin/employees')) title = 'Employee Management';
  else if (path.startsWith('/admin/clients')) title = 'Clients & Campaigns';
  else if (path.startsWith('/admin/audit-logs')) title = 'Activity Logs';
  else if (path.startsWith('/admin')) title = 'Administrator Overview';

  return (
    <SecurityShield>
      <div className="flex min-h-screen bg-[#F7F8FA] text-[#172B24] relative">
        <SecurityWatermark />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          <Navbar title={title} />
          <main className="flex-1 p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SecurityShield>
  );
};

export default AppLayout;
