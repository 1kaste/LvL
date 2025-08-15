
import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

interface RejectionReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const RejectionReasonModal: React.FC<RejectionReasonModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reject Shift Clearance">
      <div className="space-y-4">
        <div>
          <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Please provide a reason for rejection:
          </label>
          <textarea
            id="rejectionReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200 focus:border-primary-orange-500 focus:ring-primary-orange-500"
            placeholder="e.g., Cash declared does not match sales records."
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t dark:border-dark-mode-blue-700">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirm} disabled={!reason.trim()}>
            Confirm Rejection
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default RejectionReasonModal;
