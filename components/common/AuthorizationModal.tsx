import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { User } from '../../types';
import { FaBackspace, FaCreditCard, FaFingerprint, FaWhatsapp } from 'react-icons/fa';
import { useData } from '../../context/DataContext';

interface AuthorizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthorize: (authorizingUser: User) => void;
    title: string;
    message: string;
}

const PinKey: React.FC<{ value: string; onClick: (v: string) => void; isSpecial?: boolean }> = ({ value, onClick, isSpecial }) => (
    <button onClick={() => onClick(value)} className={`h-14 w-14 rounded-full text-xl font-semibold transition-colors duration-150 flex items-center justify-center ${isSpecial ? 'bg-gray-200 dark:bg-dark-mode-blue-800' : 'bg-white/10 hover:bg-white/20'}`}>
        {value === 'backspace' ? <FaBackspace/> : value}
    </button>
);

const AuthorizationModal: React.FC<AuthorizationModalProps> = ({ isOpen, onClose, onAuthorize, title, message }) => {
    const { verifyOverridePin } = useData();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const [showConfigMessage, setShowConfigMessage] = useState(false);
    
    useEffect(() => {
        if(isOpen) {
            setPin('');
            setError('');
            setShowConfigMessage(false);
        }
    }, [isOpen]);

    const handlePinInput = (digit: string) => {
        setPin(prevPin => {
            if (prevPin.length < 4) {
                setError('');
                return prevPin + digit;
            }
            return prevPin;
        });
    };
    
    const handleBackspace = () => {
        setPin(pin.slice(0, -1));
    };

    const handlePinConfirm = (currentPin: string) => {
        const authorizingUser = verifyOverridePin(currentPin);
        if (authorizingUser) {
            onAuthorize(authorizingUser);
        } else {
            setError('Incorrect PIN. Authorization denied.');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        }
    };

    const handleHardwareAuthClick = () => {
        setShowConfigMessage(true);
    };

    useEffect(() => {
        if (pin.length === 4) {
            setTimeout(() => {
                handlePinConfirm(pin)
                setPin(''); // Clear pin after attempt, regardless of success or failure
            }, 100);
        }
    }, [pin]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className={`text-center ${isShaking ? 'animate-shake' : ''}`}>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
                <div className="flex justify-center items-center gap-2 mb-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`h-4 w-4 rounded-full border-2 border-gray-400 ${pin.length > i ? 'bg-primary-orange-500 border-primary-orange-500' : ''}`}></div>
                    ))}
                </div>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                
                <div className="grid grid-cols-3 gap-4 mx-auto max-w-xs">
                    <PinKey value="1" onClick={handlePinInput} />
                    <PinKey value="2" onClick={handlePinInput} />
                    <PinKey value="3" onClick={handlePinInput} />
                    <PinKey value="4" onClick={handlePinInput} />
                    <PinKey value="5" onClick={handlePinInput} />
                    <PinKey value="6" onClick={handlePinInput} />
                    <PinKey value="7" onClick={handlePinInput} />
                    <PinKey value="8" onClick={handlePinInput} />
                    <PinKey value="9" onClick={handlePinInput} />
                    <PinKey value="backspace" onClick={handleBackspace} isSpecial/>
                    <PinKey value="0" onClick={handlePinInput} />
                </div>
                
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white dark:bg-dark-mode-blue-900 px-2 text-sm text-gray-500 dark:text-gray-400">Or use another method</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button onClick={handleHardwareAuthClick} variant='secondary' icon={<FaCreditCard/>}>Authorize with Card</Button>
                    <Button onClick={handleHardwareAuthClick} variant='secondary' icon={<FaFingerprint/>}>Authorize with Fingerprint</Button>
                </div>

                {showConfigMessage && (
                    <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-lg text-sm transition-opacity duration-300">
                        <p className="font-semibold">Contact System Sales for Configuration:</p>
                        <a 
                            href="https://wa.me/254795071901?text=Hi%20Kastech%20Brands,%20I'm%20interested%20in%20configuring%20hardware%20features%20for%20my%20Jobiflow%20system." 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="font-semibold underline hover:text-blue-600 flex items-center justify-center gap-2 mt-1"
                        >
                            <FaWhatsapp />
                            WhatsApp Kastech Brands
                        </a>
                    </div>
                )}

                <div className="mt-8 flex justify-end">
                    <Button variant="danger" onClick={onClose}>Cancel</Button>
                </div>
            </div>
             <style>{`
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>
        </Modal>
    );
};

export default AuthorizationModal;
