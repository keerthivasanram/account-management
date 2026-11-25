import React from 'react';
import { Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'There are no items to display at this time.',
  action,
  className = '',
}) => {
  return (
    <div className={`px-6 py-14 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="w-16 h-16 mb-5 rounded-2xl bg-brand-50 ring-1 ring-brand-100 flex items-center justify-center text-brand-700">
        <Icon className="w-7 h-7" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-slate-500 max-w-sm mb-5 leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
