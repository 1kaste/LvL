import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';
import { FaBackspace } from 'react-icons/fa';

interface PinPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (pin: string) => boolean; // Returns true on success, false on failure
    title: string;
    message: string;
}

const PinKey: React.FC<{ value: string; onClick: (v: string) => void; isSpecial?: boolean }> = ({ value, onClick, isSpecial }) => (
    <button onClick={() => onClick(value)} className={`h-14 w-14 rounded-full text-xl font-semibold transition-colors duration-150 flex items-center justify-center ${isSpecial ? 'bg-gray-200 dark:bg-dark-mode-blue-800' : 'bg-white/10 hover:bg-white/20'}`}>
        {value === 'backspace' ? <FaBackspace/> : value}
    </button>
);

const PinPromptModal: React.FC<PinPromptModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    
    useEffect(() => {
        if(isOpen) {
            setPin('');
            setError('');
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

    const handleConfirmAttempt = (currentPin: string) => {
        const success = onConfirm(currentPin);
        if (!success) {
            setError('Incorrect PIN. Please try again.');
            setPin('');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        }
    };

    useEffect(() => {
        if (pin.length === 4) {
            setTimeout(() => handleConfirmAttempt(pin), 100);
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
                
                <div className="mt-6 flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
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

export default PinPromptModal;
