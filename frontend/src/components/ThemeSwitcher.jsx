import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useThemePref } from '../hooks/useTheme';

const OPTIONS = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

/** Three-way Light / Dark / System control (radio group). */
export const ThemeSwitcher = ({ className = '' }) => {
  const [pref, setPref] = useThemePref();
  return (
    <div className={className}>
      <p id="theme-label" className="text-[11px] font-medium text-slate-500 mb-1.5">Appearance</p>
      <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-slate-100">
        {OPTIONS.map(({ id, label, icon: Icon }) => {
          const active = pref === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setPref(id)}
              className={`h-7 inline-flex items-center justify-center gap-1 rounded-md text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ThemeSwitcher;
