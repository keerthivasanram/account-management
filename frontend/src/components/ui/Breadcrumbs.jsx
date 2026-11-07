import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const Breadcrumbs = ({ items = [] }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav className="flex items-center gap-1.5 text-xs text-[#64748B] mb-2 font-normal" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />}
            {item.to && !isLast ? (
              <Link to={item.to} className="hover:text-[#172B24] transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-[#172B24] font-medium' : ''}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
