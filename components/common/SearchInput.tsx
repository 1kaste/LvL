
import React from 'react';
import { FaSearch } from 'react-icons/fa';

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <FaSearch className="text-gray-400" />
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="block w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200"
      />
    </div>
  );
};

export default SearchInput;
