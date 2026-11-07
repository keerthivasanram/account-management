import React from 'react';

export const MetricCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  trendDirection = 'neutral', // 'up' | 'down' | 'neutral'
  className = '',
}) => {
  const trendColors = {
    up: 'text-[#15803D] bg-[#F0FDF4]',
    down: 'text-[#DC2626] bg-[#FEF2F2]',
    neutral: 'text-[#64748B] bg-[#F1F5F9]',
  }[trendDirection] || 'text-[#64748B] bg-[#F1F5F9]';

  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs flex flex-col justify-between transition-colors hover:border-[#D1D5DB] ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-[#64748B] truncate">
          {label}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-md bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold text-[#172B24] tracking-tight">
          {value}
        </span>
        {trend && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${trendColors}`}>
            {trend}
          </span>
        )}
      </div>

      {subtext && (
        <p className="text-xs text-[#64748B] mt-1.5 font-normal">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default MetricCard;
