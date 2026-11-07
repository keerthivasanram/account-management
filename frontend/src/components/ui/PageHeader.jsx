import React from 'react';
import Breadcrumbs from './Breadcrumbs';

export const PageHeader = ({
  title,
  description,
  breadcrumbs,
  actions,
  className = '',
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#172B24] tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm font-normal text-[#64748B] mt-1">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
