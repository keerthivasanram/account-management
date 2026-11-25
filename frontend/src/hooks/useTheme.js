import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

// Theme preference: 'light' | 'dark' | 'system'. Stored per browser; only the signed-in
// app applies it (the sign-in page keeps its fixed light design).
const KEY = 'klarves_theme';
const EVENT = 'klarves-theme-change';
const MODES = ['light', 'dark', 'system'];

export const readThemePref = () => {
  try {
    const v = localStorage.getItem(KEY);
    return MODES.includes(v) ? v : 'system';
  } catch {
    return 'system';
  }
};

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const resolveTheme = (pref, prefersDark) => (pref === 'system' ? (prefersDark ? 'dark' : 'light') : pref);

/** Preference + setter; every component using it stays in sync. */
export const useThemePref = () => {
  const [pref, setPrefState] = useState(readThemePref);
  useEffect(() => {
    const sync = () => setPrefState(readThemePref());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  const setPref = useCallback((next) => {
    try { localStorage.setItem(KEY, next); } catch { /* still applies for this session */ }
    setPrefState(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [pref, setPref];
};

/** Applies the theme to <html> while the calling component is mounted (the app shell). */
export const useApplyTheme = () => {
  const [pref] = useThemePref();
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const onChange = (e) => setPrefersDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Layout effect: switch before paint so there is no light flash.
  useLayoutEffect(() => {
    const dark = resolveTheme(pref, prefersDark) === 'dark';
    document.documentElement.classList.toggle('dark', dark);
    return () => document.documentElement.classList.remove('dark');
  }, [pref, prefersDark]);
};
