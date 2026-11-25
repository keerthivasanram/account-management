import { describe, expect, it } from 'vitest';
import { categoryLabel, mailTime, relatedAction } from './mailModel';
import { ARTICLES, searchArticles } from '../Help/helpContent';
import { linkLabel, shareText, splitLinks } from '../Chat/chatModel';

describe('mail', () => {
  it('labels categories and falls back to Other', () => {
    expect(categoryLabel('approvals')).toBe('Approvals');
    expect(categoryLabel('nope')).toBe('Other');
  });
  it('offers the right button for the related item', () => {
    expect(relatedAction('/accounts')).toBe('Open account');
    expect(relatedAction('/social/posts?tab=scheduled')).toBe('Open post');
    expect(relatedAction('/help?ticket=1')).toBe('Open ticket');
    expect(relatedAction('/tasks')).toBe('Open task');
    expect(relatedAction(null)).toBeNull();
    expect(relatedAction('https://evil.example')).toBeNull(); // never link out of the app
  });
  it('formats times relative to today', () => {
    const now = new Date('2026-11-25T12:00:00');
    expect(mailTime('2026-11-24T09:00:00', now)).toBe('Yesterday');
    expect(mailTime('2026-11-20T09:00:00', now)).toMatch(/20 Nov/);
    expect(mailTime('2026-11-25T09:05:00', now)).toMatch(/9:05/);
  });
});

describe('help search', () => {
  it('empty query lists every article', () => {
    expect(searchArticles('')).toHaveLength(ARTICLES.length);
  });
  it('every word must match, case-insensitive', () => {
    expect(searchArticles('RECONNECT').map((a) => a.id)).toContain('connect-instagram');
    expect(searchArticles('upload 50 MB').map((a) => a.id)).toEqual(expect.arrayContaining(['upload-failed']));
    expect(searchArticles('zzz nothing')).toEqual([]);
  });
});

describe('message links', () => {
  it('turns in-app paths into links and leaves the rest as text', () => {
    expect(splitLinks('See @north /accounts?search=north please')).toEqual([
      { text: 'See @north ' }, { to: '/accounts?search=north' }, { text: ' please' },
    ]);
  });
  it('ignores outside URLs and unknown paths', () => {
    expect(splitLinks('https://evil.example/accounts and /etc/passwd')).toEqual([{ text: 'https://evil.example/accounts and /etc/passwd' }]);
  });
  it('labels shared links', () => {
    expect(linkLabel('/accounts?search=north')).toBe('@north');
    expect(linkLabel('/social/posts?tab=scheduled')).toBe('Post');
  });
  it('builds share text that links to a page the recipient must be allowed to open', () => {
    expect(shareText('account', { username: 'north' })).toBe('/accounts?search=north');
    expect(shareText('post', { account_username: 'clay', status: 'APPROVED' })).toBe('Post for @clay /social/posts?tab=scheduled');
    expect(splitLinks(shareText('task', { title: 'Edit reel' })).some((s) => s.to === '/tasks')).toBe(true);
  });
});
