import { describe, expect, it } from 'vitest';
import { closeBlocked, fmtDays, hasWarnings } from './monthCloseModel';

describe('month close helpers', () => {
  it('formats half days', () => {
    expect(fmtDays(3)).toBe('3');
    expect(fmtDays(1.5)).toBe('1½');
    expect(fmtDays(0.5)).toBe('½');
    expect(fmtDays(2.25)).toBe('2.3');
    expect(fmtDays(null)).toBe('—');
  });
  it('closing needs the server’s OK and, with warnings, an acknowledgement', () => {
    const clean = { can_lock: true, issues: [{ severity: 'info' }] };
    const warned = { can_lock: true, issues: [{ severity: 'warn' }] };
    expect(closeBlocked(clean, false)).toBe(false);
    expect(hasWarnings(warned)).toBe(true);
    expect(closeBlocked(warned, false)).toBe(true);
    expect(closeBlocked(warned, true)).toBe(false);
    expect(closeBlocked({ can_lock: false, issues: [] }, true)).toBe(true);
  });
});
