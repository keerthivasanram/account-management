import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, Shield, CheckCircle, Database } from 'lucide-react';

export const Navbar = ({ title = 'Instagram Account Management' }) => {
  const { employee, logout, isAdmin, isSupabaseConfigured } = useAuth();

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Status */}
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>FastAPI Live</span>
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        {/* Role Pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 rounded-lg border border-slate-700/60 text-xs">
          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {employee?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="font-semibold text-slate-200 text-xs leading-none">{employee?.full_name}</p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{employee?.employee_code}</p>
          </div>
          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
            isAdmin ? 'bg-purple-500/20 text-purple-300' : 'bg-pink-500/20 text-pink-300'
          }`}>
            {employee?.role || 'employee'}
          </span>
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
