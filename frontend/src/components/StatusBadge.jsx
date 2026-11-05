import React from 'react';
import { CheckCircle2, Clock, AlertCircle, XCircle, ShieldCheck, Link2Off, RefreshCw } from 'lucide-react';

export const StatusBadge = ({ status, size = 'sm' }) => {
  const norm = (status || '').toLowerCase().trim();

  const configs = {
    connected: {
      label: 'Connected',
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: CheckCircle2,
    },
    approved: {
      label: 'Approved',
      bg: 'bg-green-500/10 text-green-400 border-green-500/20',
      icon: ShieldCheck,
    },
    pending_connection: {
      label: 'Pending Connect',
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: Clock,
    },
    pending_approval: {
      label: 'Awaiting Approval',
      bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      icon: Clock,
    },
    pending: {
      label: 'Pending',
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: Clock,
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: XCircle,
    },
    expired: {
      label: 'Token Expired',
      bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      icon: RefreshCw,
    },
    failed: {
      label: 'Connection Failed',
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: AlertCircle,
    },
    disconnected: {
      label: 'Not Connected',
      bg: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
      icon: Link2Off,
    },
    not_connected: {
      label: 'Not Connected',
      bg: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
      icon: Link2Off,
    },
    authorization_pending: {
      label: 'Auth Pending',
      bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: Clock,
    },
    connection_failed: {
      label: 'Connection Failed',
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: AlertCircle,
    },
    token_expired: {
      label: 'Token Expired',
      bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      icon: RefreshCw,
    },
    access_revoked: {
      label: 'Access Revoked',
      bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      icon: XCircle,
    },
    reauthorization_required: {
      label: 'Reauth Required',
      bg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
      icon: RefreshCw,
    },
    business: {
      label: 'Business',
      bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      icon: ShieldCheck,
    },
    creator: {
      label: 'Creator',
      bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      icon: CheckCircle2,
    },
  };

  const conf = configs[norm] || {
    label: status || 'Unknown',
    bg: 'bg-slate-800 text-slate-400 border-slate-700',
    icon: Clock,
  };

  const Icon = conf.icon;
  const sizeClasses = size === 'xs' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${conf.bg} ${sizeClasses}`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{conf.label}</span>
    </span>
  );
};

export default StatusBadge;
