import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import {
  History,
  Shield,
  Search,
  Filter,
  User,
  Clock,
  Code,
  Calendar
} from 'lucide-react';

export const AdminAuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (actionFilter) params.action = actionFilter;
      const res = await api.admin.listAuditLogs(params);
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const getActionColor = (action) => {
    if (action.includes('approved') || action.includes('connected')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (action.includes('rejected') || action.includes('failed') || action.includes('disconnected')) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (action.includes('assigned')) return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    return 'text-slate-300 bg-slate-800 border-slate-700';
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">System Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of all user registrations, Meta OAuth connections, assignments, and approvals
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: '', label: 'All Activities' },
            { id: 'account_registered', label: 'Registrations' },
            { id: 'instagram_connected', label: 'OAuth Connects' },
            { id: 'account_assigned', label: 'Assignments' },
            { id: 'account_approved', label: 'Approvals' },
            { id: 'account_rejected', label: 'Rejections' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActionFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                actionFilter === tab.id
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <LoadingSpinner text="Loading audit trail records..." />
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-200">No audit events recorded</h3>
            <p className="text-xs text-slate-500 mt-1">Activities will appear as users interact with accounts.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950/60 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Target Entity</th>
                  <th className="px-6 py-3.5">Safe Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-xs text-slate-400 font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-white text-xs">{log.actor_name || 'System / Auto'}</p>
                        {log.actor_code && (
                          <p className="text-[10px] text-slate-500 font-mono">{log.actor_code}</p>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs font-mono text-slate-300">
                      <span className="text-slate-500 block text-[10px] uppercase font-sans font-semibold">
                        {log.entity_type}
                      </span>
                      {log.entity_id ? `${log.entity_id.slice(0, 8)}...` : '—'}
                    </td>

                    <td className="px-6 py-4">
                      {log.extra_metadata && Object.keys(log.extra_metadata).length > 0 ? (
                        <pre className="text-[10px] font-mono text-slate-400 bg-slate-950 p-2 rounded-lg max-w-xs overflow-x-auto">
                          {JSON.stringify(log.extra_metadata, null, 1)}
                        </pre>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditLogsPage;
