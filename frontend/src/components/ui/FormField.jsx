import React from 'react';

export const FormField = ({
  label,
  required = false,
  error,
  helpText,
  children,
  className = '',
  id,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-[#172B24]"
        >
          {label}
          {required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}

      <div>{children}</div>

      {error && (
        <p className="text-xs text-[#DC2626] font-normal mt-1">
          {error}
        </p>
      )}

      {helpText && !error && (
        <p className="text-xs text-[#64748B] font-normal mt-1">
          {helpText}
        </p>
      )}
    </div>
  );
};

export default FormField;
