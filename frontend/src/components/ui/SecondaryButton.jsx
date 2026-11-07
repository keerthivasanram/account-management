import React from 'react';
import { Loader2 } from 'lucide-react';

export const SecondaryButton = ({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  icon: Icon,
  size = 'md',
  danger = false,
  className = '',
  ...props
}) => {
  const sizeStyles = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-[38px] px-3.5 text-sm',
    lg: 'h-10 px-4 text-sm',
  }[size] || 'h-[38px] px-3.5 text-sm';

  const colorStyles = danger
    ? 'text-[#DC2626] bg-white hover:bg-[#FEF2F2] border-[#FECACA] hover:border-[#F87171] focus:ring-[#DC2626]'
    : 'text-[#172B24] bg-white hover:bg-[#F9FAFB] active:bg-[#F3F4F6] border-[#E5E7EB] hover:border-[#D1D5DB] focus:ring-[#166534]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium border shadow-2xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${colorStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span>{children}</span>
    </button>
  );
};

export default SecondaryButton;
