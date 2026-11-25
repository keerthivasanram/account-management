import React, { useState } from 'react';

/**
 * Single-series column chart (SVG). One accent hue, no legend (the title names the series).
 * Specs: columns <= 24px, 4px rounded data-end / square baseline, 2px gaps, hairline grid,
 * per-column hover tooltip with a hit target taller than the mark, selective labels
 * (max + last only), and a table view for screen readers / exact values.
 */
const ACCENT = '#028266'; // brand-600 (mockup active edge), validated: contrast >= 3:1 on white
const GRID = '#E5E7EB';
const INK_MUTED = '#64748B';
const INK = '#0F172A';

const niceMax = (v) => {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => v / s <= 4);
  return Math.ceil(v / step) * step;
};

const columnPath = (x, y, w, h, r) => {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
};

export const ColumnChart = ({ data, valueKey, labelKey, formatLabel = (v) => v, title, height = 180, unit = '' }) => {
  const [hover, setHover] = useState(null);
  const width = 640;
  const pad = { top: 18, right: 8, bottom: 26, left: 32 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(1, ...data.map((d) => d[valueKey])));
  const slot = innerW / data.length;
  const barW = Math.min(24, slot - 2);
  const ticks = [0, max / 2, max];
  const maxIdx = data.reduce((best, d, i) => (d[valueKey] > data[best][valueKey] ? i : best), 0);
  const lastIdx = data.length - 1;

  return (
    <figure className="relative" aria-label={title}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-hidden="true">
        {ticks.map((t) => {
          const y = pad.top + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={GRID} strokeWidth="1" />
              <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill={INK_MUTED}>{t.toLocaleString()}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const v = d[valueKey];
          const h = (v / max) * innerH;
          const x = pad.left + i * slot + (slot - barW) / 2;
          const y = pad.top + innerH - h;
          const showLabel = v > 0 && (i === maxIdx || i === lastIdx);
          return (
            <g key={d[labelKey]}>
              <path d={columnPath(x, y, barW, h, 4)} fill={ACCENT} opacity={hover === null || hover === i ? 1 : 0.55} />
              {showLabel && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill={INK}>{v}</text>
              )}
              {(i % 2 === lastIdx % 2) && (
                <text x={x + barW / 2} y={height - 8} textAnchor="middle" fontSize="10" fill={INK_MUTED}>{formatLabel(d[labelKey])}</text>
              )}
              {/* hit target: full slot height, wider than the mark */}
              <rect x={pad.left + i * slot} y={pad.top} width={slot} height={innerH} fill="transparent"
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full bg-white border border-[#E5E7EB] shadow-sm rounded-md px-2.5 py-1.5 text-xs"
          style={{ left: `${((pad.left + hover * slot + slot / 2) / width) * 100}%`, top: 4 }}
        >
          <p className="text-[#64748B]">{formatLabel(data[hover][labelKey])}</p>
          <p className="font-semibold text-slate-900 tabular-nums">{data[hover][valueKey]}{unit}</p>
        </div>
      )}
      <details className="mt-1">
        <summary className="text-[11px] text-[#64748B] cursor-pointer select-none">View as table</summary>
        <table className="mt-2 text-xs w-full max-w-xs">
          <tbody>
            {data.map((d) => (
              <tr key={d[labelKey]} className="border-b border-[#F1F5F9]">
                <td className="py-1 text-[#64748B]">{formatLabel(d[labelKey])}</td>
                <td className="py-1 text-right tabular-nums text-slate-900">{d[valueKey]}{unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
};

export default ColumnChart;
