import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = 'Loading...', size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-slate-400 gap-3">
      <Loader2 className={`${sizeClass} animate-spin text-pink-500`} />
      {text && <p className="text-xs font-medium text-slate-400">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
