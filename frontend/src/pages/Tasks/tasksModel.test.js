import { describe, expect, it } from 'vitest';
import { canCreateTasks, dueState, latestChangeRequest, myTaskSummary, taskActionsFor } from './tasksModel';
import { leaveSummary, shiftView } from '../Dashboard/dashboardModel';

const me = { id: 'me' };
const task = (over = {}) => ({ id: 't', assigned_to: 'me', created_by: 'boss', status: 'TODO', priority: 'MEDIUM', ...over });
const EMPLOYEE = ['self:use'];
const MANAGER = ['self:use', 'manager:portal', 'tasks:review_team'];

describe('who can create tasks', () => {
  it('employees cannot, managers and admins can', () => {
    expect(canCreateTasks(EMPLOYEE)).toBe(false);
    expect(canCreateTasks(MANAGER)).toBe(true);
    expect(canCreateTasks(['tasks:review_all'])).toBe(true);
  });
});

describe('task actions', () => {
  it('assignee starts a new task, then submits it', () => {
    expect(taskActionsFor(task(), me, EMPLOYEE)).toMatchObject({ start: true, submit: false, review: false });
    expect(taskActionsFor(task({ status: 'IN_PROGRESS' }), me, EMPLOYEE)).toMatchObject({ start: false, submit: true });
  });

  it('after changes are requested the assignee can resume or resubmit', () => {
    expect(taskActionsFor(task({ status: 'CHANGES_REQUESTED' }), me, EMPLOYEE)).toMatchObject({ resume: true, submit: true });
  });

  it('nobody reviews their own work, even a manager', () => {
    expect(taskActionsFor(task({ status: 'IN_REVIEW' }), me, MANAGER).review).toBe(false);
  });

  it('an employee never gets review controls on someone else’s task', () => {
    const other = task({ assigned_to: 'x', status: 'IN_REVIEW' });
    expect(taskActionsFor(other, me, EMPLOYEE)).toEqual({ start: false, resume: false, submit: false, review: false });
    expect(taskActionsFor(other, me, MANAGER).review).toBe(true);
  });
});

describe('due dates and dashboard ordering', () => {
  const today = '2026-11-25';

  it('classifies due dates; finished tasks are never overdue', () => {
    expect(dueState(task({ due_date: '2026-11-20' }), today)).toBe('overdue');
    expect(dueState(task({ due_date: '2026-11-25' }), today)).toBe('today');
    expect(dueState(task({ due_date: '2026-12-01' }), today)).toBe('upcoming');
    expect(dueState(task({ due_date: '2026-11-20', status: 'APPROVED' }), today)).toBe('none');
  });

  it('puts requested changes, then overdue, then due today first; review last; drops done', () => {
    const s = myTaskSummary([
      task({ id: 'review', status: 'IN_REVIEW', due_date: '2026-11-01' }),
      task({ id: 'later', due_date: '2026-12-10' }),
      task({ id: 'today', due_date: today }),
      task({ id: 'done', status: 'APPROVED' }),
      task({ id: 'late', status: 'IN_PROGRESS', due_date: '2026-11-02' }),
      task({ id: 'fix', status: 'CHANGES_REQUESTED' }),
    ], today);
    expect(s.ordered.map((t) => t.id)).toEqual(['fix', 'late', 'today', 'later', 'review']);
    // a task waiting for review is out of the assignee's hands, so it isn't counted as overdue
    expect(s).toMatchObject({ open: 5, changes: 1, overdue: 1, dueToday: 1, inReview: 1 });
  });

  it('shows the newest change request', () => {
    const t = task({
      activity_events: [
        { action: 'CHANGES_REQUESTED', remarks: 'old', created_at: '2026-11-01T10:00:00Z' },
        { action: 'SUBMITTED_FOR_REVIEW', remarks: 'x', created_at: '2026-11-02T10:00:00Z' },
        { action: 'CHANGES_REQUESTED', remarks: 'new', created_at: '2026-11-03T10:00:00Z' },
      ],
    });
    expect(latestChangeRequest(t).remarks).toBe('new');
    expect(latestChangeRequest(task())).toBeNull();
  });
});

describe('shift and leave', () => {
  it('offers clock-in, then clock-out, then nothing', () => {
    expect(shiftView({ today_status: 'NOT_CHECKED_IN' }).action).toBe('check-in');
    const on = shiftView({ today_status: 'CHECKED_IN', today_check_in: '2026-11-25T09:00:00Z' }, new Date('2026-11-25T11:30:00Z'));
    expect(on).toMatchObject({ headline: 'On shift', action: 'check-out' });
    expect(on.detail).toContain('2 h 30 min so far');
    expect(shiftView({ today_status: 'CHECKED_OUT', today_hours: 8 }).action).toBeNull();
  });

  it('a missing summary is treated as not clocked in', () => {
    expect(shiftView(null).action).toBe('check-in');
  });

  it('hides leave types with no allowance and totals pending days', () => {
    const s = leaveSummary({
      year: 2026,
      balances: [
        { leave_type: 'ANNUAL', allowance: 18, remaining: 15, pending: 2 },
        { leave_type: 'EMERGENCY', allowance: 0, remaining: 0, pending: 0 },
        { leave_type: 'SICK', allowance: 10, remaining: 10, pending: 1 },
      ],
    });
    expect(s.types.map((t) => t.label)).toEqual(['Annual', 'Sick']);
    expect(s.pending).toBe(3);
  });
});
