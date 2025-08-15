
import React from 'react';
import { FaBars } from 'react-icons/fa';

interface HeaderProps {
  pageTitle: string;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, toggleSidebar }) => {
  return (
    <header className="flex-shrink-0 bg-white dark:bg-dark-mode-blue-900 shadow-md h-20 flex items-center justify-between px-6 z-20">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-mode-blue-800 focus:outline-none">
          <FaBars className="h-6 w-6" />
        </button>
        <h1 className="text-xl md:text-2xl font-semibold ml-4">{pageTitle}</h1>
      </div>
    </header>
  );
};

export default Header;
