import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingState = ({
  message = 'Loading data...',
  rows = 5,
  type = 'spinner', // 'spinner' | 'skeleton'
  className = '',
}) => {
  if (type === 'skeleton') {
    return (
      <div className={`p-4 space-y-3 animate-pulse ${className}`}>
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="h-9 bg-[#F1F5F9] rounded-md w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={`p-12 flex flex-col items-center justify-center text-center ${className}`}>
      <Loader2 className="w-6 h-6 animate-spin text-[#166534] mb-2" />
      <p className="text-sm text-[#64748B] font-normal">{message}</p>
    </div>
  );
};

export default LoadingState;
