import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import TopControlsBar from './components/layout/TopControlsBar';
import Dashboard from './pages/Dashboard';
import Order from './pages/Order';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import PurchaseOrders from './pages/PurchaseOrders';
import Suppliers from './pages/Suppliers';
import AISuggestions from './pages/AISuggestions';
import Users from './pages/Users';
import Settings from './pages/Settings';
import ShiftSummary from './pages/ShiftSummary';
import KegManagement from './pages/KegManagement';
import ActivityLog from './pages/ActivityLog';
import { Theme, Role, User, TimeLog, Sale } from './types';
import { DataProvider, useData } from './context/DataContext';
import { PrinterProvider } from './context/PrinterContext';
import Card from './components/common/Card';
import Button from './components/common/Button';
import { FaPlayCircle, FaExclamationTriangle, FaBackspace, FaLock, FaUserShield, FaWifi } from 'react-icons/fa';
import OnScreenKeyboard from './components/common/OnScreenKeyboard';
import LoginPage from './pages/LoginPage';
import CashUpModal from './components/common/CashUpModal';
import { generateShiftReportPDF } from './utils/generateShiftReportPDF';
import ShareReportModal from './components/common/ShareReportModal';
import UserLockScreen from './components/common/UserLockScreen';
import Toast from './components/common/Toast';

const LockScreen: React.FC<{ 
    onUnlock: (pin: string) => boolean; 
}> = ({ onUnlock }) => {
    const { storeSettings } = useData();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    
    const handlePinInput = (digit: string) => {
        setPin(prevPin => {
            if (prevPin.length < 4) {
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

    const PinKey: React.FC<{ value: string; onClick: (v: string) => void; isSpecial?: boolean }> = ({ value, onClick, isSpecial }) => (
        <button onClick={() => onClick(value)} className={`h-16 w-16 rounded-full text-2xl font-semibold transition-colors duration-150 flex items-center justify-center ${isSpecial ? 'bg-gray-200 dark:bg-dark-mode-blue-800' : 'bg-white/10 hover:bg-white/20'}`}>
            {value === 'backspace' ? <FaBackspace/> : value}
        </button>
    );

    return (
         <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-dark-mode-blue-950">
            <Card className={`text-center p-8 shadow-2xl dark:shadow-primary-orange-900/20 ${isShaking ? 'animate-shake' : ''}`}>
                <img src={storeSettings.logoUrl} alt="Logo" className="h-16 w-auto mx-auto mb-4"/>
                <h2 className="text-3xl font-bold mb-2 text-primary-orange-600 dark:text-primary-orange-400 flex items-center justify-center gap-3">
                    <FaLock />
                    System Locked
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                    Enter Admin PIN to unlock the system.
                </p>
                
                <div className="flex justify-center items-center gap-2 mb-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`h-4 w-4 rounded-full border-2 border-gray-400 ${pin.length > i ? 'bg-primary-orange-500 border-primary-orange-500' : ''}`}></div>
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


const MainAppLayout: React.FC<{ 
    currentUser: User; 
    onClockOut: () => void;
    onSimpleLogout: () => void;
    onSaleLock: () => void;
    isOffline: boolean;
    showInstallButton: boolean;
    onInstallClick: () => void;
}> = ({ currentUser, onClockOut, onSimpleLogout, onSaleLock, isOffline, showInstallButton, onInstallClick }) => {
  const { users, setCurrentUser, storeSettings, toggleTheme, theme, timeLogs } = useData();
  const [isSidebarPinned, setSidebarPinned] = useState(false);
  const [isSidebarHovered, setSidebarHovered] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarPinned(!isSidebarPinned);
  };
  
  const toggleKeyboard = () => {
    setKeyboardVisible(prev => !prev);
  };

  const isSidebarExpanded = isSidebarPinned || isSidebarHovered;

  const getPageTitle = () => {
    const searchParams = new URLSearchParams(location.search);
    const settingsTab = searchParams.get('tab');

    switch (location.pathname) {
      case '/': return 'Dashboard';
      case '/order': return 'Create Order';
      case '/inventory': return 'Inventory Management';
      case '/keg-management': return 'Keg Management';
      case '/reports': return 'Sales Reports';
      case '/shift-summary': return 'Shift Summary';
      case '/activity-log': return 'Activity Log';
      case '/purchase-orders': return 'Purchase Orders';
      case '/suppliers': return 'Suppliers';
      case '/users': return 'User Management';
      case '/ai-suggestions': return 'Business Growth Insights';
      case '/settings': return `Settings${settingsTab ? ` - ${settingsTab.charAt(0).toUpperCase() + settingsTab.slice(1)}` : ''}`;
      default: return 'Jobiflow';
    }
  };

  const roleAccess: Record<Role, string[]> = {
    Admin: ['/', '/order', '/inventory', '/keg-management', '/reports', '/shift-summary', '/purchase-orders', '/suppliers', '/users', '/ai-suggestions', '/settings', '/activity-log'],
    Manager: ['/', '/order', '/inventory', '/keg-management', '/reports', '/shift-summary', '/purchase-orders', '/suppliers', '/users', '/ai-suggestions', '/activity-log'],
    Cashier: ['/order', '/'],
    'Server/bartender': ['/order', '/'],
  };

  const accessibleRoutes = roleAccess[currentUser.role];

  const ProtectedRoute: React.FC<{path: string, children: React.ReactNode}> = ({path, children}) => {
      if(accessibleRoutes.includes(path)) {
          return <>{children}</>;
      }
      const landingPage = currentUser.role === 'Cashier' ? '/order' : '/';
      return <Navigate to={landingPage} replace />;
  }

  if (currentUser.timeClockStatus === 'Awaiting Clearance' && currentUser.role !== 'Admin') {
    const lastRejectedLog = timeLogs.find(l => l.userId === currentUser.id && l.status === 'Rejected');

    return (
        <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-dark-mode-blue-950">
            <Card className="text-center p-8 shadow-2xl dark:shadow-primary-orange-900/20">
                <h2 className="text-3xl font-bold mb-2 text-primary-orange-600 dark:text-primary-orange-400">Welcome, {currentUser.name}!</h2>
                <>
                   <div className="flex items-center justify-center gap-3 text-yellow-600 dark:text-yellow-400 my-4">
                        <FaExclamationTriangle size={24}/>
                        <p className="text-lg font-semibold">Shift Clearance Pending</p>
                   </div>
                   {lastRejectedLog ? (
                     <>
                        <p className="text-gray-600 dark:text-gray-200 mb-2">Your last shift was rejected.</p>
                        <p className="text-gray-600 dark:text-gray-200 mb-1 font-semibold">Reason:</p>
                        <p className="text-gray-600 dark:text-gray-200 mb-4 p-2 bg-red-100 dark:bg-red-900/50 rounded-md">{lastRejectedLog.rejectionReason}</p>
                     </>
                   ) : (
                     <p className="text-gray-600 dark:text-gray-100 mb-6 text-lg">Your previous shift is awaiting manager approval. Please check with your manager to proceed.</p>
                   )}
                </>
                <Button onClick={onSimpleLogout} variant="secondary" className="mt-6 w-full">
                    Log Out
                </Button>
            </Card>
        </div>
    );
  }

  const isOrderPage = location.pathname === '/order';

  return (
    <>
      <div className="flex h-screen text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-dark-mode-blue-950">
        <div
          onMouseEnter={() => !isSidebarPinned && setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
        >
          <Sidebar 
            isExpanded={isSidebarExpanded} 
            currentUser={currentUser}
            accessibleRoutes={accessibleRoutes}
            storeSettings={storeSettings}
          />
        </div>
        <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarExpanded ? 'ml-64' : 'ml-20'}`}>
          {!isOrderPage && (
            <>
              <Header 
                pageTitle={getPageTitle()}
                toggleSidebar={toggleSidebar}
              />
              <TopControlsBar
                  currentUser={currentUser}
                  users={users}
                  setCurrentUser={setCurrentUser}
                  toggleTheme={toggleTheme}
                  currentTheme={theme}
                  toggleKeyboard={toggleKeyboard}
                  onClockOut={onClockOut}
                  onSimpleLogout={onSimpleLogout}
                  showInstallButton={showInstallButton}
                  onInstallClick={onInstallClick}
              />
            </>
          )}
          <main className={`flex-1 overflow-y-auto ${isOrderPage ? 'h-full' : 'p-4 sm:p-6 lg:p-8 bg-gray-200/50 dark:bg-dark-mode-blue-950/50'}`}>
            <Routes>
              <Route path="/" element={<ProtectedRoute path="/"><Dashboard /></ProtectedRoute>} />
              <Route path="/order" element={<ProtectedRoute path="/order"><Order toggleSidebar={toggleSidebar} toggleKeyboard={toggleKeyboard} onLogout={onSimpleLogout} onSaleLock={onSaleLock} /></ProtectedRoute>} />
              
              <Route path="/inventory" element={<ProtectedRoute path="/inventory"><Inventory /></ProtectedRoute>} />
              <Route path="/keg-management" element={<ProtectedRoute path="/keg-management"><KegManagement /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute path="/reports"><Reports currentTheme={theme} /></ProtectedRoute>} />
              <Route path="/shift-summary" element={<ProtectedRoute path="/shift-summary"><ShiftSummary /></ProtectedRoute>} />
              <Route path="/activity-log" element={<ProtectedRoute path="/activity-log"><ActivityLog /></ProtectedRoute>} />
              <Route path="/purchase-orders" element={<ProtectedRoute path="/purchase-orders"><PurchaseOrders /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute path="/suppliers"><Suppliers /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute path="/users"><Users /></ProtectedRoute>} />
              <Route path="/ai-suggestions" element={<ProtectedRoute path="/ai-suggestions"><AISuggestions /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute path="/settings"><Settings /></ProtectedRoute>} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
      {isKeyboardVisible && <OnScreenKeyboard onClose={() => setKeyboardVisible(false)} />}
      {isOffline && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 text-white text-center py-2 z-[200] text-sm flex items-center justify-center gap-2">
            <FaWifi className="text-red-500" />
            You are currently offline. Functionality may be limited.
        </div>
      )}
    </>
  );
};


const AppContent: React.FC = () => {
    const { users, login, currentUser, requestShiftClearance, storeSettings, sales, timeLogs, adminClockOut, isSystemLocked, setSystemLocked, verifyUnlockPin, logout, healStuckUser, verifyUserPin, isStoreSettingsLoading } = useData();
    const navigate = useNavigate();
    
    const [isCashUpOpen, setIsCashUpOpen] = useState(false);
    const [userToClockOut, setUserToClockOut] = useState<User | null>(null);
    const [shiftExpectedSales, setShiftExpectedSales] = useState<{ cash: number, card: number, mpesa: number } | null>(null);
    
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shiftReportFile, setShiftReportFile] = useState<File | null>(null);
    const [shiftReportDate, setShiftReportDate] = useState<Date | null>(null);
    const [userForShare, setUserForShare] = useState<User | null>(null);
    
    const [sessionLockedUser, setSessionLockedUser] = useState<User | null>(null);

    // PWA State
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // PWA Install Prompt Handler
    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    // PWA Update Handler & Service Worker Registration
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(reg => {
                reg.addEventListener('updatefound', () => {
                    const newWorker = reg.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setWaitingWorker(newWorker);
                                setUpdateAvailable(true);
                            }
                        });
                    }
                });
            }).catch(error => {
                console.log('Service Worker registration failed:', error);
            });
        }
    }, []);

    // Offline/Online Status Handler
    useEffect(() => {
        const goOnline = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    const handleInstallClick = () => {
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult: { outcome: string }) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                setInstallPrompt(null);
            });
        }
    };

    const handleUpdateClick = () => {
        if (waitingWorker) {
            waitingWorker.postMessage({ type: 'SKIP_WAITING' });
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    window.location.reload();
                    refreshing = true;
                }
            });
            setUpdateAvailable(false);
        }
    };

    const isAuthenticated = !!currentUser;

    const handleLogin = async (email: string, password?: string): Promise<boolean> => {
        const success = await login(email, password);
        if (success) {
            localStorage.setItem('lastLoggedInEmail', email);
            return true;
        }
        return false;
    };

    const triggerCashUpFlow = async (user: User) => {
        if (user.timeClockStatus !== 'Clocked In') {
            await handleSimpleLogout();
            return;
        }

        const ongoingLog = timeLogs.find(l => l.userId === user.id && l.status === 'Ongoing');
        if (!ongoingLog) {
            console.warn(`Could not find ongoing time log for ${user.name} in local state. Attempting to heal.`);
            const wasHealed = await healStuckUser(user.id);
            if (wasHealed) {
                alert("An issue with your clock-in status was detected and has been fixed. You have been logged out. You can now log in again.");
            } else {
                alert("Your session seems out of sync. Logging you out to refresh your status.");
            }
            handleSimpleLogout();
            return;
        }

        const clockInTime = new Date(ongoingLog.clockInTime);
        const shiftSales = sales.filter(s => s.servedById === user.id && new Date(s.date) >= clockInTime);
        
        const expectedSales = shiftSales.reduce((acc, sale) => {
            acc[sale.paymentMethod] += sale.total;
            return acc;
        }, { cash: 0, card: 0, mpesa: 0 });


        setUserToClockOut(user);
        setShiftExpectedSales(expectedSales);
        setIsCashUpOpen(true);
    };

    const handleRequestClearance = async (declaredAmount: number) => {
        if (userToClockOut && shiftExpectedSales) {
            const ongoingLog = timeLogs.find(l => l.userId === userToClockOut.id && l.status === 'Ongoing');
            if (!ongoingLog) {
                console.error("Could not find ongoing log to generate report.");
                alert("An error occurred. Could not generate shift report.");
            } else {
                const clockOutTime = new Date();
                const durationMs = clockOutTime.getTime() - new Date(ongoingLog.clockInTime).getTime();
                const tempLogForPDF: TimeLog = {
                    ...ongoingLog,
                    clockOutTime,
                    durationHours: durationMs / (1000 * 60 * 60),
                    status: 'Pending Approval',
                    declaredAmount,
                    expectedSales: shiftExpectedSales,
                    difference: declaredAmount - shiftExpectedSales.cash
                };
                const shiftSalesData = sales.filter(s => s.servedById === userToClockOut.id && new Date(s.date) >= new Date(ongoingLog.clockInTime));

                try {
                    const pdfFile = await generateShiftReportPDF(userToClockOut, tempLogForPDF, shiftSalesData, storeSettings);
                    setShiftReportFile(pdfFile);
                    setShiftReportDate(clockOutTime);
                    setUserForShare(userToClockOut);
                } catch (error) {
                    console.error("Failed to generate PDF:", error);
                    alert("Could not generate the shift report PDF. Please proceed with logging out.");
                }
            }
            
            await requestShiftClearance(userToClockOut.id, {
                declaredAmount,
                expectedSales: shiftExpectedSales,
            });

            setIsCashUpOpen(false);
            setIsShareModalOpen(true);
        }
    };
    
    const handleCloseCashUp = () => {
        setIsCashUpOpen(false);
        setUserToClockOut(null);
        setShiftExpectedSales(null);
    };

    const handleCloseShareModalAndLogout = () => {
        setIsShareModalOpen(false);
        setUserToClockOut(null);
        setShiftExpectedSales(null);
        setShiftReportFile(null);
        setShiftReportDate(null);
        setUserForShare(null);
    
        handleSimpleLogout();
    };
    
    const handleSimpleLogout = () => {
        logout();
        setSessionLockedUser(null);
    };

    const handleSaleLock = () => {
        if (currentUser) {
            setSessionLockedUser(currentUser);
        }
    }

    const handleSessionUnlock = (pin: string): boolean => {
        if (!sessionLockedUser) return false;
        const unlocked = verifyUserPin(sessionLockedUser.id, pin);
        if (unlocked) {
            setSessionLockedUser(null);
        }
        return unlocked;
    };

    const handleAdminClockOut = async (user: User) => {
        try {
            const justCompletedLog = await adminClockOut(user.id);
    
            if (!justCompletedLog) {
                alert("An error occurred during admin clock out. It's possible your session was out of sync and has been corrected. You are being logged out.");
                handleSimpleLogout();
                return;
            }
        
            const shiftSalesData = sales.filter(s => s.servedById === user.id && new Date(s.date) >= new Date(justCompletedLog.clockInTime));
        
            try {
                const pdfFile = await generateShiftReportPDF(user, justCompletedLog, shiftSalesData, storeSettings);
                setShiftReportFile(pdfFile);
                setShiftReportDate(justCompletedLog.clockOutTime ? new Date(justCompletedLog.clockOutTime) : new Date());
                setUserForShare(user);
                setIsShareModalOpen(true);
            } catch (error) {
                console.error("Failed to generate PDF for admin:", error);
                alert("Could not generate the shift report PDF. Logging out.");
                handleSimpleLogout();
            }
        } catch (error) {
            console.error("Failed to perform admin clock out:", error);
            alert("A critical error occurred during the clock-out process. You will be logged out to prevent data inconsistency.");
            handleSimpleLogout();
        }
    };

    const handleClockOut = async () => {
        if (currentUser) {
            if(currentUser.timeClockStatus === 'Clocked In') {
                if (currentUser.role === 'Admin') {
                    await handleAdminClockOut(currentUser);
                } else {
                    await triggerCashUpFlow(currentUser);
                }
            } else {
                handleSimpleLogout();
            }
        }
    };

    if (isStoreSettingsLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-dark-mode-blue-950">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-orange-500"></div>
            </div>
        );
    }

    if (sessionLockedUser) {
        return (
            <UserLockScreen
                user={sessionLockedUser}
                onUnlock={handleSessionUnlock}
                onLogout={handleSimpleLogout}
            />
        );
    }
    
    if (isSystemLocked && isAuthenticated) {
        return <LockScreen onUnlock={(pin) => {
            const unlocked = verifyUnlockPin(pin);
            if (unlocked) setSystemLocked(false);
            return unlocked;
        }} />;
    }
    
    return (
        <PrinterProvider>
            <Routes>
                <Route path="/login" element={
                    !isAuthenticated ? (
                        <LoginPage 
                            onLogin={handleLogin} 
                            users={users}
                            logoUrl={storeSettings.logoUrl} 
                            devLogoUrl={storeSettings.pdfFooterLogoUrl} 
                            storeName={storeSettings.storeName} 
                        />
                    ) : (
                        <Navigate to="/" replace />
                    )
                } />
                
                <Route path="/*" element={
                    isAuthenticated && currentUser ? (
                        <MainAppLayout 
                          currentUser={currentUser} 
                          onClockOut={handleClockOut}
                          onSimpleLogout={handleSimpleLogout}
                          onSaleLock={handleSaleLock}
                          isOffline={isOffline}
                          showInstallButton={!!installPrompt}
                          onInstallClick={handleInstallClick}
                        />
                    ) : (
                        <Navigate to="/login" replace />
                    )
                }/>
            </Routes>
            {userToClockOut && shiftExpectedSales && (
                <CashUpModal
                    isOpen={isCashUpOpen}
                    onClose={handleCloseCashUp}
                    onConfirm={handleRequestClearance}
                    user={userToClockOut}
                    expectedSales={shiftExpectedSales}
                />
            )}
            {userForShare && (
                <ShareReportModal
                    isOpen={isShareModalOpen}
                    onClose={handleCloseShareModalAndLogout}
                    reportFile={shiftReportFile}
                    reportDate={shiftReportDate}
                    userName={userForShare.name}
                />
            )}
            {updateAvailable && (
                <Toast
                    show={true}
                    message="A new version of the app is available."
                    type="info"
                    onClose={() => setUpdateAvailable(false)}
                    action={{
                        label: "Reload & Update",
                        onClick: handleUpdateClick
                    }}
                />
            )}
        </PrinterProvider>
    );
};


const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;