import { describe, expect, it } from 'vitest';
import { attentionItems, capacityLine, todaysWork, upcomingPosts, workspaceSummary } from './workspaceModel';

const now = new Date('2026-11-25T06:30:00Z'); // 12:00 IST
const me = { id: 'me' };
const acc = (over = {}) => ({ id: 'a', username: 'northstudio', status: 'connected', connection: { connection_status: 'CONNECTED' }, ...over });
const post = (over = {}) => ({ id: 'p', account_username: 'northstudio', created_by: 'me', status: 'APPROVED', scheduled_at: '2026-11-25T10:00:00Z', ...over });

describe('needs attention', () => {
  it('healthy accounts and posts need nothing', () => {
    expect(attentionItems([acc()], [post()], me, now)).toEqual([]);
  });

  it('flags rejected, lost access, expiring, not connected; most urgent first', () => {
    const items = attentionItems([
      acc({ id: '1', username: 'notyet', status: 'pending_connection', connection: null }),
      acc({ id: '2', username: 'expiring', connection: { connection_status: 'CONNECTED', token_expires_at: '2026-11-28T00:00:00Z' } }),
      acc({ id: '3', username: 'revoked', connection: { connection_status: 'REVOKED' } }),
      acc({ id: '4', username: 'nope', status: 'rejected' }),
    ], [], me, now);
    expect(items.map((i) => [i.title, i.action])).toEqual([
      ['@nope', 'Review rejected submission'],
      ['@revoked', 'Reconnect account'],
      ['@expiring', 'Reconnect account'],
      ['@notyet', 'Connect account'],
    ]);
    expect(items[2].detail).toBe('Instagram access expires in 3 days');
  });

  it('an expired token counts as lost access', () => {
    const [i] = attentionItems([acc({ connection: { connection_status: 'CONNECTED', token_expires_at: '2026-11-01T00:00:00Z' } })], [], me, now);
    expect(i.kind).toBe('reconnect');
  });

  it('only your own failed or sent-back posts need you', () => {
    const items = attentionItems([], [
      post({ id: 'f', status: 'FAILED', error_message: 'Media too large' }),
      post({ id: 'r', status: 'REJECTED', review_note: 'Add price' }),
      post({ id: 'x', status: 'FAILED', created_by: 'someone' }),
    ], me, now);
    expect(items.map((i) => i.detail)).toEqual(['Media too large', 'Changes needed: Add price']);
  });
});

describe('summary row', () => {
  it('counts due-today (incl. overdue), posts scheduled today and attention', () => {
    const s = workspaceSummary({
      assigned: 24,
      tasks: [
        { id: 1, status: 'TODO', due_date: '2026-11-25' },
        { id: 2, status: 'IN_PROGRESS', due_date: '2026-11-20' },
        { id: 3, status: 'TODO', due_date: '2026-12-01' },
        { id: 4, status: 'APPROVED', due_date: '2026-11-25' },
      ],
      posts: [post(), post({ id: 'q', scheduled_at: '2026-11-26T10:00:00Z' }), post({ id: 'w', status: 'PENDING_APPROVAL' })],
      attention: [{}],
    }, now);
    expect(s).toEqual({ assigned: 24, tasksDueToday: 2, overdue: 1, postsToday: 1, needsAttention: 1 });
  });
});

describe('lists', () => {
  it('upcoming posts: future scheduled or awaiting approval, soonest first', () => {
    const list = upcomingPosts([
      post({ id: 'late', scheduled_at: '2026-11-27T10:00:00Z' }),
      post({ id: 'past', scheduled_at: '2026-11-24T10:00:00Z' }),
      post({ id: 'pending', status: 'PENDING_APPROVAL', scheduled_at: '2026-11-26T10:00:00Z' }),
      post({ id: 'draft', status: 'DRAFT', scheduled_at: '2026-11-26T09:00:00Z' }),
      post({ id: 'soon' }),
    ], now);
    expect(list.map((p) => p.id)).toEqual(['soon', 'pending', 'late']);
  });

  it("today's work puts overdue and due today first and labels them", () => {
    const rows = todaysWork([
      { id: 'later', status: 'TODO', due_date: '2026-12-10' },
      { id: 'today', status: 'TODO', due_date: '2026-11-25' },
      { id: 'late', status: 'IN_PROGRESS', due_date: '2026-11-21' },
    ], now);
    expect(rows.map((r) => [r.id, r.due])).toEqual([['late', 'overdue'], ['today', 'today'], ['later', 'upcoming']]);
  });

  it('capacity line', () => {
    expect(capacityLine(24, 60)).toEqual({ text: '24 of 60 assigned', percent: 40 });
    expect(capacityLine(3, null)).toEqual({ text: '3 assigned', percent: null });
  });
});
