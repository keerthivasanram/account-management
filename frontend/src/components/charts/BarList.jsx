import React, { useState } from 'react';

/**
 * Horizontal bars for magnitude-by-category (single series).
 * One accent hue; an optional `highlight` row is the accent and the rest recede to gray
 * (emphasis, not identity). Bars <= 12px, 4px rounded data-end, value at the tip in text ink,
 * hover tooltip on the whole row, table view built in.
 */
const ACCENT = '#028266'; // brand-600 (mockup active edge), validated: contrast >= 3:1 on white
const RECEDE = '#94A3B8';

export const BarList = ({ rows, labelKey = 'label', valueKey = 'count', highlight, unit = '', emptyText = 'No data yet' }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...rows.map((r) => r[valueKey]));
  if (!rows.length) return <p className="text-xs text-[#64748B]">{emptyText}</p>;

  return (
    <div>
      <ul className="space-y-2.5">
        {rows.map((r, i) => {
          const v = r[valueKey];
          const pct = (v / max) * 100;
          const color = highlight === undefined || highlight === r[labelKey] ? ACCENT : RECEDE;
          return (
            <li
              key={r[labelKey]}
              className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 relative"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="text-xs text-[#64748B] truncate" title={r[labelKey]}>{r[labelKey]}</span>
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex-1 min-w-0">
                  <div
                    className="h-3 rounded-r-[4px] transition-opacity"
                    style={{ width: `${Math.max(pct, v > 0 ? 1.5 : 0)}%`, background: color, opacity: hover === null || hover === i ? 1 : 0.6 }}
                  />
                </div>
                <span className="text-xs font-semibold text-slate-900 tabular-nums w-10 text-right shrink-0">{v.toLocaleString()}{unit}</span>
              </div>
              {hover === i && (
                <div className="pointer-events-none absolute right-12 -top-7 bg-white border border-[#E5E7EB] shadow-sm rounded-md px-2 py-1 text-[11px] z-10 whitespace-nowrap">
                  <span className="text-[#64748B]">{r[labelKey]}: </span>
                  <span className="font-semibold text-slate-900">{v.toLocaleString()}{unit}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <details className="mt-2">
        <summary className="text-[11px] text-[#64748B] cursor-pointer select-none">View as table</summary>
        <table className="mt-2 text-xs w-full">
          <tbody>
            {rows.map((r) => (
              <tr key={r[labelKey]} className="border-b border-[#F1F5F9]">
                <td className="py-1 text-[#64748B]">{r[labelKey]}</td>
                <td className="py-1 text-right tabular-nums">{r[valueKey]}{unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
};

export default BarList;
