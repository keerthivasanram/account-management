import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import SecondaryButton from './SecondaryButton';

export const ErrorState = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while processing your request.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-6 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-[#991B1B]">{title}</h4>
          <p className="text-xs text-[#B91C1C] mt-0.5">{message}</p>
        </div>
      </div>
      {onRetry && (
        <SecondaryButton
          size="sm"
          onClick={onRetry}
          icon={RotateCcw}
          className="shrink-0 bg-white border-[#FECACA] text-[#991B1B] hover:bg-[#FEE2E2]"
        >
          Try Again
        </SecondaryButton>
      )}
    </div>
  );
};

export default ErrorState;
