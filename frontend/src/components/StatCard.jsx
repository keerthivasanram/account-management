import React from 'react';
import MetricCard from './ui/MetricCard';

export const StatCard = ({ title, value, subtitle, icon, trend, trendType, ...props }) => {
  return (
    <MetricCard
      label={title}
      value={value}
      subtext={subtitle}
      icon={icon}
      trend={trend}
      trendDirection={trendType === 'positive' ? 'up' : trendType === 'negative' ? 'down' : 'neutral'}
      {...props}
    />
  );
};

export default StatCard;
