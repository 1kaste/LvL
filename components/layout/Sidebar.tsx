import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaTachometerAlt, FaBoxOpen, FaChartLine, FaReceipt, FaTruck, FaBrain, FaUtensils, FaUsersCog, FaCog, FaUserClock, FaBeer, FaHistory
} from 'react-icons/fa';
import { User, StoreSettings } from '../../types';

interface SidebarProps {
  isExpanded: boolean;
  currentUser: User;
  accessibleRoutes: string[];
  storeSettings: StoreSettings;
}

const NavItem: React.FC<{ to: string; icon: React.ReactNode; text: string; isExpanded: boolean }> = ({ to, icon, text, isExpanded }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center p-3 my-1 rounded-lg transition-colors duration-200 ${
          isActive
            ? 'bg-primary-orange-600 text-white shadow-md'
            : 'text-primary-cyan-100 hover:bg-primary-cyan-700 hover:text-white'
        }`
      }
    >
      <div className="w-6 h-6 flex items-center justify-center text-xl">{icon}</div>
      <span className={`ml-4 font-medium whitespace-nowrap transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>{text}</span>
    </NavLink>
);

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, currentUser, accessibleRoutes, storeSettings }) => {
  const allNavItems = [
    { to: '/', icon: <FaTachometerAlt />, text: 'Dashboard' },
    { to: '/order', icon: <FaUtensils />, text: 'Create Order' },
    { to: '/inventory', icon: <FaBoxOpen />, text: 'Inventory' },
    { to: '/keg-management', icon: <FaBeer />, text: 'Keg Management' },
    { to: '/reports', icon: <FaChartLine />, text: 'Reports' },
    { to: '/shift-summary', icon: <FaUserClock />, text: 'Shift Summary' },
    { to: '/activity-log', icon: <FaHistory />, text: 'Activity Log' },
    { to: '/purchase-orders', icon: <FaReceipt />, text: 'Purchase Orders' },
    { to: '/suppliers', icon: <FaTruck />, text: 'Suppliers' },
    { to: '/users', icon: <FaUsersCog />, text: 'Users' },
    { to: '/ai-suggestions', icon: <FaBrain />, text: 'Growth Insights' },
    { to: '/settings', icon: <FaCog />, text: 'Settings' },
  ];

  const visibleNavItems = allNavItems.filter(item => accessibleRoutes.includes(item.to));

  return (
    <div className={`fixed top-0 left-0 h-full bg-primary-cyan-900 text-white flex flex-col z-30 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-20'}`}>
      <div className="flex items-center justify-center h-20 border-b border-primary-cyan-800 px-2">
        {storeSettings.logoUrl ? (
          <img 
            src={storeSettings.logoUrl} 
            alt={`${storeSettings.storeName} logo`} 
            className={`h-10 object-contain transition-all duration-300 ${isExpanded ? '' : 'h-12'}`} 
          />
        ) : (
          <FaUtensils className={`text-4xl text-primary-orange-500 transition-transform duration-500 ${isExpanded ? 'rotate-0' : 'rotate-[360deg]'}`} />
        )}
        <h1 className={`ml-2 text-xl font-bold whitespace-nowrap overflow-hidden transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 w-0'}`}>{storeSettings.storeName}</h1>
      </div>
      <nav className="flex-1 px-4 py-4 overflow-y-auto">
        {visibleNavItems.map(item => (
          <NavItem key={item.to} {...item} isExpanded={isExpanded} />
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
