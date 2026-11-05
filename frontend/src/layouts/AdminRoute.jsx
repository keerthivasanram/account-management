import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

export const AdminRoute = () => {
  const { employee, isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!employee) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Access Restricted</h3>
        <p className="text-sm text-slate-400 mb-6">
          You need Administrator permissions to access this screen. Please contact your system admin if you require elevated privileges.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg transition-colors"
        >
          Return to Employee Dashboard
        </a>
      </div>
    );
  }

  return <Outlet />;
};

export default AdminRoute;
