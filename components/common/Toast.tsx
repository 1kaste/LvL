import React, { useEffect } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle } from 'react-icons/fa';

interface ToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
}

const Toast: React.FC<ToastProps> = ({ message, show, onClose, duration = 3000, type = 'success', action }) => {
  useEffect(() => {
    if (show && !action) { // Only auto-close if there's no action
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, onClose, duration, action]);

  const baseClasses = 'max-w-sm w-full shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden';
  const typeStyles = {
    success: {
      bg: 'bg-green-600 dark:bg-green-700',
      icon: <FaCheckCircle className="h-6 w-6 text-white" aria-hidden="true" />
    },
    error: {
      bg: 'bg-red-600 dark:bg-red-700',
      icon: <FaExclamationCircle className="h-6 w-6 text-white" aria-hidden="true" />
    },
    info: {
        bg: 'bg-blue-600 dark:bg-blue-700',
        icon: <FaInfoCircle className="h-6 w-6 text-white" aria-hidden="true" />
    }
  };

  const currentStyle = typeStyles[type] || typeStyles.success;

  return (
    <div
      aria-live="assertive"
      className={`fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-[100]`}
    >
      <div
        className={`transform transition-all duration-500 ease-out 
          ${ show ? 'opacity-100 translate-y-0 sm:translate-x-0' : 'opacity-0 translate-y-2 sm:translate-y-0 sm:translate-x-2' }
          ${baseClasses} ${currentStyle.bg}`}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {currentStyle.icon}
            </div>
            <div className="ml-3 w-0 flex-1">
              <p className="text-sm font-medium text-white">{message}</p>
              {action && (
                <div className="mt-1">
                  <button onClick={action.onClick} className="text-sm font-semibold text-white underline hover:text-gray-200 focus:outline-none">
                    {action.label}
                  </button>
                </div>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={onClose}
                className="inline-flex text-white rounded-md hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current"
              >
                <span className="sr-only">Close</span>
                 &times;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
