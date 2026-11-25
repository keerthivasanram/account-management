import { describe, expect, it } from 'vitest';
import { celebrationText, kudosLine } from './communityModel';

describe('celebrations', () => {
  const today = new Date('2026-11-25T10:00:00');
  it('today, tomorrow and later dates', () => {
    expect(celebrationText({ full_name: 'Priya Nair', years: 3, date: '2026-11-25' }, today)).toBe('Priya Nair: 3 years at Klarves today');
    expect(celebrationText({ full_name: 'Rohan K', years: 1, date: '2026-11-26' }, today)).toBe('Rohan K: 1 year at Klarves tomorrow');
    expect(celebrationText({ full_name: 'Ana', years: 2, date: '2026-11-28', is_me: true }, today)).toMatch(/^You: 2 years at Klarves on Sat,? 28 Nov$/);
  });
});

describe('kudos lines', () => {
  it('reads from your point of view', () => {
    expect(kudosLine({ from_name: 'Priya', to_name: 'Sarah', for_me: true })).toBe('Priya → you');
    expect(kudosLine({ from_name: 'Sarah', to_name: 'Priya', sent_by_me: true })).toBe('You → Priya');
    expect(kudosLine({ from_name: 'Priya', to_name: 'Rohan' })).toBe('Priya → Rohan');
  });
});
