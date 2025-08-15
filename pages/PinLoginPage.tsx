import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FaBackspace, FaUserCircle, FaEnvelope } from 'react-icons/fa';

interface PinLoginPageProps {
    onPinLogin: (userId: string, pin: string) => Promise<boolean>;
    users: User[];
    logoUrl: string;
}

const PinLoginPage: React.FC<PinLoginPageProps> = ({ onPinLogin, users, logoUrl }) => {
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    useEffect(() => {
        // Reset state if the component becomes visible
        setSelectedUser(null);
        setPin('');
        setError('');
    }, []);

    const handleUserSelect = (user: User) => {
        if (!user.pin) {
            setError(`${user.name} does not have a PIN set up. Please log in with email/password to set one.`);
            return;
        }
        setSelectedUser(user);
        setError('');
    };

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

    const handleLoginAttempt = async (currentPin: string) => {
        if (!selectedUser) return;
        const success = await onPinLogin(selectedUser.id, currentPin);
        if (!success) {
            setError('Incorrect PIN. Please try again.');
            setPin('');
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
        }
    };

    useEffect(() => {
        if (pin.length === 4) {
            setTimeout(() => handleLoginAttempt(pin), 100);
        }
    }, [pin]);

    const PinKey: React.FC<{ value: string; onClick: (v: string) => void; isSpecial?: boolean }> = ({ value, onClick, isSpecial }) => (
        <button onClick={() => onClick(value)} className={`h-14 w-14 rounded-full text-xl font-semibold transition-colors duration-150 flex items-center justify-center ${isSpecial ? 'bg-gray-200 dark:bg-dark-mode-blue-800' : 'bg-white/10 hover:bg-white/20'}`}>
            {value === 'backspace' ? <FaBackspace/> : value}
        </button>
    );

    const renderUserSelection = () => (
        <Card className="w-full max-w-4xl text-center">
            <h2 className="text-3xl font-bold mb-2">Welcome Back!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-8">Select your profile to sign in.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {users.map(user => (
                    <Card 
                        key={user.id} 
                        className="p-4 flex flex-col items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-mode-blue-800 transition-colors transform hover:scale-105"
                        onClick={() => handleUserSelect(user)}
                    >
                        <img src={`https://i.pravatar.cc/80?u=${user.id}`} alt={user.name} className="w-20 h-20 rounded-full" />
                        <span className="font-semibold">{user.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{user.role}</span>
                    </Card>
                ))}
            </div>
             {error && <p className="text-red-500 text-sm mt-6 text-center">{error}</p>}
        </Card>
    );
    
    const renderPinEntry = () => (
        <Card className={`text-center p-8 w-full max-w-sm shadow-2xl dark:shadow-primary-orange-900/20 ${isShaking ? 'animate-shake' : ''}`}>
             <button onClick={() => setSelectedUser(null)} className="absolute top-4 left-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">&larr; Back to users</button>
            <img src={`https://i.pravatar.cc/80?u=${selectedUser?.id}`} alt={selectedUser?.name} className="h-20 w-20 rounded-full mx-auto mb-4 border-4 border-primary-orange-500"/>
            <h2 className="text-2xl font-bold mb-2">Welcome, {selectedUser?.name}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Enter your 4-digit PIN to continue.</p>
            
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
            <style>{`
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
                .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>
        </Card>
    );

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-dark-mode-blue-950 p-4">
            <img src={logoUrl} alt="Logo" className="h-16 w-auto mb-8"/>

            {selectedUser ? renderPinEntry() : renderUserSelection()}

            <div className="mt-8 text-center">
                <Link to="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary-orange-500 flex items-center gap-2">
                    <FaEnvelope/> Login with Email & Password
                </Link>
            </div>
        </div>
    );
};

export default PinLoginPage;
