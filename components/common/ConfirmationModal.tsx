import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { FaExclamationTriangle } from 'react-icons/fa';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50">
            <FaExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <p className="mt-4 text-gray-600 dark:text-gray-300">{message}</p>
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;