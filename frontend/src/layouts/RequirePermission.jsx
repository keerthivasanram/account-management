import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard driven by backend permissions.
 * Usage: <Route element={<RequirePermission perm="admin:portal" />}> ... </Route>
 * Cosmetic only: the API re-checks every permission.
 */
export const RequirePermission = ({ perm, title = 'Access Restricted', message }) => {
  const { employee, can, loading } = useAuth();

  if (loading) return null;
  if (!employee) return <Navigate to="/login" replace />;

  if (!can(perm)) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-10 text-center max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-[#64748B] mb-6">
          {message || 'Your role does not include access to this area. Contact an administrator if you need it.'}
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E5E7EB] text-slate-900 text-sm font-medium rounded-md transition-colors"
        >
          Back to my dashboard
        </a>
      </div>
    );
  }

  return <Outlet />;
};

export default RequirePermission;
