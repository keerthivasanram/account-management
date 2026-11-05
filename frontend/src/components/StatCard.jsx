import React from 'react';

export const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'indigo',
  subtitle,
  progress,
  progressLabel,
}) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      text: 'text-indigo-400',
      bar: 'bg-indigo-500',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-400',
      bar: 'bg-emerald-500',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-400',
      bar: 'bg-amber-500',
    },
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      text: 'text-rose-400',
      bar: 'bg-rose-500',
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      text: 'text-purple-400',
      bar: 'bg-purple-500',
    },
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className="bg-slate-800/60 backdrop-blur border border-slate-700/60 rounded-xl p-5 hover:border-slate-600 transition-all shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1.5">{value}</h3>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${scheme.bg} ${scheme.border} ${scheme.text}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
      )}

      {progress !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>{progressLabel || 'Progress'}</span>
            <span className="font-semibold text-slate-200">{progress}%</span>
          </div>
          <div className="w-full bg-slate-700/60 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${scheme.bar}`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StatCard;
