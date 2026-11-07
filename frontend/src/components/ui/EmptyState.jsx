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
    <div className={`p-12 text-center flex flex-col items-center justify-center ${className}`}>
      <div className="w-12 h-12 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center text-[#64748B] mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#172B24] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[#64748B] max-w-sm mb-4 font-normal">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
