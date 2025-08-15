import React, { useState, useEffect, useMemo } from 'react';
import { User, Role, Deduction } from '../../types';
import Modal from './Modal';
import Button from './Button';
import { FaSave, FaUser, FaDollarSign, FaTrash, FaShieldAlt } from 'react-icons/fa';
import { useData } from '../../context/DataContext';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null; // null for "add new user" mode
  onSave: (user: Partial<User> & { id?: string }) => void;
  onAddDeduction: (userId: string, deductionData: { reason: string, amount: number }) => void;
  onRemoveDeduction: (userId: string, deductionId: string) => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
  onAddDeduction,
  onRemoveDeduction
}) => {
  const { currentUser } = useData();
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState<Partial<User>>({});
  const [newDeduction, setNewDeduction] = useState({ reason: '', amount: '' });
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [newOverridePin, setNewOverridePin] = useState('');
  const [confirmOverridePin, setConfirmOverridePin] = useState('');

  const isAdmin = currentUser?.role === 'Admin';
  const isNewUser = !user;

  useEffect(() => {
    if (isOpen) {
      setFormData(user || {
        name: '',
        email: '',
        role: 'Cashier',
        password: '',
        pin: '',
        salaryAmount: 0,
        deductions: [],
      });
      setActiveTab('profile');
      setNewPin('');
      setConfirmPin('');
      setNewOverridePin('');
      setConfirmOverridePin('');
    }
  }, [isOpen, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['salaryAmount'].includes(name);
    setFormData(prev => ({ ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value }));
  };

  const handleSaveClick = () => {
    let finalData = { ...formData };
    
    if (newPin) {
         if(newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
            alert("Login PIN must be exactly 4 digits.");
            return;
        }
        if (newPin !== confirmPin) {
            alert("Login PINs do not match.");
            return;
        }
        finalData.pin = newPin;
    }

    if (newOverridePin) {
        if(newOverridePin.length !== 4 || !/^\d{4}$/.test(newOverridePin)) {
            alert("Override PIN must be exactly 4 digits.");
            return;
        }
        if (newOverridePin !== confirmOverridePin) {
            alert("Override PINs do not match.");
            return;
        }
        finalData.overridePin = newOverridePin;
    }

    onSave(finalData as Partial<User> & { id?: string });
    onClose();
  };

  const handleAddDeduction = () => {
    if (user && newDeduction.reason && newDeduction.amount) {
      onAddDeduction(user.id, {
        reason: newDeduction.reason,
        amount: parseFloat(newDeduction.amount),
      });
      setNewDeduction({ reason: '', amount: '' });
    }
  };

  const totalDeductions = useMemo(() => {
    const currentDeductions = user?.deductions || [];
    return currentDeductions.reduce((sum, d) => sum + d.amount, 0);
  }, [user?.deductions]);

  const netSalary = (formData.salaryAmount || user?.salaryAmount || 0) - totalDeductions;
  
  const inputClasses = "mt-1 block w-full rounded-md border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-sm bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={user ? `Details for ${user.name}` : 'Add New User'}>
      <div className="flex border-b border-gray-200 dark:border-dark-mode-blue-700">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'profile' ? 'text-primary-orange-600 border-b-2 border-primary-orange-600' : 'text-gray-500'}`}
        >
          <FaUser /> Profile
        </button>
        <button
          onClick={() => setActiveTab('salary')}
          className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'salary' ? 'text-primary-orange-600 border-b-2 border-primary-orange-600' : 'text-gray-500'}`}
        >
          <FaDollarSign /> Salary
        </button>
        {isAdmin && (
           <button
              onClick={() => setActiveTab('security')}
              className={`px-4 py-2 font-semibold flex items-center gap-2 ${activeTab === 'security' ? 'text-primary-orange-600 border-b-2 border-primary-orange-600' : 'text-gray-500'}`}
            >
              <FaShieldAlt /> Security
           </button>
        )}
      </div>

      <div className="py-6">
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className={inputClasses} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <input type="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputClasses} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
              <select name="role" value={formData.role || 'Cashier'} onChange={handleChange} className={inputClasses} required disabled={!isAdmin && !!user}>
                <option value="Cashier">Cashier</option>
                <option value="Server/bartender">Server/Bartender</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
              <input type="password" name="password" value={formData.password || ''} onChange={handleChange} className={inputClasses} placeholder={isNewUser ? "Enter initial password" : 'Hidden for security'} disabled={!isNewUser || !isAdmin}/>
               {!isNewUser && <p className="text-xs text-gray-500 mt-1">Passwords can only be set on user creation or via a password reset flow.</p>}
            </div>
          </div>
        )}

        {activeTab === 'salary' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gross Salary Amount (Monthly)</label>
              <input type="number" name="salaryAmount" value={formData.salaryAmount ?? 0} onChange={handleChange} className={inputClasses} disabled={!isAdmin} />
            </div>

            {!isNewUser && user && (
              <>
                <div>
                  <h4 className="font-semibold mb-2">Deductions</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2 rounded-md border dark:border-dark-mode-blue-700 p-2">
                    {(user.deductions || []).map((deduction: Deduction) => (
                      <div key={deduction.id} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-dark-mode-blue-800 rounded">
                        <div>
                          <p>{deduction.reason}</p>
                          <p className="text-xs text-gray-500">{new Date(deduction.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-red-500">-Ksh {deduction.amount.toFixed(2)}</span>
                            {isAdmin && <Button variant="danger" className="!p-1" onClick={() => onRemoveDeduction(user.id, deduction.id)}><FaTrash /></Button>}
                        </div>
                      </div>
                    ))}
                    {(user.deductions || []).length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-4">No deductions recorded.</p>}
                  </div>
                </div>
                {isAdmin && (
                <div className="flex gap-2 items-end p-2 border-t dark:border-dark-mode-blue-700">
                    <div className="flex-grow">
                         <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Reason</label>
                         <input type="text" value={newDeduction.reason} onChange={(e) => setNewDeduction(p => ({...p, reason: e.target.value}))} className={inputClasses} placeholder="e.g., Broken glass"/>
                    </div>
                    <div className="flex-grow">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Amount</label>
                        <input type="number" value={newDeduction.amount} onChange={(e) => setNewDeduction(p => ({...p, amount: e.target.value}))} className={inputClasses} placeholder="0.00"/>
                    </div>
                    <Button onClick={handleAddDeduction} disabled={!newDeduction.reason || !newDeduction.amount}>Add Deduction</Button>
                </div>
                )}
              </>
            )}
             {isNewUser && <p className="text-sm text-gray-500 dark:text-gray-400 p-4 text-center bg-gray-100 dark:bg-dark-mode-blue-800 rounded-md">Deductions can be added after the user has been created.</p>}
            
            <div className="p-3 bg-gray-100 dark:bg-dark-mode-blue-900/50 rounded-lg text-right font-mono">
                <div className="flex justify-between"><span>Gross Salary:</span><span>{ (formData.salaryAmount ?? user?.salaryAmount ?? 0).toFixed(2) }</span></div>
                <div className="flex justify-between text-red-500"><span>Deductions:</span><span>-{ totalDeductions.toFixed(2) }</span></div>
                <div className="flex justify-between font-bold text-lg border-t dark:border-dark-mode-blue-700 mt-1 pt-1"><span>Net Pay:</span><span>Ksh { netSalary.toFixed(2) }</span></div>
            </div>
          </div>
        )}
        
        {activeTab === 'security' && isAdmin && (
            <div className="space-y-6">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-mode-blue-800/50">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Login PIN</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">PIN used by the user to unlock their session after a sale. {user && `Current PIN: ${user.pin ? "****" : "Not Set"}`}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">New 4-Digit Login PIN</label>
                            <input type="password" value={newPin} onChange={(e) => setNewPin(e.target.value)} maxLength={4} className={inputClasses} placeholder={isNewUser ? "Set initial PIN" : "Enter to change"}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Confirm New PIN</label>
                            <input type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} maxLength={4} className={inputClasses} />
                        </div>
                    </div>
                </div>

                {(formData.role === 'Admin' || formData.role === 'Manager') && (
                     <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-mode-blue-800/50">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Override PIN</h4>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">PIN used by this Manager/Admin to authorize actions. {user && `Current Override PIN: ${user.overridePin ? "****" : "Not Set"}`}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium">New 4-Digit Override PIN</label>
                                <input type="password" value={newOverridePin} onChange={(e) => setNewOverridePin(e.target.value)} maxLength={4} className={inputClasses} placeholder={isNewUser ? "Set initial PIN" : "Enter to change"} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Confirm New Override PIN</label>
                                <input type="password" value={confirmOverridePin} onChange={(e) => setConfirmOverridePin(e.target.value)} maxLength={4} className={inputClasses} />
                            </div>
                        </div>
                     </div>
                )}
            </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t dark:border-dark-mode-blue-700">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSaveClick} icon={<FaSave />}>Save Changes</Button>
      </div>
    </Modal>
  );
};

export default UserDetailsModal;
