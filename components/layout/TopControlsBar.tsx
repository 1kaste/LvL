import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FaSun, FaMoon, FaBell, FaUser, FaClock, FaChevronDown, FaKeyboard, FaSignOutAlt, FaExclamationTriangle, FaDownload } from 'react-icons/fa';
import { User, Theme } from '../../types';
import { useData } from '../../context/DataContext';
import Button from '../common/Button';
import GlobalSearch from '../common/GlobalSearch';
import { Link } from 'react-router-dom';

interface TopControlsBarProps {
  currentUser: User;
  users: User[];
  setCurrentUser: (user: User) => void;
  toggleTheme: () => void;
  currentTheme: Theme;
  toggleKeyboard: () => void;
  onClockOut: () => void;
  onSimpleLogout: () => void;
  showInstallButton: boolean;
  onInstallClick: () => void;
}

const TopControlsBar: React.FC<TopControlsBarProps> = ({
  currentUser,
  users,
  setCurrentUser,
  toggleTheme,
  currentTheme,
  toggleKeyboard,
  onClockOut,
  onSimpleLogout,
  showInstallButton,
  onInstallClick,
}) => {
  const { clockIn, products, timeLogs } = useData();
  const [isUserMenuOpen, setUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [shiftDuration, setShiftDuration] = useState('00:00:00');

  useEffect(() => {
    let intervalId: number | undefined;

    if (currentUser.timeClockStatus === 'Clocked In' && currentUser.clockInTime) {
      const clockInTime = new Date(currentUser.clockInTime);
      intervalId = window.setInterval(() => {
        const now = new Date();
        const diff = now.getTime() - clockInTime.getTime();

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setShiftDuration(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentUser.timeClockStatus, currentUser.clockInTime]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuRef, notificationsRef]);

  const lowStockItemsCount = useMemo(() => {
    return products.filter(p => p.productType === 'Stocked' && p.stock > 0 && p.stock <= p.lowStockThreshold).length;
  }, [products]);

  const pendingApprovalsCount = useMemo(() => {
      if (currentUser.role === 'Admin' || currentUser.role === 'Manager') {
          return timeLogs.filter(log => log.status === 'Pending Approval').length;
      }
      return 0;
  }, [timeLogs, currentUser.role]);

  const totalNotifications = lowStockItemsCount + pendingApprovalsCount;

  return (
    <div className="flex-shrink-0 bg-white dark:bg-dark-mode-blue-900 shadow-sm flex items-center justify-between px-6 py-2 border-b dark:border-dark-mode-blue-800 z-10">
      <GlobalSearch />
      <div className="flex items-center space-x-4">
        {/* Install Button */}
        {showInstallButton && (
            <Button onClick={onInstallClick} variant="primary" className="!px-3 !py-1.5 text-xs animate-pulse">
                <FaDownload className="mr-2"/> Install App
            </Button>
        )}

        {/* Clock-in section */}
        <div className="flex items-center space-x-2">
            {currentUser.timeClockStatus === 'Clocked In' ? (
                <>
                    <div className="font-mono text-sm bg-gray-100 dark:bg-dark-mode-blue-800 px-3 py-1.5 rounded-md flex items-center gap-2 text-green-500 font-semibold">
                        <FaClock />
                        <span>{shiftDuration}</span>
                    </div>
                    <Button onClick={onClockOut} variant="secondary" className="!px-3 !py-1.5 text-xs">Clock Out</Button>
                </>
            ) : (
                <Button onClick={() => clockIn(currentUser.id)} variant="primary" className="!px-3 !py-1.5 text-xs">Clock In</Button>
            )}
        </div>

        {/* Keyboard toggle */}
        <button
          onClick={toggleKeyboard}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-mode-blue-800 focus:outline-none"
          title="Toggle Virtual Keyboard"
        >
          <FaKeyboard className="h-5 w-5" />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-mode-blue-800 focus:outline-none"
          title="Toggle Theme"
        >
          {currentTheme === 'light' ? <FaMoon className="h-5 w-5" /> : <FaSun className="h-5 w-5 text-primary-orange-400" />}
        </button>

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(prev => !prev)}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-mode-blue-800 focus:outline-none"
            title="Notifications"
          >
            <FaBell className="h-5 w-5" />
            {totalNotifications > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 text-xs flex items-center justify-center bg-red-500 text-white rounded-full border-2 border-white dark:border-dark-mode-blue-900">
                {totalNotifications}
              </span>
            )}
          </button>
          {isNotificationsOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-dark-mode-blue-950 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
              <div className="px-4 py-2 text-sm font-bold text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-dark-mode-blue-800">
                  Notifications
              </div>
              <ul className="py-1">
                {lowStockItemsCount > 0 && (
                  <li>
                    <Link to="/inventory" state={{ searchQuery: '' }} onClick={() => setNotificationsOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-mode-blue-800">
                      <div className="flex items-center">
                        <FaExclamationTriangle className="text-yellow-500 mr-3"/>
                        <div>
                          <p className="font-semibold">{lowStockItemsCount} item(s) are low on stock.</p>
                          <p className="text-xs text-gray-500">Click to view inventory.</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                )}
                {pendingApprovalsCount > 0 && (
                  <li>
                    <Link to="/shift-summary" onClick={() => setNotificationsOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-mode-blue-800">
                       <div className="flex items-center">
                        <FaClock className="text-purple-500 mr-3"/>
                        <div>
                          <p className="font-semibold">{pendingApprovalsCount} shift(s) awaiting clearance.</p>
                          <p className="text-xs text-gray-500">Click to review shifts.</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                )}
                {totalNotifications === 0 && (
                  <li className="px-4 py-3 text-sm text-center text-gray-500 dark:text-gray-400">
                    No new notifications.
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            className="flex items-center space-x-2 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-dark-mode-blue-800"
            onClick={() => setUserMenuOpen(!isUserMenuOpen)}
          >
            <img src={`https://i.pravatar.cc/40?u=${currentUser.id}`} alt={currentUser.name} className="w-9 h-9 rounded-full" />
            <div className="hidden md:block text-left">
              <p className="font-semibold text-sm">{currentUser.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.role}</p>
            </div>
            <FaChevronDown className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : 'rotate-0'}`} />
          </button>

          {isUserMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-dark-mode-blue-950 rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
              <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-200 border-b border-gray-100 dark:border-dark-mode-blue-800">
                <p className="font-bold">{currentUser.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.role}</p>
              </div>
              
              <div className="border-t border-gray-100 dark:border-dark-mode-blue-800 my-1"></div>
               <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onSimpleLogout();
                    setUserMenuOpen(false);
                  }}
                  className="flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-md mx-1"
                >
                  <FaSignOutAlt className="mr-2" /> Log Out
                </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopControlsBar;
