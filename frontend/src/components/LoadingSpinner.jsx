import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner = ({ text = 'Loading...', size = 'md' }) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-5 h-5';

  return (
    <div className="flex flex-col items-center justify-center p-8 text-[#64748B] gap-2.5">
      <Loader2 className={`${sizeClass} animate-spin text-[#166534]`} />
      {text && <p className="text-xs font-normal text-[#64748B]">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
