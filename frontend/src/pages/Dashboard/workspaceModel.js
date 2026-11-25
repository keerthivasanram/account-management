// Rules for the employee "My workspace" dashboard. Inputs are already scoped by the server.
import { isoDay, myTaskSummary, dueState } from '../Tasks/tasksModel';

const RENEW_WITHIN_DAYS = 7;

const sameLocalDay = (iso, day) => Boolean(iso) && isoDay(new Date(iso)) === day;

/**
 * Accounts and posts that need the employee to act, most urgent first.
 * Each item: { id, kind, title, detail, action, to }
 */
export const attentionItems = (accounts = [], posts = [], me = null, now = new Date()) => {
  const items = [];
  for (const a of accounts) {
    const handle = `@${a.username}`;
    const conn = a.connection;
    const expires = conn?.token_expires_at ? new Date(conn.token_expires_at) : null;
    if (a.status === 'rejected') {
      items.push({ id: `acc-rej-${a.id}`, kind: 'account_rejected', rank: 0, title: handle,
        detail: 'Registration was rejected', action: 'Review rejected submission', to: '/accounts' });
    } else if (conn?.connection_status === 'REVOKED' || (expires && expires <= now)) {
      items.push({ id: `acc-recon-${a.id}`, kind: 'reconnect', rank: 1, title: handle,
        detail: 'Instagram access was lost', action: 'Reconnect account', to: '/accounts' });
    } else if (expires && (expires - now) / 86400000 <= RENEW_WITHIN_DAYS) {
      const days = Math.max(1, Math.ceil((expires - now) / 86400000));
      items.push({ id: `acc-exp-${a.id}`, kind: 'expiring', rank: 3, title: handle,
        detail: `Instagram access expires in ${days} day${days === 1 ? '' : 's'}`, action: 'Reconnect account', to: '/accounts' });
    } else if (a.status === 'pending_connection') {
      items.push({ id: `acc-conn-${a.id}`, kind: 'connect', rank: 4, title: handle,
        detail: 'Not connected to Instagram yet', action: 'Connect account', to: '/accounts' });
    }
  }
  for (const p of posts) {
    if (me && p.created_by !== me.id) continue; // only your own posts need your action
    const handle = `@${p.account_username}`;
    if (p.status === 'FAILED') {
      items.push({ id: `post-fail-${p.id}`, kind: 'post_failed', rank: 1, title: handle,
        detail: p.error_message || 'Publishing failed', action: 'Open post', to: '/social/posts?tab=failed' });
    } else if (p.status === 'REJECTED') {
      items.push({ id: `post-rej-${p.id}`, kind: 'post_changes', rank: 2, title: handle,
        detail: p.review_note ? `Changes needed: ${p.review_note}` : 'Changes needed', action: 'Fix post', to: '/social/posts?tab=drafts' });
    }
  }
  return items.sort((a, b) => a.rank - b.rank);
};

/** Scheduled (approved) and awaiting-approval posts from now on, soonest first. */
export const upcomingPosts = (posts = [], now = new Date()) =>
  posts
    .filter((p) => (p.status === 'APPROVED' || p.status === 'PENDING_APPROVAL') && new Date(p.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));

/** The four headline numbers. Each one links to the list it counts. */
export const workspaceSummary = ({ assigned = 0, tasks = [], posts = [], attention = [] }, now = new Date()) => {
  const today = isoDay(now);
  const t = myTaskSummary(tasks, today);
  return {
    assigned,
    tasksDueToday: t.dueToday + t.overdue,
    overdue: t.overdue,
    postsToday: posts.filter((p) => p.status === 'APPROVED' && sameLocalDay(p.scheduled_at, today)).length,
    needsAttention: attention.length,
  };
};

/** "Today's work": overdue and due-today first, then everything else that's open. */
export const todaysWork = (tasks = [], now = new Date(), limit = 5) => {
  const today = isoDay(now);
  return myTaskSummary(tasks, today).ordered.slice(0, limit).map((t) => ({
    ...t,
    due: t.status === 'IN_REVIEW' ? 'review' : dueState(t, today),
  }));
};

/** "24 of 60 assigned" with percentage; target unknown -> count only. */
export const capacityLine = (assigned, max) => {
  if (!Number.isFinite(max) || max <= 0) return { text: `${assigned} assigned`, percent: null };
  return { text: `${assigned} of ${max} assigned`, percent: Math.min(100, Math.round((assigned / max) * 100)) };
};
