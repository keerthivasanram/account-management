import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ChevronRight, ExternalLink, RefreshCw, Zap, Inbox } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import SecondaryButton from '../../components/ui/SecondaryButton';
import EmptyState from '../../components/ui/EmptyState';
import Protected from '../../components/ui/Protected';
import { connectionHealth, connectionRows, workloadSummary } from './dashboardModel';

// ---------------------------------------------------------------- building blocks

export const PanelError = ({ message, onRetry, compact = false }) => (
  <div role="alert" className={`flex ${compact ? 'items-center' : 'flex-col items-center text-center py-8'} gap-3 px-4`}>
    <div className={`flex items-start gap-2 text-sm text-rose-700 ${compact ? '' : 'flex-col items-center'}`}>
      <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
      <span>
        <span className="font-medium">Couldn&apos;t load this panel.</span>
        {message && <span className="block text-xs text-rose-600/80 mt-0.5">{message}</span>}
      </span>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-rose-200 bg-white text-rose-700 text-xs font-medium hover:bg-rose-50 focus:outline-none focus:ring-4 focus:ring-rose-100 shrink-0"
      >
        <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Retry
      </button>
    )}
  </div>
);

const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-md bg-slate-100 ${className}`} />;

export const Panel = ({ title, subtitle, action, children, className = '', bodyClassName = 'p-5', headerBorder = false }) => (
  <section className={`bg-white border border-[#E6EAF0] rounded-xl shadow-soft overflow-hidden ${className}`} aria-label={title}>
    {(title || action) && (
      <div className={`px-5 pt-4 ${headerBorder ? 'pb-3.5 border-b border-slate-100' : 'pb-0'} flex items-start justify-between gap-3`}>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

// ---------------------------------------------------------------- stats row

/**
 * One grouped row of headline numbers. items: [{ label, value(stats), pill(stats)?, icon }]
 * While loading, values show placeholders; on failure the whole row is replaced by an error,
 * never by zeros.
 */
export const StatsRow = ({ resource, items, label }) => {
  if (resource.error) {
    return (
      <section aria-label={label} className="bg-white border border-rose-200 rounded-xl shadow-soft py-3">
        <PanelError message={resource.error} onRetry={resource.reload} compact />
      </section>
    );
  }
  const stats = resource.data;
  return (
    <section aria-label={label} aria-busy={resource.loading} className={`stat-group grid grid-cols-2 ${items.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'}`}>
      {items.map((it) => {
        const Icon = it.icon;
        const pill = stats && it.pill ? it.pill(stats) : null;
        return (
          <div key={it.label} className="metric-card bg-white p-4 sm:p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <span className="text-[13px] font-medium text-slate-500 leading-snug">{it.label}</span>
              {Icon && (
                <span className="w-8 h-8 rounded-lg ring-1 bg-slate-100 text-slate-600 ring-slate-200 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </span>
              )}
            </div>
            {stats ? (
              <span className="mt-1.5 text-[28px] leading-none font-semibold text-slate-900 tracking-tight tabular-nums">
                {it.value(stats)}
              </span>
            ) : (
              <Skeleton className="mt-2 h-7 w-12" />
            )}
            {pill && (
              <span className={`mt-3 self-start text-[11px] font-medium px-2.5 py-1 rounded-full ${
                { good: 'text-emerald-700 bg-emerald-50', warning: 'text-amber-800 bg-amber-50', critical: 'text-rose-700 bg-rose-50' }[pill.tone]
                || 'text-slate-600 bg-slate-100'
              }`}>
                {pill.text}
              </span>
            )}
          </div>
        );
      })}
    </section>
  );
};

// ---------------------------------------------------------------- accounts

const useAccountColumns = () => {
  const navigate = useNavigate();
  return [
    {
      header: 'Instagram account',
      accessor: 'username',
      render: (row) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center text-slate-600 font-medium text-xs shrink-0" aria-hidden="true">
            @
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <Protected type="instagram_account" id={row.id} field="username" className="font-semibold text-sm text-slate-900">
                @{row.username}
              </Protected>
              {row.profile_url && (
                <a href={row.profile_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-900" aria-label={`Open @${row.username} on Instagram`}>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">{row.display_name || 'No display name'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Client & campaign',
      accessor: 'client_name',
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-slate-900">{row.client_name || '—'}</p>
          <p className="text-[11px] text-slate-500">{row.campaign_name || 'No campaign'}</p>
        </div>
      ),
    },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> },
    {
      header: 'Registered',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end">
          {row.status === 'pending_connection' ? (
            <SecondaryButton size="sm" onClick={() => navigate(`/accounts?connect=${row.id}`)} icon={Zap}
              className="text-brand-700 border-brand-200 hover:bg-brand-50">
              Connect
            </SecondaryButton>
          ) : (
            <SecondaryButton size="sm" onClick={() => navigate('/accounts')}>View</SecondaryButton>
          )}
        </div>
      ),
    },
  ];
};

/**
 * Accounts list panel. `total` (from the stats resource) controls "View all": hidden when zero
 * or unknown. Empty and error states are distinct.
 */
export const AccountsPanel = ({ resource, title, subtitle, total, emptyTitle, emptyText, emptyAction, viewAllTo = '/accounts', className = '' }) => {
  const columns = useAccountColumns();
  const rows = resource.data || [];
  return (
    <Panel
      title={title}
      subtitle={subtitle}
      headerBorder
      bodyClassName=""
      className={className}
      action={
        total > 0 && !resource.error ? (
          <Link to={viewAllTo} className="text-xs font-medium text-brand-700 hover:underline inline-flex items-center gap-1 shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            View all ({total}) <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        ) : null
      }
    >
      {resource.error ? (
        <PanelError message={resource.error} onRetry={resource.reload} />
      ) : resource.loading && !resource.data ? (
        <div className="p-5 space-y-3" aria-busy="true" aria-label="Loading accounts">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Inbox} title={emptyTitle} description={emptyText} action={emptyAction} />
      ) : (
        <DataTable columns={columns} data={rows} bare />
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------- connection status

const TONE_DOT = { good: 'bg-emerald-600', warning: 'bg-amber-500', neutral: 'bg-slate-400', critical: 'bg-rose-600' };
const HEALTH_STYLE = {
  healthy: 'text-emerald-700',
  attention: 'text-amber-800',
  empty: 'text-slate-500',
  error: 'text-rose-700',
};

export const ConnectionPanel = ({ resource, subtitle = 'Authorization status of the accounts in view' }) => {
  const health = connectionHealth(resource.data, resource.error);
  const rows = connectionRows(resource.data);
  const total = resource.data?.total || 0;
  return (
    <Panel title="Account connection status" subtitle={subtitle}>
      {resource.error ? (
        <PanelError message={resource.error} onRetry={resource.reload} />
      ) : !resource.data ? (
        <div className="space-y-3 mt-1" aria-busy="true">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
      ) : (
        <>
          {health.state === 'empty' ? (
            <p className="text-sm text-slate-500 py-3">No accounts to assess yet. Status appears once accounts are registered.</p>
          ) : (
            <ul className="space-y-3 text-[13px] mt-1">
              {rows.map((r) => (
                <li key={r.key}>
                  <div className="flex justify-between text-slate-800 mb-1.5">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${TONE_DOT[r.tone]}`} aria-hidden="true" />
                      {r.label}
                    </span>
                    <span className="tabular-nums font-medium">{r.count}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden" aria-hidden="true">
                    <div className={`h-full rounded-full ${TONE_DOT[r.tone]}`} style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Overall health</span>
            <span className={`font-semibold ${HEALTH_STYLE[health.state]}`}>{health.label}</span>
          </div>
        </>
      )}
    </Panel>
  );
};

// ---------------------------------------------------------------- workload

/**
 * "Your assigned accounts". profile resource -> assigned_accounts_count (personal, server-scoped).
 * capacity resource is optional: only roles allowed to read company policy pass one.
 */
export const WorkloadPanel = ({ profile, capacity, title = 'Your workload', children }) => {
  const failed = profile.error || capacity?.error;
  const ready = profile.data && (!capacity || capacity.data);
  const summary = ready
    ? workloadSummary(profile.data.assigned_accounts_count, capacity?.data || null)
    : null;
  const barTone = summary?.state === 'over' ? 'bg-rose-600' : 'bg-brand-600';
  return (
    <Panel title={title} subtitle="Accounts assigned to you">
      {failed ? (
        <PanelError
          message={profile.error || capacity?.error}
          onRetry={() => { if (profile.error) profile.reload(); if (capacity?.error) capacity.reload(); }}
        />
      ) : !summary ? (
        <Skeleton className="h-16 w-full mt-1" />
      ) : (
        <div className="mt-1 p-3.5 rounded-lg bg-slate-50 ring-1 ring-slate-100">
          <div className="flex justify-between items-baseline text-[13px]">
            <span className="font-medium text-slate-800">Your assigned accounts</span>
            <span className="font-semibold text-slate-900 tabular-nums">
              {summary.max ? <>{summary.count} <span className="text-slate-400 font-normal">/ {summary.max} max</span></> : summary.count}
            </span>
          </div>
          {summary.max && (
            <div
              className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden"
              role="progressbar"
              aria-label="Assigned accounts against company maximum"
              aria-valuemin={0}
              aria-valuemax={summary.max}
              aria-valuenow={summary.count}
            >
              <div className={`h-full rounded-full ${barTone}`} style={{ width: `${summary.percent}%` }} />
            </div>
          )}
          {summary.note && <p className="text-[11px] text-slate-500 mt-2">{summary.note}</p>}
        </div>
      )}
      {children}
    </Panel>
  );
};
