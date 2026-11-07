import React from 'react';
import { Search, X } from 'lucide-react';

export const SearchInput = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  className = '',
  ...props
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-[38px] w-full pl-9 pr-8 text-sm text-[#172B24] placeholder-[#94A3B8] bg-white border border-[#E5E7EB] rounded-md transition-colors focus:outline-none focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={onClear || (() => onChange({ target: { value: '' } }))}
          className="absolute right-2.5 p-0.5 text-[#94A3B8] hover:text-[#172B24] rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
