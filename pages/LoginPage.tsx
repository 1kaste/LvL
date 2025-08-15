import React, { useState, useEffect } from 'react';
import { User } from '../types';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FaSignInAlt, FaUtensils } from 'react-icons/fa';

interface LoginPageProps {
  onLogin: (email: string, password?: string) => Promise<boolean>;
  users: User[];
  logoUrl: string;
  devLogoUrl: string;
  storeName: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, users, logoUrl, devLogoUrl, storeName }) => {
    const [selectedEmail, setSelectedEmail] = useState<string>(users[0]?.email || '');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Pre-select the first user's email when the component mounts or users list changes
        if (users.length > 0 && !selectedEmail) {
            setSelectedEmail(users[0].email);
        }
    }, [users, selectedEmail]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmail) {
            setError("Please select a user.");
            return;
        }
        
        setError('');
        setIsLoading(true);
        const success = await onLogin(selectedEmail, password);
        if (!success) {
            setError('Invalid password. Please try again.');
            setPassword('');
        }
        setIsLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-dark-mode-blue-950 p-4 font-sans">
            <header className="text-center mb-8">
                {logoUrl ? (
                    <img src={logoUrl} alt={`${storeName} logo`} className="h-20 w-auto mx-auto mb-4 object-contain"/>
                ) : (
                    <div className="h-20 w-20 mx-auto mb-4 flex items-center justify-center bg-gray-200 dark:bg-dark-mode-blue-800 rounded-lg">
                        <FaUtensils className="text-4xl text-gray-400" />
                    </div>
                )}
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{storeName}</h1>
            </header>
            
            <main className="w-full flex justify-center">
                <Card className="w-full max-w-sm shadow-2xl p-8">
                    <h2 className="text-2xl font-semibold mb-6 text-center text-gray-800 dark:text-gray-100">Sign In</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select User</label>
                            <select
                                id="email-select"
                                value={selectedEmail}
                                onChange={(e) => {
                                    setSelectedEmail(e.target.value);
                                    setError('');
                                    setPassword('');
                                }}
                                className="mt-1 block w-full px-3 py-3 rounded-md border border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-lg bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200"
                            >
                                {users.map(user => (
                                    <option key={user.id} value={user.email}>{user.name} ({user.role})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="password-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                            <input
                                id="password-input"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="mt-1 block w-full px-3 py-3 rounded-md border border-gray-300 dark:border-dark-mode-blue-700 shadow-sm focus:border-primary-orange-500 focus:ring-primary-orange-500 sm:text-lg bg-gray-50 dark:bg-dark-mode-blue-800 dark:text-gray-200"
                            />
                        </div>
                        {error && <p className="text-sm text-red-600 dark:text-red-400 text-center -mt-2">{error}</p>}
                        <Button type="submit" className="w-full text-lg py-3" icon={<FaSignInAlt />} disabled={isLoading || !selectedEmail}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </Button>
                    </form>
                </Card>
            </main>

            <footer className="mt-8 text-center">
                 <div className="flex justify-center items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>Powered by</span>
                    {devLogoUrl && (
                        <img src={devLogoUrl} alt="Kaste Tech & Brands Logo" className="h-6 w-auto object-contain"/>
                    )}
                    <span>Kaste Tech & Brands</span>
                </div>
            </footer>
        </div>
    );
};

export default LoginPage;
