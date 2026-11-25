// Pure rules behind the Overview panels. Kept free of React so they can be unit-tested.

/**
 * Connection health for a set of account status counts.
 * A failed request is never "healthy" and an empty set is never "needs attention".
 * Returns { state, label } with state one of: 'error' | 'empty' | 'healthy' | 'attention'.
 */
export const connectionHealth = (stats, error) => {
  if (error) return { state: 'error', label: 'Status unavailable' };
  if (!stats || !stats.total) return { state: 'empty', label: 'No accounts to assess' };
  const connectedShare = stats.connected / stats.total;
  if (connectedShare >= 0.8 && !stats.rejected) {
    return { state: 'healthy', label: `${Math.round(connectedShare * 100)}% connected` };
  }
  return { state: 'attention', label: 'Attention recommended' };
};

/**
 * The four status groups shown in the Connection status panel, in display order.
 * Approval-stage accounts are grouped so the rows always add up to the total.
 */
export const connectionRows = (stats) => {
  const s = stats || {};
  return [
    { key: 'connected', label: 'Connected & active', count: s.connected || 0, tone: 'good' },
    { key: 'pending_connection', label: 'Pending connection', count: s.pending_connection || 0, tone: 'warning' },
    { key: 'approval', label: 'Awaiting approval / approved', count: (s.pending_approval || 0) + (s.approved || 0), tone: 'neutral' },
    { key: 'rejected', label: 'Rejected', count: s.rejected || 0, tone: 'critical' },
  ];
};

/**
 * Personal workload line. capacity = { min, max } from company policy when the caller may see it.
 * Unknown capacity shows the assigned count alone rather than inventing a target.
 */
export const workloadSummary = (assigned, capacity) => {
  const count = Number.isFinite(assigned) ? assigned : 0;
  const max = capacity?.max;
  if (!Number.isFinite(max) || max <= 0) {
    return { count, max: null, percent: null, text: `${count} assigned`, note: null, state: 'unknown' };
  }
  const min = Number.isFinite(capacity?.min) ? capacity.min : null;
  const percent = Math.min(100, Math.round((count / max) * 100));
  let state = 'within';
  let note = min !== null ? `Company target is ${min}–${max} accounts.` : `Company maximum is ${max} accounts.`;
  if (count > max) { state = 'over'; note = `${count - max} over the ${max}-account maximum.`; }
  else if (min !== null && count < min) { state = 'under'; }
  return { count, max, percent, text: `${count} / ${max}`, note, state };
};

/** Which "Overview" content a layout variant gets. */
export const overviewKindFor = (variant) => (variant === 'operations' ? 'operations' : 'team');
