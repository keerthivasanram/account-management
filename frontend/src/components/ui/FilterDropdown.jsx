import React from 'react';
import { ChevronDown } from 'lucide-react';

export const FilterDropdown = ({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'All',
  className = '',
  icon: Icon,
  ...props
}) => {
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {Icon && (
        <Icon className="w-4 h-4 text-[#64748B] absolute left-3 pointer-events-none" />
      )}
      <select
        value={value}
        onChange={onChange}
        className={`h-[38px] appearance-none bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] rounded-md text-sm text-[#172B24] pr-8 text-left transition-colors cursor-pointer focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534] ${
          Icon ? 'pl-9' : 'pl-3'
        }`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt, i) => {
          const val = typeof opt === 'object' ? opt.value : opt;
          const lab = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={i} value={val}>
              {lab}
            </option>
          );
        })}
      </select>
      <ChevronDown className="w-4 h-4 text-[#94A3B8] absolute right-2.5 pointer-events-none" />
    </div>
  );
};

export default FilterDropdown;
