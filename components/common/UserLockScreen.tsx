import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import Card from './Card';
import Button from './Button';
import { FaBackspace } from 'react-icons/fa';

interface UserLockScreenProps {
    user: User;
    onUnlock: (pin: string) => boolean;
    onLogout: () => void;
}

const PinKey: React.FC<{ value: string; onClick: (v: string) => void; isSpecial?: boolean }> = ({ value, onClick, isSpecial }) => (
    <button onClick={() => onClick(value)} className={`h-14 w-14 rounded-full text-xl font-semibold transition-colors duration-150 flex items-center justify-center ${isSpecial ? 'bg-gray-200 dark:bg-dark-mode-blue-800' : 'bg-white/10 hover:bg-white/20'}`}>
        {value === 'backspace' ? <FaBackspace/> : value}
    </button>
);

const UserLockScreen: React.FC<UserLockScreenProps> = ({ user, onUnlock, onLogout }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);

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

    const handleUnlockAttempt = (currentPin: string) => {
        const isCorrectPin = onUnlock(currentPin);
        if (!isCorrectPin) {
            setError('Incorrect PIN. Access Denied.');
            setPin('');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        }
    };
    
    useEffect(() => {
        if (pin.length === 4) {
            setTimeout(() => handleUnlockAttempt(pin), 100);
        }
    }, [pin]);
    
    return (
         <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-dark-mode-blue-950">
            <Card className={`text-center p-8 w-full max-w-sm shadow-2xl dark:shadow-primary-orange-900/20 ${isShaking ? 'animate-shake' : ''}`}>
                <img src={`https://i.pravatar.cc/80?u=${user.id}`} alt={user.name} className="h-20 w-20 rounded-full mx-auto mb-4 border-4 border-primary-cyan-500"/>
                <h2 className="text-2xl font-bold mb-2">Welcome Back, {user.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">Enter your 4-digit PIN to unlock your session.</p>
                
                <div className="flex justify-center items-center gap-2 mb-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`h-4 w-4 rounded-full border-2 border-gray-400 ${pin.length > i ? 'bg-primary-cyan-500 border-primary-cyan-500' : ''}`}></div>
                    ))}
                </div>
                
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                
                <div className="grid grid-cols-3 gap-4 mx-auto max-w-xs mb-6">
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
                
                <Button onClick={onLogout} variant="danger" className="w-full text-sm">Log Out & Switch User</Button>
            </Card>
            <style>{`
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>
        </div>
    );
};

export default UserLockScreen;
