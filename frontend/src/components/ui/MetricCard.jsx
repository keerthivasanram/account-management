import React from 'react';

// Icon tile tints. Decorative only: the label and value always carry the meaning.
const TONES = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  violet: 'bg-violet-50 text-violet-700 ring-violet-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export const MetricCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  trendDirection = 'neutral', // 'up' | 'down' | 'neutral'
  tone = 'slate',
  className = '',
}) => {
  const trendColors = {
    up: 'text-emerald-700 bg-emerald-50',
    down: 'text-rose-700 bg-rose-50',
    neutral: 'text-slate-600 bg-slate-100',
  }[trendDirection] || 'text-slate-600 bg-slate-100';

  return (
    <div
      className={`metric-card bg-white border border-[#E6EAF0] rounded-xl p-5 shadow-soft flex flex-col ${className}`}
      title={typeof subtext === 'string' ? subtext : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-medium text-slate-500 leading-snug">
          {label}
        </span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg ring-1 flex items-center justify-center shrink-0 ${TONES[tone] || TONES.brand}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <span className="mt-1.5 text-[28px] leading-none font-semibold text-slate-900 tracking-tight tabular-nums">
        {value}
      </span>

      {trend && (
        <span className={`mt-3 self-start text-[11px] font-medium px-2.5 py-1 rounded-full ${trendColors}`}>
          {trend}
        </span>
      )}

      {/* With a pill, the detail line moves to the tooltip (keeps the row compact) */}
      {subtext && !trend && (
        <p className="metric-subtext text-xs text-slate-500 mt-3">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default MetricCard;
