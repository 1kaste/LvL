import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import Button from './Button';
import ReceiptModal from './ReceiptModal';
import { OrderItem, User, Sale, StoreSettings, Discount } from '../../types';
import { FaArrowRight, FaTrash, FaPlus, FaMoneyBillWave, FaCreditCard, FaCheckCircle, FaBalanceScale } from 'react-icons/fa';
import MpesaIcon from './MpesaIcon';

interface SplitBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialOrderItems: OrderItem[];
  taxRate: number;
  currentUser: User;
  processSale: (order: OrderItem[], paymentMethod: Sale['paymentMethod'], servedBy: string, customerType: string, discount?: { name: string; amount: number; }) => Promise<Sale | null>;
  storeSettings: StoreSettings;
}

type Split = {
  id: number;
  items: OrderItem[];
  isPaid: boolean;
};

const SplitBillModal: React.FC<SplitBillModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialOrderItems,
  taxRate,
  currentUser,
  processSale,
  storeSettings
}) => {
  const [unassignedItems, setUnassignedItems] = useState<OrderItem[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [receiptData, setReceiptData] = useState<Sale | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Deep copy to prevent modifying the original order items directly
      setUnassignedItems(JSON.parse(JSON.stringify(initialOrderItems)));
      setSplits([{ id: 1, items: [], isPaid: false }]);
    }
  }, [isOpen, initialOrderItems]);
  
  const handleAddSplit = () => {
    setSplits(prev => [...prev, { id: Date.now(), items: [], isPaid: false }]);
  };
  
  const handleRemoveSplit = (splitId: number) => {
    const splitToRemove = splits.find(s => s.id === splitId);
    if (!splitToRemove || splitToRemove.items.length === 0) {
      setSplits(prev => prev.filter(s => s.id !== splitId));
    } else {
      alert("Cannot remove a split that contains items. Please move items back to unassigned first.");
    }
  };

  const moveItem = (itemToMove: OrderItem, toSplitId: number) => {
    // For simplicity, we move the entire item stack.
    // A more complex implementation could split quantities.
    setUnassignedItems(prev => prev.filter(item => item.id !== itemToMove.id));
    setSplits(prevSplits => prevSplits.map(split => {
      if (split.id === toSplitId) {
        const existingItem = split.items.find(i => i.id === itemToMove.id);
        if(existingItem) {
            // Item already exists, just increase quantity
             return {...split, items: split.items.map(i => i.id === itemToMove.id ? {...i, quantity: i.quantity + itemToMove.quantity} : i)};
        }
        // Add new item
        return { ...split, items: [...split.items, itemToMove] };
      }
      return split;
    }));
  };
  
  const returnItemToUnassigned = (itemToReturn: OrderItem, fromSplitId: number) => {
    // Remove from split
    setSplits(prevSplits => prevSplits.map(split => {
        if(split.id === fromSplitId) {
            return {...split, items: split.items.filter(item => item.id !== itemToReturn.id)}
        }
        return split;
    }));
    
    // Add back to unassigned
    setUnassignedItems(prevUnassigned => {
        const existing = prevUnassigned.find(i => i.id === itemToReturn.id);
        if(existing) {
            return prevUnassigned.map(i => i.id === itemToReturn.id ? {...i, quantity: i.quantity + itemToReturn.quantity} : i);
        }
        return [...prevUnassigned, itemToReturn];
    });
  };
  
  const handlePaySplit = async (splitId: number, paymentMethod: Sale['paymentMethod']) => {
    const splitIndex = splits.findIndex(s => s.id === splitId);
    if (splitIndex === -1) return;

    const split = splits[splitIndex];
    if (split.items.length === 0) return;

    const newSale = await processSale(split.items, paymentMethod, currentUser.name, `Split Bill`);
    setReceiptData(newSale);
    
    setSplits(prev => prev.map((s, index) => index === splitIndex ? { ...s, isPaid: true } : s));
  };

  const calculateTotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };
  
  const formatCurrency = (amount: number) => `Ksh ${amount.toFixed(2)}`;

  const isComplete = unassignedItems.length === 0 && splits.every(s => s.isPaid || s.items.length === 0);

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Split Bill" size="2xl">
        <div className="flex gap-4 min-h-[60vh] max-h-[75vh]">
          {/* Unassigned Items Column */}
          <div className="w-1/3 flex flex-col bg-gray-100 dark:bg-dark-mode-blue-900/50 p-3 rounded-lg">
            <h3 className="font-bold mb-2 border-b pb-2 dark:border-dark-mode-blue-700">Unassigned Items</h3>
            <div className="flex-grow overflow-y-auto space-y-2 pr-1">
              {unassignedItems.length > 0 ? (
                unassignedItems.map(item => (
                  <div key={item.id} className="bg-white dark:bg-dark-mode-blue-800 p-2 rounded-md shadow-sm">
                    <p className="font-semibold">{item.name} <span className="font-normal text-gray-500 dark:text-gray-400">({item.quantity}x)</span></p>
                    <div className="flex justify-end items-center gap-1 mt-1">
                      {splits.map((split, index) => !split.isPaid && (
                        <Button key={split.id} onClick={() => moveItem(item, split.id)} className="!p-1.5 !text-xs" title={`Move to Split ${index + 1}`}>
                          <FaArrowRight/>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">All items assigned.</div>
              )}
            </div>
          </div>

          {/* Splits Columns */}
          <div className="w-2/3 flex-grow flex gap-3 overflow-x-auto pb-2">
            {splits.map((split, index) => (
              <div key={split.id} className="w-1/2 flex-shrink-0 flex flex-col bg-gray-100 dark:bg-dark-mode-blue-900/50 p-3 rounded-lg relative">
                <div className="flex justify-between items-center mb-2 border-b pb-2 dark:border-dark-mode-blue-700">
                  <h3 className="font-bold">Split {index + 1}</h3>
                   {splits.length > 1 && !split.isPaid && (
                       <Button variant="danger" onClick={() => handleRemoveSplit(split.id)} className="!p-1 !text-xs"><FaTrash/></Button>
                   )}
                </div>
                
                {split.isPaid && (
                  <div className="absolute inset-0 bg-green-500/20 dark:bg-green-800/30 flex items-center justify-center rounded-lg z-10">
                    <span className="text-3xl font-bold text-green-600 dark:text-green-400 rotate-[-15deg] opacity-70 flex items-center gap-2"><FaCheckCircle/> PAID</span>
                  </div>
                )}

                <div className="flex-grow overflow-y-auto space-y-2">
                  {split.items.map(item => (
                    <div key={item.id} className="bg-white dark:bg-dark-mode-blue-800 p-2 rounded-md shadow-sm flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.quantity}x @ {formatCurrency(item.price)}</p>
                      </div>
                      <div className="font-semibold">{formatCurrency(item.quantity * item.price)}</div>
                      {!split.isPaid && (
                          <Button variant='danger' className='!p-1 !text-xs ml-2' onClick={() => returnItemToUnassigned(item, split.id)}><FaTrash/></Button>
                      )}
                    </div>
                  ))}
                  {split.items.length === 0 && <div className="text-center text-gray-500 dark:text-gray-400 pt-8">Move items here</div>}
                </div>
                
                <div className="mt-auto pt-2">
                  <div className="text-lg font-bold flex justify-between">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal(split.items))}</span>
                  </div>
                  {!split.isPaid && (
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      <Button onClick={() => handlePaySplit(split.id, 'cash')} disabled={split.items.length === 0} className="!p-2 !text-xs" variant="primary"><FaMoneyBillWave/></Button>
                      <Button onClick={() => handlePaySplit(split.id, 'card')} disabled={split.items.length === 0} className="!p-2 !text-xs bg-blue-600 text-white hover:bg-blue-500"><FaCreditCard/></Button>
                      <Button onClick={() => handlePaySplit(split.id, 'mpesa')} disabled={split.items.length === 0} className="!p-2 !text-xs bg-green-800 text-white hover:bg-green-700"><MpesaIcon/></Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
             <button onClick={handleAddSplit} className="self-center flex-shrink-0 w-16 h-16 bg-primary-orange-200 dark:bg-primary-orange-900/50 text-primary-orange-700 dark:text-primary-orange-300 rounded-lg flex items-center justify-center hover:bg-primary-orange-300 dark:hover:bg-primary-orange-800/50 transition-colors">
                <FaPlus size={24}/>
             </button>
          </div>
        </div>
        <div className="mt-6 flex justify-end space-x-2">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          <Button onClick={onComplete} disabled={!isComplete} icon={<FaBalanceScale />}>Finish &amp; Complete Order</Button>
        </div>
      </Modal>

      {receiptData && (
        <ReceiptModal
          isOpen={!!receiptData}
          onClose={() => setReceiptData(null)}
          sale={receiptData}
          settings={storeSettings}
          onPrintSuccess={() => {}}
        />
      )}
    </>
  );
};

export default SplitBillModal;
