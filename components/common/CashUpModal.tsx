

import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import Button from './Button';
import { User } from '../../types';
import { FaCheckCircle, FaMoneyBillWave, FaCreditCard } from 'react-icons/fa';
import MpesaIcon from './MpesaIcon';

interface CashUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (declaredAmount: number) => void;
  user: User;
  expectedSales: {
    cash: number;
    card: number;
    mpesa: number;
  };
}

const CashUpModal: React.FC<CashUpModalProps> = ({ isOpen, onClose, onConfirm, user, expectedSales }) => {
  const [declaredAmount, setDeclaredAmount] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDeclaredAmount('');
    }
  }, [isOpen]);

  const cashDifference = useMemo(() => {
      return declaredAmount ? parseFloat(declaredAmount) - expectedSales.cash : -expectedSales.cash;
  }, [declaredAmount, expectedSales.cash]);

  const handleConfirm = () => {
      onConfirm(parseFloat(declaredAmount) || 0);
  };

  const isConfirmDisabled = !declaredAmount;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`End of Shift Reconciliation`}>
        <div className="space-y-6">
            <div className="text-center">
                <img src={`https://i.pravatar.cc/80?u=${user.id}`} alt={user.name} className="w-20 h-20 rounded-full mx-auto mb-2 border-4 border-gray-200 dark:border-dark-mode-blue-700" />
                <h3 className="text-xl font-bold dark:text-gray-100">{user.name}</h3>
                <p className="text-gray-500 dark:text-gray-400">{user.role}</p>
            </div>
            
            <div className="p-4 bg-gray-100 dark:bg-dark-mode-blue-800/50 rounded-lg space-y-3">
                <h4 className="font-semibold text-center text-gray-700 dark:text-gray-300">Shift Sales Summary</h4>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-2"><FaMoneyBillWave className="text-green-500"/> Expected Cash</span>
                    <span className="font-mono font-semibold">Ksh {expectedSales.cash.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-2"><FaCreditCard className="text-blue-500"/> Card Sales</span>
                    <span className="font-mono font-semibold">Ksh {expectedSales.card.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-2"><MpesaIcon /> M-Pesa Sales</span>
                    <span className="font-mono font-semibold">Ksh {expectedSales.mpesa.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 dark:border-dark-mode-blue-700 my-2"></div>
                 <div className="flex justify-between items-center text-lg font-bold dark:text-gray-200">
                    <span>Total Sales</span>
                    <span className="font-mono">Ksh {(expectedSales.cash + expectedSales.card + expectedSales.mpesa).toFixed(2)}</span>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <label htmlFor="declaredAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cash Declared</label>
                    <input
                        id="declaredAmount"
                        type="number"
                        value={declaredAmount}
                        onChange={(e) => setDeclaredAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 block w-full text-lg p-2 rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200 focus:ring-primary-orange-500 focus:border-primary-orange-500"
                        required
                        autoFocus
                    />
                </div>
                <div className={`p-3 rounded-lg text-center ${
                    cashDifference === 0 ? 'bg-gray-100 dark:bg-dark-mode-blue-800' :
                    cashDifference > 0 ? 'bg-green-100 dark:bg-green-900/50' :
                    'bg-red-100 dark:bg-red-900/50'
                 }`}>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cash Shortage / Surplus</p>
                    <p className={`text-xl font-bold font-mono ${
                        cashDifference === 0 ? 'dark:text-gray-200' :
                        cashDifference > 0 ? 'text-green-600 dark:text-green-400' :
                        'text-red-600 dark:text-red-400'
                    }`}>
                        Ksh {cashDifference.toFixed(2)}
                    </p>
                </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-dark-mode-blue-700">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button onClick={handleConfirm} disabled={isConfirmDisabled} icon={<FaCheckCircle />}>
                    Submit for Clearance
                </Button>
            </div>
        </div>
    </Modal>
  );
};

export default CashUpModal;