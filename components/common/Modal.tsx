
import React from 'react';
import { FaTimes } from 'react-icons/fa';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',    // 24rem (384px) - For receipts and simple prompts
    md: 'max-w-md',    // 28rem (448px)
    lg: 'max-w-lg',    // 32rem (512px) - Original default
    xl: 'max-w-xl',    // 36rem (576px)
    '2xl': 'max-w-2xl', // 42rem (672px) - For complex forms or wide content
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className={`bg-white dark:bg-dark-mode-blue-900 rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-dark-mode-blue-800">
          <h2 className="text-xl font-semibold dark:text-gray-200">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-dark-mode-blue-800">
            <FaTimes />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
