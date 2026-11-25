import React from 'react';
import { Loader2 } from 'lucide-react';

export const PrimaryButton = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  icon: Icon,
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-[38px] px-3.5 text-sm',
    lg: 'h-10 px-4 text-sm',
  }[size] || 'h-[38px] px-3.5 text-sm';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium text-white bg-brand-700 hover:bg-brand-800 active:bg-brand-900 border border-brand-700 shadow-sm shadow-brand-900/10 transition-colors duration-150 focus:outline-none focus:ring-4 focus:ring-brand-200 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${sizeStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin text-white" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0 text-white" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};

export default PrimaryButton;
