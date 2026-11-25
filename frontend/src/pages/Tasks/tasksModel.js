// Task rules shared by the Tasks page and the dashboard "My tasks" panel.
// The backend enforces every rule here; these only decide what the UI offers.

export const TASK_PERM = { REVIEW_TEAM: 'tasks:review_team', REVIEW_ALL: 'tasks:review_all' };

export const STATUS_LABELS = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  IN_REVIEW: 'Waiting for review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
};

export const statusLabel = (s) => STATUS_LABELS[s] || (s || '').replace(/_/g, ' ').toLowerCase();

export const PRIORITY_LABELS = { URGENT: 'Urgent', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

const DONE = new Set(['APPROVED', 'COMPLETED']);
export const isOpen = (t) => !DONE.has(t.status);

/** Who may create tasks (managers for their team, admins for anyone). */
export const canCreateTasks = (permissions = []) =>
  permissions.includes(TASK_PERM.REVIEW_TEAM) || permissions.includes(TASK_PERM.REVIEW_ALL);

/** Local calendar date as YYYY-MM-DD (due dates are plain dates, not instants). */
export const isoDay = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dueDay = (t) => (t.due_date ? String(t.due_date).slice(0, 10) : null);

/** 'overdue' | 'today' | 'upcoming' | 'none' for an open task. */
export const dueState = (t, today = isoDay()) => {
  const d = dueDay(t);
  if (!d || !isOpen(t)) return 'none';
  if (d < today) return 'overdue';
  if (d === today) return 'today';
  return 'upcoming';
};

/**
 * What the current user can do with a task.
 *  - the assignee starts, resumes and submits their own work
 *  - someone else with review rights (creator, manager, admin) reviews it once submitted
 */
export const taskActionsFor = (task, me, permissions = []) => {
  const mine = Boolean(me && task.assigned_to === me.id);
  const reviewer = !mine && Boolean(me) && (
    permissions.includes(TASK_PERM.REVIEW_ALL)
    || task.created_by === me.id
    || permissions.includes(TASK_PERM.REVIEW_TEAM)
  );
  return {
    start: mine && task.status === 'TODO',
    resume: mine && task.status === 'CHANGES_REQUESTED',
    submit: mine && (task.status === 'IN_PROGRESS' || task.status === 'CHANGES_REQUESTED'),
    review: reviewer && task.status === 'IN_REVIEW',
  };
};

/** The most recent reviewer feedback asking for changes, if any. */
export const latestChangeRequest = (task) => {
  const events = (task.activity_events || []).filter((e) => e.action === 'CHANGES_REQUESTED');
  if (!events.length) return null;
  return events.reduce((a, b) => (new Date(b.created_at) > new Date(a.created_at) ? b : a));
};

const RANK = { CHANGES_REQUESTED: 0, overdue: 1, today: 2, IN_PROGRESS: 3, TODO: 4, IN_REVIEW: 5 };
const PRIORITY_RANK = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const urgency = (t, today) => {
  if (t.status === 'CHANGES_REQUESTED') return RANK.CHANGES_REQUESTED;
  const due = dueState(t, today);
  if (due === 'overdue' && t.status !== 'IN_REVIEW') return RANK.overdue;
  if (due === 'today' && t.status !== 'IN_REVIEW') return RANK.today;
  return RANK[t.status] ?? 9;
};

/**
 * Dashboard view of the user's own tasks: open ones ordered by what needs attention first,
 * plus counts. Tasks waiting for review are listed last; they're out of the user's hands.
 */
export const myTaskSummary = (tasks = [], today = isoDay()) => {
  const open = tasks.filter(isOpen);
  const ordered = [...open].sort((a, b) =>
    urgency(a, today) - urgency(b, today)
    || (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
    || String(dueDay(a) || '9999').localeCompare(String(dueDay(b) || '9999')));
  const count = (fn) => open.filter(fn).length;
  return {
    ordered,
    open: open.length,
    changes: count((t) => t.status === 'CHANGES_REQUESTED'),
    overdue: count((t) => t.status !== 'IN_REVIEW' && dueState(t, today) === 'overdue'),
    dueToday: count((t) => t.status !== 'IN_REVIEW' && dueState(t, today) === 'today'),
    inReview: count((t) => t.status === 'IN_REVIEW'),
  };
};
