import React from 'react';

export const FormSection = ({
  title,
  description,
  children,
  className = '',
  headerAction,
}) => {
  return (
    <section className={`border-b border-[#E5E7EB] pb-6 mb-6 last:border-b-0 last:pb-0 last:mb-0 ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          {title && (
            <h3 className="text-base font-semibold text-[#172B24]">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs text-[#64748B] mt-0.5">
              {description}
            </p>
          )}
        </div>
        {headerAction && <div>{headerAction}</div>}
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
};

export default FormSection;
