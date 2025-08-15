import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Discount, PaymentMethod, Printer, Sale, ScheduledShift, StoreSettings, User, Product } from '../types';
import { useData } from '../context/DataContext';
import { usePrinters } from '../context/PrinterContext';
import { formatTestPrint } from '../utils/formatReceiptForPrinter';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ConfirmationModal from '../components/common/ConfirmationModal';
import Toast from '../components/common/Toast';
import { FaSave, FaPrint, FaPlus, FaEdit, FaTrash, FaInfoCircle, FaCreditCard, FaSignal, FaPlug, FaTimesCircle, FaCheckCircle, FaPercentage, FaTags, FaToggleOn, FaToggleOff, FaUserClock, FaLock, FaShieldAlt, FaCalendarAlt, FaExclamationTriangle, FaSearch, FaUsers, FaUserShield, FaEye, FaTimes } from 'react-icons/fa';
import Receipt from '../components/common/Receipt';
import UserDetailsModal from '../components/common/UserDetailsModal';
import SearchInput from '../components/common/SearchInput';

// --- MODALS (Defined inside Settings to keep file count low) ---

const DiscountFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (discountData: Omit<Discount, 'id' | 'isActive'> | Discount) => void;
  discount?: Discount | null;
  products: Product[];
}> = ({ isOpen, onClose, onSave, discount, products }) => {
    const [formData, setFormData] = useState({
        name: discount?.name || '',
        type: discount?.type || 'percentage',
        value: discount?.value || 0,
        productIds: discount?.productIds || [] as string[],
    });
    const [productSearch, setProductSearch] = useState('');

    useEffect(() => {
        if(isOpen) {
            setFormData({
                name: discount?.name || '',
                type: discount?.type || 'percentage',
                value: discount?.value || 0,
                productIds: discount?.productIds || [],
            });
            setProductSearch('');
        }
    }, [isOpen, discount]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSave = () => {
        const dataToSave = { ...formData };
        if (discount) {
            onSave({ ...discount, ...dataToSave });
        } else {
            onSave(dataToSave as Omit<Discount, 'id' | 'isActive'>);
        }
        onClose();
    };

    const handleProductSelect = (productId: string) => {
        setFormData(prev => ({
            ...prev,
            productIds: [...prev.productIds, productId]
        }));
        setProductSearch('');
    };

    const handleProductRemove = (productId: string) => {
        setFormData(prev => ({
            ...prev,
            productIds: prev.productIds.filter(id => id !== productId)
        }));
    };

    const filteredProducts = useMemo(() => {
        if (!productSearch) return [];
        return products.filter(p => 
            !formData.productIds.includes(p.id) && 
            p.name.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 5);
    }, [productSearch, products, formData.productIds]);
    
    const selectedProducts = useMemo(() => {
        return products.filter(p => formData.productIds.includes(p.id));
    }, [formData.productIds, products]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={discount ? 'Edit Discount' : 'Add New Discount'}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                        <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200">
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount (Ksh)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Value</label>
                        <input type="number" name="value" value={formData.value} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required step="0.01" min="0" />
                    </div>
                </div>

                <div className="pt-4 mt-4 border-t dark:border-dark-mode-blue-700">
                    <h4 className="font-semibold mb-2">Applies To</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        Leave empty to apply this discount to the entire order. Select products to apply it only to them.
                    </p>
                    <div className="relative">
                        <SearchInput 
                            value={productSearch}
                            onChange={e => setProductSearch(e.target.value)}
                            placeholder="Search to add products..."
                        />
                        {filteredProducts.length > 0 && (
                            <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-mode-blue-800 border dark:border-dark-mode-blue-700 rounded-md shadow-lg max-h-40 overflow-y-auto">
                                {filteredProducts.map(p => (
                                    <li key={p.id} onClick={() => handleProductSelect(p.id)} className="p-2 hover:bg-primary-orange-100 dark:hover:bg-primary-orange-900/50 cursor-pointer">
                                        {p.name}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                        {selectedProducts.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-dark-mode-blue-800 rounded-md">
                                <span>{p.name}</span>
                                <button onClick={() => handleProductRemove(p.id)} className="p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50">
                                    <FaTimes className="text-red-500"/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleSave}>{discount ? 'Save Changes' : 'Add Discount'}</Button>
                </div>
            </div>
        </Modal>
    );
};


const ShiftFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: any) => void;
  shift?: ScheduledShift | null;
  users: User[];
  date: Date;
}> = ({ isOpen, onClose, onSave, shift, users, date }) => {
    const [formData, setFormData] = useState({
        userId: shift?.userId || (users.length > 0 ? users[0].id : ''),
        startTime: shift?.startTime || '09:00',
        endTime: shift?.endTime || '17:00',
    });

    useEffect(() => {
        if (isOpen) {
            setFormData({
                userId: shift?.userId || (users.length > 0 ? users[0].id : ''),
                startTime: shift?.startTime || '09:00',
                endTime: shift?.endTime || '17:00',
            });
        }
    }, [isOpen, shift, users]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({...prev, [e.target.name]: e.target.value }));
    };

    const handleSave = () => {
        const dataToSave = {
            ...formData,
            date: date.toISOString().split('T')[0],
        };
        if (shift) {
            onSave({ ...shift, ...dataToSave });
        } else {
            onSave(dataToSave);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={shift ? 'Edit Shift' : 'Add New Shift'}>
            <div className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Employee</label>
                    <select name="userId" value={formData.userId} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                        <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                        <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required />
                    </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleSave}>{shift ? 'Save Changes' : 'Add Shift'}</Button>
                </div>
            </div>
        </Modal>
    );
};


const PrinterFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (printerData: Omit<Printer, 'id'> | Printer) => void;
  printer?: Printer | null;
}> = ({ isOpen, onClose, onSave, printer }) => {
    const [formData, setFormData] = useState({
        name: printer?.name || '',
        type: printer?.type || 'USB',
        address: printer?.address || '',
    });
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState('');
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');


    useEffect(() => {
        if (isOpen) {
            setFormData({
                name: printer?.name || '',
                type: printer?.type || 'USB',
                address: printer?.address || '',
            });
            setScanError('');
            setIsScanning(false);
            setTestStatus('idle');
        }
    }, [isOpen, printer]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'type') {
                newState.address = '';
                newState.name = ''; // Clear name to encourage re-discovery
                setTestStatus('idle');
            }
            if (name === 'address') {
                 setTestStatus('idle');
            }
            return newState;
        });
    };
    
    const handleFindDevice = async () => {
        setIsScanning(true);
        setScanError('');
        try {
            if (formData.type === 'USB') {
                if (!(navigator as any).usb) {
                    setScanError('WebUSB API is not supported by your browser.');
                    return;
                }
                const device = await (navigator as any).usb.requestDevice({ filters: [] });
                setFormData(prev => ({
                    ...prev,
                    name: device.productName || `USB Device ${device.vendorId}`,
                    address: `usb:${device.vendorId}:${device.productId}`
                }));
            } else if (formData.type === 'Bluetooth') {
                if (!(navigator as any).bluetooth) {
                    setScanError('Web Bluetooth API is not supported by your browser.');
                    return;
                }
                const device = await (navigator as any).bluetooth.requestDevice({
                    acceptAllDevices: true,
                    optionalServices: ['00001101-0000-1000-8000-00805f9b34fb'] // Serial Port Profile
                });
                if (!device.name) {
                    setScanError('Selected Bluetooth device has no name. Cannot add.');
                    return;
                }
                setFormData(prev => ({
                    ...prev,
                    name: device.name,
                    address: `bt:${device.id}`
                }));
            }
        } catch (error) {
            console.error('Error finding device:', error);
            if (error instanceof Error) {
                if (error.name === 'NotFoundError') {
                    setScanError('No device selected or found.');
                } else if (error.message.includes("user gesture")) {
                    setScanError('Device discovery must be initiated by a user click.');
                } else {
                    setScanError(`Error: ${error.message}`);
                }
            } else {
                setScanError('An unknown error occurred during device scan.');
            }
        } finally {
            setIsScanning(false);
        }
    };
    
    const handleTestConnection = () => {
        if (!formData.address || formData.type !== 'IP') return;
        setTestStatus('testing');
        const wsUrl = `ws://${formData.address}`;
        let ws: WebSocket;

        const timeout = setTimeout(() => {
            setTestStatus('failed');
            if (ws) ws.close();
            setTimeout(() => setTestStatus('idle'), 3000);
        }, 5000);

        try {
            ws = new WebSocket(wsUrl);
            ws.onopen = () => {
                clearTimeout(timeout);
                setTestStatus('success');
                setTimeout(() => setTestStatus('idle'), 2000);
                ws.close();
            };
            ws.onerror = () => {
                clearTimeout(timeout);
                setTestStatus('failed');
                setTimeout(() => setTestStatus('idle'), 3000);
            };
        } catch (e) {
            clearTimeout(timeout);
            setTestStatus('failed');
            setTimeout(() => setTestStatus('idle'), 3000);
        }
    };

    const handleSave = () => {
        if (!formData.name) {
            setScanError('Please assign a name to the printer.');
            return;
        }
        const dataToSave = { ...formData };
        if (printer) {
            onSave({ ...printer, ...dataToSave });
        } else {
            onSave(dataToSave as Omit<Printer, 'id'>);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={printer ? 'Edit Printer' : 'Add New Printer'}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Printer Type</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required>
                        <option value="USB">USB</option>
                        <option value="Bluetooth">Bluetooth</option>
                        <option value="IP">IP (Network)</option>
                    </select>
                </div>
                
                {(formData.type === 'USB' || formData.type === 'Bluetooth') && (
                    <div className="p-3 bg-gray-50 dark:bg-dark-mode-blue-900/50 rounded-lg space-y-3 border border-dashed dark:border-dark-mode-blue-700">
                        <Button type="button" onClick={handleFindDevice} disabled={isScanning} icon={<FaSearch/>}>
                            {isScanning ? 'Scanning...' : `Find ${formData.type} Device`}
                        </Button>
                        {scanError && <p className="text-red-500 text-sm">{scanError}</p>}
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            This will open a browser window to select your device. For these printers, the app uses your system's print dialog, so ensure the printer is installed correctly in your OS.
                        </p>
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Printer Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g., Front Counter" className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" required disabled={isScanning || ((formData.type === 'USB' || formData.type === 'Bluetooth') && !formData.name)} />
                </div>
                
                {(formData.type === 'USB' || formData.type === 'Bluetooth') && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Device Identifier</label>
                        <input 
                            type="text" 
                            name="address" 
                            value={formData.address} 
                            placeholder="Auto-filled after discovery" 
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-200 dark:bg-dark-mode-blue-700 cursor-not-allowed"
                            readOnly
                        />
                    </div>
                )}

                {formData.type === 'IP' && (
                    <div className="p-3 bg-gray-50 dark:bg-dark-mode-blue-900/50 rounded-lg space-y-3 border border-dashed dark:border-dark-mode-blue-700">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Due to browser security, automatic network scanning is not possible. Please find your printer's IP address from its settings screen or by printing a configuration page.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">IP Address & Port</label>
                            <div className="flex items-center gap-2 mt-1">
                                <input 
                                    type="text" 
                                    name="address" 
                                    value={formData.address} 
                                    onChange={handleChange} 
                                    placeholder="e.g., 192.168.1.100:81" 
                                    className="block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200"
                                    required
                                />
                                <Button type="button" variant="secondary" onClick={handleTestConnection} disabled={testStatus === 'testing' || !formData.address} className="!px-3 !py-2">
                                    {testStatus === 'testing' && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>}
                                    {testStatus === 'idle' && 'Test'}
                                    {testStatus === 'success' && <FaCheckCircle className="text-green-400" />}
                                    {testStatus === 'failed' && <FaTimesCircle className="text-red-400" />}
                                </Button>
                            </div>
                            {testStatus === 'success' && <p className="text-green-600 dark:text-green-400 text-xs mt-1">Connection successful!</p>}
                            {testStatus === 'failed' && <p className="text-red-600 dark:text-red-400 text-xs mt-1">Connection failed. Check IP/port and network.</p>}
                        </div>
                    </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleSave}>{printer ? 'Save Changes' : 'Add Printer'}</Button>
                </div>
            </div>
        </Modal>
    )
}

const PaymentMethodFormModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (methodData: Omit<PaymentMethod, 'id'> | PaymentMethod) => void;
  method?: PaymentMethod | null;
}> = ({ isOpen, onClose, onSave, method }) => {
    const [formData, setFormData] = useState({
        name: method?.name || '',
        details: method?.details || '',
        showOnReceipt: method?.showOnReceipt ?? true,
    });

    React.useEffect(() => {
        if(isOpen) {
            setFormData({
                name: method?.name || '',
                details: method?.details || '',
                showOnReceipt: method?.showOnReceipt ?? true,
            });
        }
    }, [isOpen, method]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSave = () => {
        if (method) {
            onSave({ ...method, ...formData });
        } else {
            onSave(formData as Omit<PaymentMethod, 'id'>);
        }
        onClose();
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={method ? 'Edit Payment Method' : 'Add Payment Method'}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Method Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" placeholder="e.g., M-Pesa Till" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Details</label>
                    <textarea name="details" value={formData.details} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200" rows={3} placeholder="e.g., Till Number: 123456" required></textarea>
                </div>
                <div className="flex items-center">
                    <input id="showOnReceipt" name="showOnReceipt" type="checkbox" checked={formData.showOnReceipt} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-primary-orange-600 focus:ring-primary-orange-500" />
                    <label htmlFor="showOnReceipt" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Show on receipt</label>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="button" onClick={handleSave}>{method ? 'Save Changes' : 'Add Method'}</Button>
                </div>
            </div>
        </Modal>
    );
};

const ResetConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  const [inputText, setInputText] = useState('');
  const CONFIRMATION_TEXT = 'RESET';

  useEffect(() => {
    if (isOpen) {
      setInputText('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (inputText === CONFIRMATION_TEXT) {
      onConfirm();
      onClose();
    }
  };
  
  const isConfirmDisabled = inputText !== CONFIRMATION_TEXT;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Are you absolutely sure?">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50">
            <FaExclamationTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <div className="mt-3 text-center sm:mt-5">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100">
                This action cannot be undone.
            </h3>
            <div className="mt-2 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <p>This will permanently delete all sales, reports, inventory counts, purchase orders, shifts, keg data, and activity logs.</p>
                <p className="font-bold text-base">User accounts, store settings, and product definitions will NOT be deleted.</p>
                <p className="mt-4">To proceed, please type "<strong className="text-red-600 dark:text-red-400">{CONFIRMATION_TEXT}</strong>" in the box below.</p>
            </div>
            <div className="mt-4">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="block w-full text-center text-lg p-2 rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200 focus:ring-primary-orange-500 focus:border-primary-orange-500"
                  autoFocus
                />
            </div>
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handleConfirm} disabled={isConfirmDisabled}>
          I understand, reset all data
        </Button>
      </div>
    </Modal>
  );
};

const getRoleColor = (role: User['role']) => {
    switch (role) {
        case 'Admin': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200';
        case 'Manager': return 'bg-primary-orange-100 text-primary-orange-800 dark:bg-primary-orange-900/50 dark:text-primary-orange-200';
        case 'Cashier': return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
        case 'Server/bartender': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
    }
};

const getRoleIconColor = (role: User['role']) => {
    switch (role) {
        case 'Admin': return 'text-red-600 dark:text-red-400';
        case 'Manager': return 'text-primary-orange-600 dark:text-primary-orange-400';
        case 'Cashier': return 'text-green-600 dark:text-green-400';
        case 'Server/bartender': return 'text-blue-600 dark:text-blue-400';
    }
}


const Settings: React.FC = () => {
    const data = useData();
    const { 
        storeSettings, updateStoreSettings, 
        printerSettings, updatePrinterSettings,
        products,
        discounts, addDiscount, updateDiscount, deleteDiscount,
        scheduledShifts, addScheduledShift, updateScheduledShift, deleteScheduledShift,
        setSystemLocked,
        currentUser,
        updateUser,
        resetSystemData,
        users,
        addUser, 
        deleteUser, 
        addUserDeduction, 
        removeUserDeduction
    } = data;
    const { printerStatuses, connectToPrinter, disconnectFromPrinter, sendPrintData } = usePrinters();
    
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'general';
    
    const [localStoreSettings, setLocalStoreSettings] = useState(storeSettings);
    const [localPrinterSettings, setLocalPrinterSettings] = useState(printerSettings);
    const [toastInfo, setToastInfo] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    // Modals state
    const [isPrinterModalOpen, setPrinterModalOpen] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
    const [isConfirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{type: 'printer' | 'payment' | 'discount' | 'shift' | 'user', id: string, name: string} | null>(null);
    const [isPaymentMethodModalOpen, setPaymentMethodModalOpen] = useState(false);
    const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
    const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
    const [isShiftModalOpen, setShiftModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<ScheduledShift | null>(null);
    const [shiftDate, setShiftDate] = useState(new Date());
    const [isResetModalOpen, setResetModalOpen] = useState(false);

    // Security tab state
    const [newSystemPin, setNewSystemPin] = useState('');
    const [confirmSystemPin, setConfirmSystemPin] = useState('');
    const [newOverridePin, setNewOverridePin] = useState('');
    const [confirmOverridePin, setConfirmOverridePin] = useState('');

    // User Management Tab State
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [isUserDetailsModalOpen, setUserDetailsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    
    useEffect(() => {
        setLocalStoreSettings(storeSettings);
        setLocalPrinterSettings(printerSettings);
    }, [storeSettings, printerSettings]);

    const handleTabChange = (tabName: string) => {
        setSearchParams({ tab: tabName });
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToastInfo({ show: true, message, type });
    };

    const dummySale = useMemo<Sale>(() => {
        const items = [
            { id: 'p1', name: 'Espresso', category: 'Coffee', price: 3.00, productType: 'Stocked' as const, stock: 100, lowStockThreshold: 20, quantity: 1 },
            { id: 'p5', name: 'Croissant', category: 'Pastries', price: 2.50, productType: 'Stocked' as const, stock: 40, lowStockThreshold: 10, quantity: 2 },
        ];
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = subtotal * 0.16;
        return {
            id: 'PREVIEW-001',
            items: items,
            subtotal,
            tax,
            total: subtotal + tax,
            date: new Date(),
            paymentMethod: 'cash',
            servedBy: 'Jane Doe',
            servedById: 'user-preview-id',
            customerType: 'Walk-in'
        };
    }, []);

    const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        const checkedValue = (e.target as HTMLInputElement).checked;
        setLocalStoreSettings(prev => ({ ...prev, [name]: isCheckbox ? checkedValue : value }));
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoUrl') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target && typeof event.target.result === 'string') {
                    setLocalStoreSettings(prev => ({ ...prev, [field]: event.target.result as string }));
                }
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateStoreSettings(localStoreSettings);
        updatePrinterSettings(localPrinterSettings);
        showToast("Settings saved successfully!");
    };
    
    const inputClasses = "mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200";
    const labelClasses = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            switch (itemToDelete.type) {
                case 'printer':
                    setLocalPrinterSettings(prev => {
                        const newPrinters = prev.printers.filter(p => p.id !== itemToDelete.id);
                        const newSelectedId = prev.selectedPrinterId === itemToDelete.id ? (newPrinters.length > 0 ? newPrinters[0].id : null) : prev.selectedPrinterId;
                        return { printers: newPrinters, selectedPrinterId: newSelectedId };
                    });
                    break;
                case 'payment':
                    setLocalStoreSettings(prev => ({
                        ...prev,
                        paymentMethods: prev.paymentMethods.filter(p => p.id !== itemToDelete.id)
                    }));
                    break;
                case 'discount': await deleteDiscount(itemToDelete.id); break;
                case 'shift': await deleteScheduledShift(itemToDelete.id); break;
                case 'user': await deleteUser(itemToDelete.id); break;
            }
            showToast(`${itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1)} "${itemToDelete.name}" deleted successfully.`);
        } catch (error: any) {
            console.error(`Failed to delete ${itemToDelete.type}:`, error);
            showToast(`Error deleting ${itemToDelete.type}: ${error.message}`, 'error');
        } finally {
            setConfirmDeleteOpen(false);
            setItemToDelete(null);
        }
    };

    const handleUpdateSystemPin = () => {
        if (newSystemPin.length < 4) {
            alert('PIN must be at least 4 digits long.');
            return;
        }
        if (newSystemPin !== confirmSystemPin) {
            alert('PINs do not match.');
            return;
        }
        updateStoreSettings({ ...storeSettings, systemLockPin: newSystemPin });
        showToast('System Lock PIN updated successfully!');
        setNewSystemPin('');
        setConfirmSystemPin('');
    };

    const handleUpdateOverridePin = () => {
        if (!currentUser) return;
        if (newOverridePin.length !== 4 || !/^\d{4}$/.test(newOverridePin)) {
            alert('Override PIN must be exactly 4 digits.');
            return;
        }
        if (newOverridePin !== confirmOverridePin) {
            alert('PINs do not match.');
            return;
        }
        updateUser({ ...currentUser, overridePin: newOverridePin });
        showToast('Your Override PIN has been updated successfully!');
        setNewOverridePin('');
        setConfirmOverridePin('');
    };

    const handleResetConfirm = async () => {
        await resetSystemData();
        showToast("System data has been successfully reset.");
    };

    // --- USER MANAGEMENT LOGIC (MOVED FROM USERS.TSX) ---
    const filteredUsers = useMemo(() => {
        return users.filter(u => 
            u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
            u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
        );
    }, [users, userSearchQuery]);

    const handleAddNewUser = () => {
      setSelectedUser(null);
      setUserDetailsModalOpen(true);
    };

    const handleViewUserDetails = (user: User) => {
      setSelectedUser(user);
      setUserDetailsModalOpen(true);
    };

    const handleSaveUser = async (userData: Partial<User> & { id?: string }) => {
        try {
            if (userData.id && users.some(u => u.id === userData.id)) {
                await updateUser(userData as Partial<User> & { id: string });
            } else {
                await addUser({
                    name: userData.name!,
                    email: userData.email!,
                    role: userData.role!,
                    password: userData.password,
                    salaryAmount: userData.salaryAmount
                });
            }
            showToast("User saved successfully!");
        } catch (error: any) {
            const message = error.message || String(error);
            console.error("Failed to save user:", error);
            showToast(`Error saving user: ${message}`, 'error');
        }
    };
    
    const handleDeleteUser = (user: User) => {
        setItemToDelete({ type: 'user', id: user.id, name: user.name });
        setConfirmDeleteOpen(true);
    };

    // --- RENDER FUNCTIONS FOR TABS ---

    const renderGeneralSettings = () => (
         <div className="space-y-6">
            <Card>
                <h3 className="text-xl font-bold mb-4 border-b pb-2 dark:border-dark-mode-blue-700">Store Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelClasses}>Store Name</label><input type="text" name="storeName" value={localStoreSettings.storeName} onChange={handleGeneralChange} className={inputClasses} /></div>
                    <div><label className={labelClasses}>Phone Number</label><input type="text" name="phone" value={localStoreSettings.phone} onChange={handleGeneralChange} className={inputClasses} /></div>
                    <div><label className={labelClasses}>Address</label><input type="text" name="address" value={localStoreSettings.address} onChange={handleGeneralChange} className={inputClasses} /></div>
                    <div><label className={labelClasses}>Email</label><input type="email" name="email" value={localStoreSettings.email} onChange={handleGeneralChange} className={inputClasses} /></div>
                    <div className="md:col-span-2">
                        <label className={labelClasses}>Store Logo</label>
                        <div className="mt-2 flex items-center space-x-6">
                            <img className="h-16 w-16 object-contain rounded-md bg-gray-200 dark:bg-dark-mode-blue-800 p-1" src={localStoreSettings.logoUrl} alt="Current store logo" />
                            <div className="flex-grow">
                                <label className={`${labelClasses} mb-1`}>Logo URL</label>
                                <input type="url" name="logoUrl" value={localStoreSettings.logoUrl} onChange={handleGeneralChange} className={`${inputClasses} mb-2`} placeholder="Enter image URL" />
                                <label htmlFor="logo-upload" className="cursor-pointer inline-block"><div className="px-3 py-2 text-sm font-semibold rounded-md bg-primary-cyan-700 text-white hover:bg-primary-cyan-600">Or upload a file</div><input id="logo-upload" type="file" className="sr-only" accept="image/*,.svg" onChange={(e) => handleLogoUpload(e, 'logoUrl')} /></label>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
            <Card>
                <h3 className="text-xl font-bold mb-4 border-b pb-2 dark:border-dark-mode-blue-700">Receipt Configuration</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h4 className="font-semibold">Receipt Settings</h4>
                        <div><label className={labelClasses}>Header Text</label><textarea name="receiptHeader" value={localStoreSettings.receiptHeader} onChange={handleGeneralChange} rows={2} className={inputClasses}></textarea></div>
                        <div><label className={labelClasses}>Footer Text</label><textarea name="receiptFooter" value={localStoreSettings.receiptFooter} onChange={handleGeneralChange} rows={2} className={inputClasses}></textarea></div>
                        <div className="flex items-center"><input id="showLogoOnReceipt" name="showLogoOnReceipt" type="checkbox" checked={localStoreSettings.showLogoOnReceipt} onChange={handleGeneralChange} className="h-4 w-4 rounded border-gray-300 text-primary-orange-600 focus:ring-primary-orange-500" /><label htmlFor="showLogoOnReceipt" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Show logo on receipt</label></div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <h4 className="text-lg font-semibold mb-2">Receipt Preview</h4>
                            <div className="p-4 bg-gray-200 dark:bg-dark-mode-blue-950 rounded-lg"><div className="transform scale-90 origin-top shadow-lg"><Receipt sale={dummySale} settings={localStoreSettings} isPreview={true} /></div></div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );

    const renderPrinterSettings = () => {
        const isSecureContext = window.location.protocol === 'https:';

        const getStatusComponent = (printer: Printer) => {
            if (printer.type === 'IP' && isSecureContext) {
                return <div className="flex items-center text-xs text-yellow-600 dark:text-yellow-400" title="Direct IP printing is blocked by browser security on HTTPS sites."><FaExclamationTriangle className="mr-2" /> Unsupported on HTTPS</div>;
            }
            if (printer.type !== 'IP') return <span className="text-xs text-gray-500 dark:text-gray-400">Managed by OS</span>;
            
            const statusInfo = printerStatuses.get(printer.id);
            if (!statusInfo || statusInfo.status === 'unmanaged' || statusInfo.status === 'disconnected') {
                return <div className="flex items-center text-xs text-gray-500 dark:text-gray-400"><FaPlug className="mr-2" /> Disconnected</div>;
            }
    
        switch (statusInfo.status) {
            case 'connecting': return <div className="flex items-center text-xs text-yellow-500"><FaSignal className="animate-pulse mr-2" /> Connecting...</div>;
            case 'connected': return <div className="flex items-center text-xs text-green-500"><FaCheckCircle className="mr-2" /> Connected</div>;
            case 'error': return <div className="flex items-center text-xs text-red-500" title={statusInfo.message}><FaTimesCircle className="mr-2" /> Error</div>;
            default: return null;
        }
        };

        return (
            <div className="space-y-6">
                <Card>
                    <div className="flex items-center justify-between gap-4 mb-4"><h3 className="text-xl font-bold">Configured Printers</h3><Button type="button" onClick={() => setPrinterModalOpen(true)} icon={<FaPlus/>}>Add Printer</Button></div>
                    <div className="space-y-3">
                        {localPrinterSettings.printers.map(p => (
                            <div key={p.id} className="grid grid-cols-12 gap-4 items-center p-3 bg-gray-100 dark:bg-dark-mode-blue-800 rounded-lg">
                                <div className="col-span-1"><input type="radio" name="selectedPrinter" id={`printer-${p.id}`} checked={localPrinterSettings.selectedPrinterId === p.id} onChange={() => setLocalPrinterSettings(prev => ({ ...prev, selectedPrinterId: p.id }))} className="h-5 w-5 text-primary-orange-600 focus:ring-primary-orange-500 border-gray-300" /></div>
                                <div className="col-span-4"><label htmlFor={`printer-${p.id}`} className="cursor-pointer"><p className="font-semibold">{p.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{p.type} {p.type === 'IP' && `(${p.address})`}</p></label></div>
                                <div className="col-span-3">{getStatusComponent(p)}</div>
                                <div className="col-span-4 flex justify-end space-x-2">
                                    {p.type === 'IP' && printerStatuses.get(p.id)?.status === 'connected' && (<Button type="button" variant="secondary" className="!p-2" onClick={() => sendPrintData(p.id, formatTestPrint(p.name))} title="Test Print"><FaPrint /></Button>)}
                                    {p.type === 'IP' && printerStatuses.get(p.id)?.status === 'connected' && (<Button type="button" variant="secondary" className="!p-2 !text-xs" onClick={() => disconnectFromPrinter(p.id)}>Disconnect</Button>)}
                                    {p.type === 'IP' && (!printerStatuses.get(p.id) || !['connected', 'connecting'].includes(printerStatuses.get(p.id)!.status)) && (
                                        <Button type="button" variant="secondary" className="!p-2 !text-xs" onClick={() => connectToPrinter(p)} disabled={isSecureContext} title={isSecureContext ? "Unsupported on HTTPS" : "Connect to Printer"}>Connect</Button>
                                    )}
                                    <Button type="button" variant="secondary" className="!p-2" onClick={() => { setEditingPrinter(p); setPrinterModalOpen(true); }}><FaEdit/></Button>
                                    <Button type="button" variant="danger" className="!p-2" onClick={() => { setItemToDelete({ type: 'printer', id: p.id, name: p.name }); setConfirmDeleteOpen(true); }}><FaTrash/></Button>
                                </div>
                            </div>
                        ))}
                         {localPrinterSettings.printers.length === 0 && <p className="text-center py-4 text-gray-500 dark:text-gray-400">No printers configured. Click "Add Printer" to start.</p>}
                    </div>
                </Card>
            </div>
        );
    };
    
    const renderPaymentSettings = () => (
        <Card>
            <div className="flex items-center justify-between gap-4 mb-4"><h3 className="text-xl font-bold">Payment Methods</h3><Button type="button" onClick={() => setPaymentMethodModalOpen(true)} icon={<FaPlus />}>Add Method</Button></div>
            <div className="space-y-3">
                {(localStoreSettings.paymentMethods || []).map(method => (
                    <div key={method.id} className="p-3 bg-gray-100 dark:bg-dark-mode-blue-800 rounded-lg">
                        <div className="flex justify-between items-start">
                            <div><p className="font-semibold">{method.name}</p><p className="text-sm text-gray-500 dark:text-gray-400 whitespace-pre-wrap">{method.details}</p></div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                                <label htmlFor={`toggle-${method.id}`} className="flex items-center cursor-pointer"><span className="mr-2 text-sm text-gray-600 dark:text-gray-300">Show on Receipt</span><div className="relative"><input type="checkbox" id={`toggle-${method.id}`} className="sr-only" checked={method.showOnReceipt} onChange={() => setLocalStoreSettings(prev => ({...prev, paymentMethods: prev.paymentMethods.map(p => p.id === method.id ? { ...p, showOnReceipt: !p.showOnReceipt } : p)}))} /><div className="block bg-gray-300 dark:bg-dark-mode-blue-700 w-10 h-6 rounded-full"></div><div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${method.showOnReceipt ? 'translate-x-full bg-primary-orange-500' : ''}`}></div></div></label>
                                <Button type="button" variant="secondary" className="!p-2" onClick={() => { setEditingPaymentMethod(method); setPaymentMethodModalOpen(true); }}><FaEdit /></Button>
                                <Button type="button" variant="danger" className="!p-2" onClick={() => { setItemToDelete({type: 'payment', id: method.id, name: method.name}); setConfirmDeleteOpen(true); }}><FaTrash /></Button>
                            </div>
                        </div>
                    </div>
                ))}
                {(localStoreSettings.paymentMethods || []).length === 0 && <p className="text-center py-4 text-gray-500 dark:text-gray-400">No payment methods configured.</p>}
            </div>
        </Card>
    );

    const renderDiscountsSettings = () => (
        <Card>
            <div className="flex items-center justify-between gap-4 mb-4"><h3 className="text-xl font-bold">Discounts</h3><Button type="button" onClick={() => setDiscountModalOpen(true)} icon={<FaPlus />}>Add Discount</Button></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Set discounts as "Active" to apply them automatically to new orders. Product-specific discounts will only apply to those items, while global discounts apply to any remaining items.</p>
            <div className="space-y-3">
                {discounts.map(d => (
                    <div key={d.id} className="grid grid-cols-12 gap-4 items-center p-3 bg-gray-100 dark:bg-dark-mode-blue-800 rounded-lg">
                        <div className="col-span-5">
                            <p className="font-semibold">{d.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {d.type === 'percentage' ? `${d.value}% Off` : `Ksh ${d.value.toFixed(2)} Off`}
                                {(d.productIds && d.productIds.length > 0) ? ` on ${d.productIds.length} product(s)` : ' on entire order'}
                            </p>
                        </div>
                        <div className="col-span-4">
                            <Button 
                                type="button" 
                                onClick={() => updateDiscount({ ...d, isActive: !d.isActive })}
                                variant={d.isActive ? 'primary' : 'secondary'} 
                                className="!text-xs !py-1" 
                                icon={d.isActive ? <FaToggleOn /> : <FaToggleOff />}
                            >
                                {d.isActive ? 'Active' : 'Inactive'}
                            </Button>
                        </div>
                        <div className="col-span-3 flex justify-end space-x-2">
                            <Button type="button" variant="secondary" className="!p-2" onClick={() => { setEditingDiscount(d); setDiscountModalOpen(true); }}><FaEdit /></Button>
                            <Button type="button" variant="danger" className="!p-2" onClick={() => { setItemToDelete({type: 'discount', id: d.id, name: d.name}); setConfirmDeleteOpen(true); }}><FaTrash /></Button>
                        </div>
                    </div>
                ))}
                {discounts.length === 0 && <p className="text-center py-4 text-gray-500 dark:text-gray-400">No discounts created yet.</p>}
            </div>
        </Card>
    );
    
    const renderShiftsSettings = () => {
        const shiftsForDate = scheduledShifts.filter(s => s.date === shiftDate.toISOString().split('T')[0]);
        return(
            <Card>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <h3 className="text-xl font-bold">Shift Scheduler</h3>
                    <div className="flex items-center gap-2">
                        <input type="date" value={shiftDate.toISOString().split('T')[0]} onChange={e => setShiftDate(new Date(e.target.value.replace(/-/g, '/')))} className={inputClasses}/>
                        <Button type="button" onClick={() => { setEditingShift(null); setShiftModalOpen(true); }} icon={<FaPlus />}>Add Shift for Date</Button>
                    </div>
                </div>
                <div className="space-y-3">
                    {shiftsForDate.map(shift => (
                        <div key={shift.id} className="grid grid-cols-12 gap-4 items-center p-3 bg-gray-100 dark:bg-dark-mode-blue-800 rounded-lg">
                            <div className="col-span-5 font-semibold">{shift.userName}</div>
                            <div className="col-span-4 text-gray-600 dark:text-gray-400">{shift.startTime} - {shift.endTime}</div>
                            <div className="col-span-3 flex justify-end space-x-2">
                                <Button type="button" variant="secondary" className="!p-2" onClick={() => { setEditingShift(shift); setShiftModalOpen(true); }}><FaEdit /></Button>
                                <Button type="button" variant="danger" className="!p-2" onClick={() => { setItemToDelete({type: 'shift', id: shift.id, name: `shift for ${shift.userName}`}); setConfirmDeleteOpen(true); }}><FaTrash /></Button>
                            </div>
                        </div>
                    ))}
                    {shiftsForDate.length === 0 && <p className="text-center py-4 text-gray-500 dark:text-gray-400">No shifts scheduled for this date.</p>}
                </div>
            </Card>
        );
    };

    const renderUsersSettings = () => (
        <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold">User Management</h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                    <SearchInput
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        placeholder="Search by name or email..."
                        className="w-full sm:w-64"
                    />
                    <Button onClick={handleAddNewUser} icon={<FaPlus />} className="w-full sm:w-auto">Add User</Button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left dark:text-gray-200">
                    <thead className="border-b dark:border-dark-mode-blue-700 dark:text-gray-400">
                        <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="border-b dark:border-dark-mode-blue-800 hover:bg-gray-50 dark:hover:bg-dark-mode-blue-800/50">
                                <td className="p-3 font-medium flex items-center space-x-3">
                                    <img src={`https://i.pravatar.cc/40?u=${user.id}`} alt={user.name} className="w-8 h-8 rounded-full" />
                                    <span>{user.name}</span>
                                </td>
                                <td className="p-3">{user.email}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold inline-flex items-center ${getRoleColor(user.role)}`}>
                                        <FaUserShield className={`mr-2 ${getRoleIconColor(user.role)}`} />
                                        <span>{user.role}</span>
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="flex space-x-2">
                                        <Button variant="secondary" className="!p-2" onClick={() => handleViewUserDetails(user)}><FaEye/></Button>
                                        <Button variant="danger" className="!p-2" onClick={() => handleDeleteUser(user)} disabled={user.id === currentUser?.id}><FaTrash/></Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {filteredUsers.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-500 dark:text-gray-400">No users found.</p>
                    </div>
                )}
            </div>
        </Card>
    );

    const renderSecuritySettings = () => (
        <div className="space-y-6">
            <Card>
                <h3 className="text-xl font-bold mb-4">System Security</h3>
                <div className="p-4 bg-gray-100 dark:bg-dark-mode-blue-800/50 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h4 className="font-semibold">System Lock</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Immediately lock the system. The System PIN will be required to unlock.</p>
                    </div>
                    <Button type="button" variant="danger" onClick={() => setSystemLocked(true)} icon={<FaLock />}>Lock System Now</Button>
                </div>
            </Card>

            {currentUser?.role === 'Admin' && (
            <Card>
                 <h3 className="text-xl font-bold mb-4">Admin Controls</h3>
                 <div className="p-4 bg-gray-100 dark:bg-dark-mode-blue-800/50 rounded-lg mb-4">
                    <h4 className="font-semibold">Update System Lock PIN</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Set the global PIN used to unlock the system. This action is immediate and does not require clicking "Save All Settings".</p>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-grow w-full md:w-auto">
                            <label className={labelClasses}>New PIN (min 4 digits)</label>
                            <input type="password" value={newSystemPin} onChange={(e) => setNewSystemPin(e.target.value)} className={inputClasses}/>
                        </div>
                        <div className="flex-grow w-full md:w-auto">
                            <label className={labelClasses}>Confirm New PIN</label>
                            <input type="password" value={confirmSystemPin} onChange={(e) => setConfirmSystemPin(e.target.value)} className={inputClasses}/>
                        </div>
                        <Button type="button" onClick={handleUpdateSystemPin} variant="primary" className="w-full md:w-auto">Update PIN</Button>
                    </div>
                 </div>
                 <div className="p-4 bg-gray-100 dark:bg-dark-mode-blue-800/50 rounded-lg">
                     <div className="flex justify-between items-center">
                        <div>
                            <h4 className="font-semibold">Auto-Lock on Print</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Automatically lock the system after a receipt is printed. Click "Save All Settings" to apply.</p>
                        </div>
                         <label htmlFor="autoLockToggle" className="flex items-center cursor-pointer">
                            <div className="relative">
                                <input 
                                    id="autoLockToggle" 
                                    name="autoLockOnPrint"
                                    type="checkbox" 
                                    className="sr-only" 
                                    checked={localStoreSettings.autoLockOnPrint} 
                                    onChange={handleGeneralChange}
                                />
                                <div className="block bg-gray-300 dark:bg-dark-mode-blue-700 w-14 h-8 rounded-full"></div>
                                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${localStoreSettings.autoLockOnPrint ? 'translate-x-full bg-primary-orange-500' : ''}`}></div>
                            </div>
                        </label>
                    </div>
                </div>
            </Card>
            )}

            {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                <Card>
                    <h3 className="text-xl font-bold mb-4">My Override PIN</h3>
                    <div className="p-4 bg-gray-100 dark:bg-dark-mode-blue-800/50 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Set your personal 4-digit PIN for authorizing actions like voiding orders. This is separate from your login PIN. This action is immediate.</p>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-grow w-full md:w-auto">
                                <label className={labelClasses}>New Override PIN (4 digits)</label>
                                <input type="password" value={newOverridePin} onChange={(e) => setNewOverridePin(e.target.value)} maxLength={4} className={inputClasses} />
                            </div>
                            <div className="flex-grow w-full md:w-auto">
                                <label className={labelClasses}>Confirm New PIN</label>
                                <input type="password" value={confirmOverridePin} onChange={(e) => setConfirmOverridePin(e.target.value)} maxLength={4} className={inputClasses} />
                            </div>
                            <Button type="button" onClick={handleUpdateOverridePin} variant="primary" className="w-full md:w-auto">Update Override PIN</Button>
                        </div>
                    </div>
                </Card>
            )}

            {currentUser?.role === 'Admin' && (
                <Card>
                    <h3 className="text-xl font-bold mb-2 text-red-600 dark:text-red-400">Danger Zone</h3>
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-red-200 dark:border-red-700">
                        <div>
                            <h4 className="font-semibold">Reset All System Data</h4>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                This permanently deletes all transactional data (sales, inventory counts, shifts, logs). User accounts and product definitions will NOT be deleted.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="danger"
                            onClick={() => setResetModalOpen(true)}
                            icon={<FaExclamationTriangle />}
                        >
                            Reset Data
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="!p-0">
                <div className="flex border-b dark:border-dark-mode-blue-700 flex-wrap">
                    <button type="button" onClick={() => handleTabChange('general')} className={`px-4 py-3 font-semibold flex items-center gap-2 ${activeTab === 'general' ? 'text-primary-orange-600 border-b-2 border-primary-orange-600' : 'text-gray-500 dark:text-gray-400'}`}><FaInfoCircle /> General</button>
                    <button type="button" onClick={() => handleTabChange('printers')} className={`px-4 py-3 font-semibold flex items-center gap-2 ${activeTab === 'printers' ? 'text-primary-orange-600 border-b-2 border-primary-orange-600' : 'text-gray-500 dark:text-gray-400'}`}><FaPrint /> Printers</button>
                    <button type="button" onClick={() => handleTabChange('payment')} className={`px-4 py-3 font-semibold flex items-center gap-2 ${activeTab === 'payment' ? 'text-primary-orange-600 border-b-2 border-primary-orange-600' : 'text-gray-500 dark:text-gray-400'}`}><FaCreditCard /> Payments</button>
                    <button type="button" onClick={() => handleTabChange('discounts')} className={`px-4 py-3 font-semibold flex items-center gap-2 ${activeTab === 'discounts' ? 'text-primary-orange-600 border-b-2 border-primary-orange-600' : 'text-gray-500 dark:text-gray-400'}`}><FaTags /> Discounts</button>
                    <button type="button" onClick={() => handleTabChange('shifts')} className={`px-4 py-3 font-semibold flex items-center gap-2 ${activeTab === 'shifts' ? 'text-primary-orange-600 border-b-2 border-primary-orange-600' : 'text-gray-500 dark:text-gray-400'}`}><FaCalendarAlt /> Shifts</button>
                    {currentUser?.role === 'Admin' && (
                        <button type="button" onClick={() => handleTabChange('users')} className={`px-4 py-3 font-semibold flex items-center gap-2 ${activeTab === 'users' ? 'text-primary-orange-600 border-b-2 border-primary-orange-600' : 'text-gray-500 dark:text-gray-400'}`}><FaUsers /> Users</button>
                    )}
                    <button type="button" onClick={() => handleTabChange('security')} className={`px-4 py-3 font-semibold flex items-center gap-2 ${activeTab === 'security' ? 'text-primary-orange-600 border-b-2 border-primary-orange-600' : 'text-gray-500 dark:text-gray-400'}`}><FaShieldAlt /> Security</button>
                </div>
                <div className="p-6">
                    {activeTab === 'general' && renderGeneralSettings()}
                    {activeTab === 'printers' && renderPrinterSettings()}
                    {activeTab === 'payment' && renderPaymentSettings()}
                    {activeTab === 'discounts' && renderDiscountsSettings()}
                    {activeTab === 'shifts' && renderShiftsSettings()}
                    {activeTab === 'users' && currentUser?.role === 'Admin' && renderUsersSettings()}
                    {activeTab === 'security' && renderSecuritySettings()}
                </div>
            </Card>
            
            <div className="flex justify-end items-center gap-4"><Button type="submit" icon={<FaSave />}>Save All Settings</Button></div>
            
            <Toast message={toastInfo.message} show={toastInfo.show} onClose={() => setToastInfo({show: false, message: '', type: 'success'})} type={toastInfo.type} />

            <PrinterFormModal isOpen={isPrinterModalOpen} onClose={() => setPrinterModalOpen(false)} onSave={(p) => setLocalPrinterSettings(prev => ({...prev, printers: 'id' in p ? prev.printers.map(x => x.id === p.id ? p : x) : [...prev.printers, {...p, id: `prn${Date.now()}`}]}))} printer={editingPrinter} />
            <PaymentMethodFormModal isOpen={isPaymentMethodModalOpen} onClose={() => setPaymentMethodModalOpen(false)} onSave={(m) => setLocalStoreSettings(prev => ({...prev, paymentMethods: 'id' in m ? prev.paymentMethods.map(x=>x.id===m.id?m:x) : [...prev.paymentMethods, {...m, id:`pm-${Date.now()}`}]}))} method={editingPaymentMethod} />
            <DiscountFormModal isOpen={isDiscountModalOpen} onClose={() => setDiscountModalOpen(false)} onSave={(d) => 'id' in d ? updateDiscount(d) : addDiscount(d)} discount={editingDiscount} products={products} />
            <ShiftFormModal isOpen={isShiftModalOpen} onClose={() => setShiftModalOpen(false)} onSave={(s) => 'id' in s ? updateScheduledShift(s) : addScheduledShift(s)} shift={editingShift} users={users} date={shiftDate} />
            <ConfirmationModal isOpen={isConfirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} onConfirm={confirmDelete} title={`Delete ${itemToDelete?.type}`} message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`} />
            <ResetConfirmationModal isOpen={isResetModalOpen} onClose={() => setResetModalOpen(false)} onConfirm={handleResetConfirm} />

            {isUserDetailsModalOpen && (
                <UserDetailsModal
                    isOpen={isUserDetailsModalOpen}
                    onClose={() => setUserDetailsModalOpen(false)}
                    user={selectedUser}
                    onSave={handleSaveUser}
                    onAddDeduction={addUserDeduction}
                    onRemoveDeduction={removeUserDeduction}
                />
            )}
        </form>
    );
};

export default Settings;
