import { describe, expect, it } from 'vitest';
import { isMobileDevice } from './device';

const nav = (userAgent, extra = {}) => ({ userAgent, platform: 'Win32', maxTouchPoints: 0, ...extra });

describe('company computers only', () => {
  it('phones and tablets are mobile', () => {
    expect(isMobileDevice(nav('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148'))).toBe(true);
    expect(isMobileDevice(nav('Mozilla/5.0 (Linux; Android 15; Pixel 9) Chrome/131.0 Mobile Safari/537.36'))).toBe(true);
    expect(isMobileDevice(nav('Mozilla/5.0 (Linux; Android 14; SM-X710) Chrome/131.0 Safari/537.36'))).toBe(true); // Android tablet
    expect(isMobileDevice(nav('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)'))).toBe(true);
  });
  it('an iPad in desktop mode (Mac user agent + touch screen) is still mobile', () => {
    expect(isMobileDevice(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15', { platform: 'MacIntel', maxTouchPoints: 5 }))).toBe(true);
  });
  it('client hints say mobile', () => {
    expect(isMobileDevice(nav('Mozilla/5.0 (X11; Linux x86_64)', { userAgentData: { mobile: true } }))).toBe(true);
  });
  it('Windows and Mac computers are allowed, even with a narrow window', () => {
    expect(isMobileDevice(nav('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0 Safari/537.36'))).toBe(false);
    expect(isMobileDevice(nav('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) Safari/605.1.15', { platform: 'MacIntel', maxTouchPoints: 0 }))).toBe(false);
  });
  it('no navigator (server render) is not mobile', () => {
    expect(isMobileDevice(null)).toBe(false);
  });
});
