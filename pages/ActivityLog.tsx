import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import Card from '../components/common/Card';
import SearchInput from '../components/common/SearchInput';
import { FaHistory, FaShoppingCart, FaBoxOpen, FaUsers, FaCog, FaReceipt, FaUserClock, FaBeer, FaSignInAlt } from 'react-icons/fa';
import { ActivityType } from '../types';

const ActivityLog: React.FC = () => {
  const { activityLogs } = useData();
  const [searchQuery, setSearchQuery] = useState('');

  const typeIcons: Record<ActivityType, React.ReactNode> = {
    Sale: <FaShoppingCart className="text-green-500" />,
    Inventory: <FaBoxOpen className="text-blue-500" />,
    User: <FaUsers className="text-purple-500" />,
    System: <FaCog className="text-gray-500" />,
    PO: <FaReceipt className="text-primary-orange-500" />,
    Shift: <FaUserClock className="text-primary-cyan-500" />,
    Keg: <FaBeer className="text-yellow-500" />,
    Login: <FaSignInAlt className="text-indigo-500" />,
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery) return activityLogs;
    const lowerCaseQuery = searchQuery.toLowerCase();
    return activityLogs.filter(log =>
      log.user.toLowerCase().includes(lowerCaseQuery) ||
      log.type.toLowerCase().includes(lowerCaseQuery) ||
      log.description.toLowerCase().includes(lowerCaseQuery) ||
      (log.details && log.details.toLowerCase().includes(lowerCaseQuery))
    );
  }, [activityLogs, searchQuery]);

  return (
    <Card>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FaHistory />
          Activity Log
        </h2>
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search logs..."
          className="w-full sm:w-72"
        />
      </div>
      <div className="overflow-x-auto max-h-[70vh]">
        <table className="w-full text-left dark:text-gray-200">
          <thead className="border-b dark:border-dark-mode-blue-700 sticky top-0 bg-white dark:bg-dark-mode-blue-900 z-10">
            <tr>
              <th className="p-3">Type</th>
              <th className="p-3">Description</th>
              <th className="p-3">User</th>
              <th className="p-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => (
              <tr key={log.id} className="border-b dark:border-dark-mode-blue-800 hover:bg-gray-50 dark:hover:bg-dark-mode-blue-800/50 text-sm">
                <td className="p-3">
                  <div className="flex items-center gap-2" title={log.type}>
                    {typeIcons[log.type]}
                    <span className="font-semibold">{log.type}</span>
                  </div>
                </td>
                <td className="p-3">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{log.description}</p>
                    {log.details && <p className="text-xs text-gray-500 dark:text-gray-400">{log.details}</p>}
                </td>
                <td className="p-3">{log.user}</td>
                <td className="p-3 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredLogs.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500 dark:text-gray-400">No activity logs found matching your search.</p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ActivityLog;