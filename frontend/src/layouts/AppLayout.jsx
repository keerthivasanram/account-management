import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import LoadingSpinner from '../components/LoadingSpinner';

export const AppLayout = () => {
  const { employee, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingSpinner text="Authenticating session..." size="lg" />
      </div>
    );
  }

  if (!employee) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Derive dynamic navbar title
  const path = location.pathname;
  let title = 'Workspace';
  if (path.startsWith('/dashboard')) title = 'Employee Dashboard';
  else if (path.startsWith('/register')) title = 'Register Instagram Account';
  else if (path.startsWith('/accounts')) title = 'Instagram Accounts';
  else if (path.startsWith('/admin/accounts')) title = 'All Managed Accounts';
  else if (path.startsWith('/admin/employees')) title = 'Employee Accounts & Capacity';
  else if (path.startsWith('/admin/clients')) title = 'Clients & Campaigns';
  else if (path.startsWith('/admin/audit-logs')) title = 'System Audit Trails';
  else if (path.startsWith('/admin')) title = 'Administrator Portal';

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar title={title} />
        <main className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
