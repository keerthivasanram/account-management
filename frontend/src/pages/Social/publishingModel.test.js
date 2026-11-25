import { describe, expect, it } from 'vitest';
import {
  formatSchedule, fromLocalInput, postActionsFor, tabById, tabForStatus, toLocalInput, validateComposer,
} from './publishingModel';

const me = { id: 'me' };
const post = (over = {}) => ({ id: 'p', created_by: 'me', status: 'DRAFT', ...over });

describe('tabs', () => {
  it('maps statuses to the five tabs; sent-back posts live with drafts', () => {
    expect(tabForStatus('DRAFT')).toBe('drafts');
    expect(tabForStatus('REJECTED')).toBe('drafts');
    expect(tabForStatus('PENDING_APPROVAL')).toBe('awaiting');
    expect(tabForStatus('APPROVED')).toBe('scheduled');
    expect(tabForStatus('PUBLISHED')).toBe('published');
    expect(tabForStatus('FAILED')).toBe('failed');
  });
  it('unknown ?tab= falls back to drafts', () => {
    expect(tabById('nope').id).toBe('drafts');
  });
});

describe('post actions', () => {
  it('author edits, submits and deletes drafts and sent-back posts', () => {
    expect(postActionsFor(post(), me)).toEqual({ edit: true, submit: true, remove: true, review: false });
    expect(postActionsFor(post({ status: 'REJECTED' }), me)).toMatchObject({ edit: true, submit: true });
  });
  it('author can only withdraw while awaiting approval', () => {
    expect(postActionsFor(post({ status: 'PENDING_APPROVAL' }), me)).toEqual({ edit: false, submit: false, remove: true, review: false });
  });
  it('nothing to do once scheduled or published', () => {
    for (const status of ['APPROVED', 'PUBLISHED', 'FAILED']) {
      expect(Object.values(postActionsFor(post({ status }), me)).some(Boolean)).toBe(false);
    }
  });
  it('reviewers review other people’s posts, never their own', () => {
    expect(postActionsFor(post({ status: 'PENDING_APPROVAL', created_by: 'x' }), me, true).review).toBe(true);
    expect(postActionsFor(post({ status: 'PENDING_APPROVAL' }), me, true).review).toBe(false);
    expect(postActionsFor(post({ status: 'PENDING_APPROVAL', created_by: 'x' }), me, false).review).toBe(false);
  });
  it('the server decides who reviews (team leads: their team only)', () => {
    expect(postActionsFor(post({ status: 'PENDING_APPROVAL', created_by: 'x', can_review: true }), me, false).review).toBe(true);
    expect(postActionsFor(post({ status: 'PENDING_APPROVAL', created_by: 'x', can_review: false }), me, true).review).toBe(false);
  });
  it('non-authors get no edit controls', () => {
    expect(postActionsFor(post({ created_by: 'x' }), me)).toEqual({ edit: false, submit: false, remove: false, review: false });
  });
});

describe('composer validation', () => {
  const now = new Date('2026-11-25T10:00:00Z');
  const good = { account_id: 'a', caption: 'Hi', media_url: 'storage:post-media/me/x.jpg', scheduled_at: '2026-11-26T10:00:00Z' };
  it('accepts a complete post', () => {
    expect(validateComposer(good, { submit: true, now })).toEqual({});
  });
  it('lists every missing field', () => {
    expect(Object.keys(validateComposer({ caption: ' ' }, { now })).sort()).toEqual(['account_id', 'caption', 'media_url', 'scheduled_at']);
  });
  it('past time is fine for a draft but not for submitting', () => {
    const past = { ...good, scheduled_at: '2026-11-24T10:00:00Z' };
    expect(validateComposer(past, { submit: false, now })).toEqual({});
    expect(validateComposer(past, { submit: true, now }).scheduled_at).toBeTruthy();
  });
  it('caps captions at Instagram’s 2200 characters', () => {
    expect(validateComposer({ ...good, caption: 'x'.repeat(2201) }, { now }).caption).toBeTruthy();
  });
});

describe('time handling', () => {
  it('round-trips datetime-local values', () => {
    const iso = fromLocalInput('2026-11-26T13:00');
    expect(toLocalInput(iso)).toBe('2026-11-26T13:00');
  });
  it('shows the time zone with the scheduled time', () => {
    expect(formatSchedule('2026-11-26T07:30:00Z', 'en-IN', 'Asia/Kolkata')).toMatch(/1:00\s?pm.*(IST|GMT\+5:30)/i);
  });
});
