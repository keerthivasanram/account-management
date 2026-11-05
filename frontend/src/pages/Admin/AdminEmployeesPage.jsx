import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  Users,
  Shield,
  User,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  Mail,
  Calendar,
  X
} from 'lucide-react';

export const AdminEmployeesPage = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.admin.listEmployees();
      setEmployees(res.data);
    } catch (err) {
      console.error('Failed to load employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleToggleActive = async (emp) => {
    setActionLoadingId(emp.id);
    setFeedback(null);
    try {
      await api.admin.updateEmployee(emp.id, { is_active: !emp.is_active });
      setFeedback({
        type: 'success',
        text: `Employee ${emp.full_name} is now ${!emp.is_active ? 'Active' : 'Inactive'}.`,
      });
      fetchEmployees();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to update employee status.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRoleChange = async (emp, newRole) => {
    setActionLoadingId(emp.id);
    setFeedback(null);
    try {
      await api.admin.updateEmployee(emp.id, { role: newRole });
      setFeedback({
        type: 'success',
        text: `Updated ${emp.full_name}'s role to ${newRole.toUpperCase()}.`,
      });
      fetchEmployees();
    } catch (err) {
      setFeedback({ type: 'error', text: 'Failed to update role.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Employees & Capacity Management</h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor staff workload allocations against the 50–60 accounts target per employee
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner text="Loading workforce list..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Employee Name & Code</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Capacity Progress (Target: 60)</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employees.map((emp) => {
                  const assigned = emp.assigned_accounts_count || 0;
                  const registered = emp.registered_accounts_count || 0;
                  const percent = Math.min(100, Math.round((assigned / 60) * 100));

                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold shrink-0">
                            {emp.full_name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-white">{emp.full_name}</p>
                            <p className="text-xs text-slate-400 font-mono">{emp.employee_code}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-300 font-mono">
                        {emp.email}
                      </td>

                      <td className="px-6 py-4">
                        <select
                          value={emp.role}
                          onChange={(e) => handleRoleChange(emp, e.target.value)}
                          disabled={actionLoadingId === emp.id}
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors font-medium capitalize"
                        >
                          <option value="employee">Employee</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>

                      <td className="px-6 py-4 w-64">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200">
                              {assigned} <span className="text-slate-500 font-normal">/ 60 assigned</span>
                            </span>
                            <span className="font-mono text-purple-400 text-[11px]">{percent}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                percent >= 80 ? 'bg-emerald-500' : percent >= 40 ? 'bg-pink-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${Math.max(2, percent)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500">
                            Registered by user: {registered} accounts
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            emp.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              emp.is_active ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleActive(emp)}
                          disabled={actionLoadingId === emp.id}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          {emp.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEmployeesPage;
